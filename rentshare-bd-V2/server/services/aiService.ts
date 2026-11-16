import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db/client';
import { getAppConfig } from '../config/env';
import { calculateTotalMonthlyCost, calculateRoommateCompatibility } from '../../src/utils/domainLogic';

function getAiClient(): GoogleGenAI | null {
  const { enabled, apiKey } = getAppConfig().integrations.gemini;
  if (!enabled || !apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function analyzeUserFinances(userId: number, question: string) {
  // Fetch actual user group & expenses
  const memberships = await db.query<{ group_id: number; name: string }>(
    `SELECT gm.group_id, rg.name FROM group_members gm
     JOIN roommate_groups rg ON rg.id = gm.group_id
     WHERE gm.user_id = ?`,
    [userId]
  );

  if (memberships.length === 0) {
    return {
      source: 'database',
      insufficientData: true,
      summary: {
        currentMonthTotal: 0,
        previousMonthTotal: 0,
        predictedNextMonth: null,
        categoryTotals: {},
      },
      reply:
        'You are not part of a roommate group yet, so there is insufficient historical expense data to compute predictions. Join or create a group and log your shared expenses to unlock monthly analysis and predictions.',
    };
  }

  const groupId = memberships[0].group_id;

  const expenses = await db.query<{
    id: number;
    category: string;
    title: string;
    amount: number;
    expense_date: string;
  }>(
    `SELECT e.id, e.category, e.title, COALESCE(es.share_amount, e.amount) AS amount, e.expense_date
     FROM expenses e
     LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.user_id = ?
     WHERE e.group_id = ?
     ORDER BY e.expense_date DESC`,
    [userId, groupId]
  );

  const pendingBills = await db.query<{ bill_name: string; amount: number; due_date: string }>(
    `SELECT bill_name, amount, due_date FROM utility_bills WHERE group_id = ? AND paid_at IS NULL`,
    [groupId]
  );

  if (expenses.length === 0) {
    return {
      source: 'database',
      insufficientData: true,
      summary: {
        currentMonthTotal: 0,
        previousMonthTotal: 0,
        predictedNextMonth: null,
        categoryTotals: {},
      },
      reply:
        'No expense records found yet for your group. Add your first rent, utility, or grocery entries to generate grounded spending insights.',
    };
  }

  // Group expenses by YYYY-MM
  const byMonth: Record<string, number> = {};
  const currentMonthCats: Record<string, number> = {};
  const previousMonthCats: Record<string, number> = {};

  const monthsSorted = Array.from(
    new Set(expenses.map((e) => String(e.expense_date).slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const currentMonthKey = monthsSorted[0];
  const prevMonthKey = monthsSorted[1] || null;

  for (const exp of expenses) {
    const m = String(exp.expense_date).slice(0, 7);
    const amt = Number(exp.amount) || 0;
    byMonth[m] = (byMonth[m] || 0) + amt;
    if (m === currentMonthKey) {
      currentMonthCats[exp.category] = (currentMonthCats[exp.category] || 0) + amt;
    } else if (prevMonthKey && m === prevMonthKey) {
      previousMonthCats[exp.category] = (previousMonthCats[exp.category] || 0) + amt;
    }
  }

  const currentMonthTotal = Math.round(byMonth[currentMonthKey] || 0);
  const previousMonthTotal = prevMonthKey ? Math.round(byMonth[prevMonthKey] || 0) : 0;

  // Estimate next month based on real historical months + pending bills
  const monthValues = Object.values(byMonth);
  const avgMonthly =
    monthValues.reduce((a, b) => a + b, 0) / Math.max(1, monthValues.length);
  const upcomingUnpaidShare = pendingBills.reduce((a, b) => a + Number(b.amount) / 3, 0);
  const predictedNextMonth = Math.round(avgMonthly + upcomingUnpaidShare * 0.15);

  const foodCurr = (currentMonthCats['Food'] || 0) + (currentMonthCats['Grocery'] || 0);
  const foodPrev = (previousMonthCats['Food'] || 0) + (previousMonthCats['Grocery'] || 0);
  const foodDeltaPct =
    foodPrev > 0 ? Math.round(((foodCurr - foodPrev) / foodPrev) * 100) : null;

  const contextPayload = {
    groupName: memberships[0].name,
    currentMonthKey,
    currentMonthTotal,
    previousMonthKey: prevMonthKey,
    previousMonthTotal,
    hasMultipleMonths: Boolean(prevMonthKey),
    predictedNextMonthEstimate: predictedNextMonth,
    currentMonthCategoryBreakdownBdt: currentMonthCats,
    previousMonthCategoryBreakdownBdt: previousMonthCats,
    foodAndGroceryMoMPct: foodDeltaPct,
    upcomingUnpaidBills: pendingBills,
    recentTransactions: expenses.slice(0, 12),
  };

  const ai = getAiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `User question: ${question}\n\nActual Expense Ledger Data (BDT / ৳):\n${JSON.stringify(
          contextPayload,
          null,
          2
        )}`,
        config: {
          systemInstruction:
            'You are RentShare BD Financial Assistant for a student/professional in Bangladesh. ' +
            'Strictly ground every number in the provided JSON ledger data (currency: BDT ৳). ' +
            'Never invent historical expenses. Clearly label next-month predictions as estimates based on historical averages. ' +
            'Highlight month-over-month changes, flag discretionary categories (like takeout/Food vs home Grocery), and suggest practical savings in BDT. Keep responses concise and well-structured.',
        },
      });
      if (response.text) {
        return {
          source: 'gemini',
          insufficientData: !prevMonthKey,
          summary: {
            currentMonthTotal,
            previousMonthTotal,
            predictedNextMonth,
            categoryTotals: currentMonthCats,
          },
          reply: response.text,
        };
      }
    } catch (err) {
      console.warn('[AI Financial Assistant] Gemini fallback triggered:', (err as Error).message);
    }
  }

  // Deterministic grounded fallback when GEMINI_API_KEY is not configured or unavailable
  const lines: string[] = [
    `Based on your actual shared ledger for ${memberships[0].name} (${currentMonthKey}):`,
    `• Current month your share: ৳${currentMonthTotal.toLocaleString()}` +
      (prevMonthKey
        ? ` (vs ৳${previousMonthTotal.toLocaleString()} in ${prevMonthKey}).`
        : ' (only 1 month of history available; comparisons will improve next month).'),
  ];

  if (foodDeltaPct !== null) {
    lines.push(
      `• Food & Grocery spending ${foodDeltaPct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(
        foodDeltaPct
      )}% compared to ${prevMonthKey}.`
    );
  }
  lines.push(
    `• Estimated next-month expense (baseline estimate): ৳${predictedNextMonth.toLocaleString()}.`
  );
  if ((currentMonthCats['Food'] || 0) > 0) {
    const potentialSave = Math.round((currentMonthCats['Food'] || 0) * 0.4);
    lines.push(
      `• Saving opportunity: Shifting 40% of takeout/food orders (৳${(
        currentMonthCats['Food'] || 0
      ).toLocaleString()}) to your group meal plan could save ~৳${potentialSave.toLocaleString()}/month.`
    );
  }

  return {
    source: 'statistical_fallback',
    insufficientData: !prevMonthKey,
    summary: {
      currentMonthTotal,
      previousMonthTotal,
      predictedNextMonth,
      categoryTotals: currentMonthCats,
    },
    reply: lines.join('\n'),
  };
}

interface ParsedRentalIntent {
  area?: string;
  maxBudget?: number;
  roomType?: string;
  nonSmoking?: boolean;
  quietEnvironment?: boolean;
}

function deterministicIntentFallback(query: string): ParsedRentalIntent {
  const q = query.toLowerCase();
  const knownAreas = [
    'mirpur',
    'uttara',
    'dhanmondi',
    'mohammadpur',
    'bashundhara',
    'savar',
    'gazipur',
    'banani',
    'gulshan',
  ];
  const area = knownAreas.find((a) => q.includes(a));
  const budgetMatch = q.match(/(?:under|within|below|budget|tk|bdt|৳)\s*([\d,]{3,6})/i) || q.match(/([\d,]{4,6})/);
  const maxBudget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : undefined;
  return {
    area: area ? area.charAt(0).toUpperCase() + area.slice(1) : undefined,
    maxBudget: maxBudget && !Number.isNaN(maxBudget) ? maxBudget : undefined,
    nonSmoking: q.includes('non-smoking') || q.includes('non smoking') || q.includes('no smoke'),
    quietEnvironment: q.includes('quiet') || q.includes('calm') || q.includes('study'),
  };
}

export async function parseAndMatchRentalQuery(query: string, userId?: number) {
  let intent: ParsedRentalIntent = deterministicIntentFallback(query);
  let usedGemini = false;

  const ai = getAiClient();
  if (ai) {
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extract structured rental and roommate search criteria from this Bangladesh user request: "${query}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              area: { type: Type.STRING, description: 'Dhaka/BD area name if mentioned, e.g. Mirpur, Uttara, Dhanmondi' },
              maxBudget: { type: Type.NUMBER, description: 'Maximum monthly rent/budget in BDT' },
              roomType: { type: Type.STRING, description: 'Single Room, Shared Room, or Master Suite if mentioned' },
              nonSmoking: { type: Type.BOOLEAN },
              quietEnvironment: { type: Type.BOOLEAN },
            },
          },
        },
      });
      if (resp.text) {
        const parsed = JSON.parse(resp.text);
        intent = { ...intent, ...parsed };
        usedGemini = true;
      }
    } catch (err) {
      console.warn('[AI Rental Assistant] Gemini intent parse fallback:', (err as Error).message);
    }
  }

  // Query REAL properties from DB
  const sqlParts: string[] = [
    `SELECT p.*, u.full_name AS landlord_name,
      (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS primary_image
     FROM properties p
     JOIN users u ON u.id = p.landlord_id
     WHERE p.verification_status = 'approved' AND p.availability_status = 'available' AND p.is_suspicious = 0`,
  ];
  const params: any[] = [];

  if (intent.area) {
    sqlParts.push('AND LOWER(p.area) LIKE ?');
    params.push(`%${intent.area.toLowerCase()}%`);
  }
  if (intent.maxBudget && intent.maxBudget > 0) {
    sqlParts.push('AND p.monthly_rent <= ?');
    params.push(intent.maxBudget);
  }
  sqlParts.push('ORDER BY p.monthly_rent ASC LIMIT 6');

  const rawProps = await db.query<any>(sqlParts.join(' '), params);
  const properties = rawProps.map((p) => ({
    ...p,
    costBreakdown: calculateTotalMonthlyCost(p),
  }));

  // Query REAL roommates from DB
  const roomieRows = await db.query<any>(
    `SELECT u.id, u.full_name, u.email_verified, u.identity_verified, tp.occupation, tp.institution_or_workplace, rp.*
     FROM users u
     JOIN roommate_preferences rp ON rp.user_id = u.id
     LEFT JOIN tenant_profiles tp ON tp.user_id = u.id
     WHERE u.role = 'tenant' AND u.is_suspended = 0 AND u.id != ?`,
    [userId || -1]
  );

  const syntheticTarget = {
    monthly_budget: intent.maxBudget || 9000,
    preferred_location: intent.area || 'Mirpur',
    smoking_preference: intent.nonSmoking ? ('non_smoker' as const) : ('non_smoker' as const),
    cleanliness_level: 4,
    sleep_schedule: 'moderate' as const,
    noise_preference: intent.quietEnvironment ? ('quiet' as const) : ('moderate' as const),
    cooking_habits: 'occasional' as const,
    guest_preference: 'occasional_daytime' as const,
  };

  const matchedRoommates = roomieRows
    .filter((r) => {
      if (intent.nonSmoking && r.smoking_preference === 'smoker') return false;
      if (intent.quietEnvironment && r.noise_preference === 'lively') return false;
      return true;
    })
    .map((r) => {
      const comp = calculateRoommateCompatibility(syntheticTarget, r);
      return {
        userId: r.user_id,
        fullName: r.full_name,
        occupation: r.occupation,
        institution: r.institution_or_workplace,
        preferredLocation: r.preferred_location,
        monthlyBudget: r.monthly_budget,
        smokingPreference: r.smoking_preference,
        noisePreference: r.noise_preference,
        compatibilityScore: comp.score,
        matches: comp.matches,
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 4);

  return {
    source: usedGemini ? 'gemini' : 'structured_parser',
    extractedCriteria: intent,
    properties,
    roommates: matchedRoommates,
    summary:
      properties.length > 0 || matchedRoommates.length > 0
        ? `Found ${properties.length} verified propert${properties.length === 1 ? 'y' : 'ies'} and ${matchedRoommates.length} compatible roommate(s) matching your criteria.`
        : 'No verified listings matched that exact filter. Try increasing your budget slightly or widening the area.',
  };
}
