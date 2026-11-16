export interface PropertyCostInput {
  monthly_rent: number;
  service_charge?: number;
  estimated_electricity?: number;
  estimated_water?: number;
  estimated_gas?: number;
  estimated_internet?: number;
  other_recurring_charges?: number;
}

export interface TotalMonthlyCostBreakdown {
  rent: number;
  serviceCharge: number;
  electricity: number;
  water: number;
  gas: number;
  internet: number;
  otherCharges: number;
  totalMonthlyCost: number;
}

export function calculateTotalMonthlyCost(prop: PropertyCostInput): TotalMonthlyCostBreakdown {
  const rent = Math.max(0, Number(prop.monthly_rent) || 0);
  const serviceCharge = Math.max(0, Number(prop.service_charge) || 0);
  const electricity = Math.max(0, Number(prop.estimated_electricity) || 0);
  const water = Math.max(0, Number(prop.estimated_water) || 0);
  const gas = Math.max(0, Number(prop.estimated_gas) || 0);
  const internet = Math.max(0, Number(prop.estimated_internet) || 0);
  const otherCharges = Math.max(0, Number(prop.other_recurring_charges) || 0);

  const totalMonthlyCost =
    rent + serviceCharge + electricity + water + gas + internet + otherCharges;

  return {
    rent,
    serviceCharge,
    electricity,
    water,
    gas,
    internet,
    otherCharges,
    totalMonthlyCost,
  };
}

export interface RoommatePreferenceProfile {
  monthly_budget: number;
  preferred_location: string;
  smoking_preference: 'non_smoker' | 'outside_only' | 'smoker';
  cleanliness_level: number; // 1 to 5
  sleep_schedule: 'early_bird' | 'moderate' | 'night_owl';
  noise_preference: 'quiet' | 'moderate' | 'lively';
  cooking_habits: 'daily_cook' | 'occasional' | 'rarely_order_out';
  guest_preference: 'no_guests' | 'occasional_daytime' | 'flexible';
}

export interface CompatibilityResult {
  score: number;
  matches: string[];
  differences: string[];
  breakdown: {
    budget: number;
    location: number;
    smoking: number;
    cleanliness: number;
    sleepSchedule: number;
    noise: number;
    cooking: number;
    guest: number;
  };
}

const SLEEP_INDEX: Record<RoommatePreferenceProfile['sleep_schedule'], number> = {
  early_bird: 0,
  moderate: 1,
  night_owl: 2,
};

const NOISE_INDEX: Record<RoommatePreferenceProfile['noise_preference'], number> = {
  quiet: 0,
  moderate: 1,
  lively: 2,
};

const COOK_INDEX: Record<RoommatePreferenceProfile['cooking_habits'], number> = {
  daily_cook: 0,
  occasional: 1,
  rarely_order_out: 2,
};

const GUEST_INDEX: Record<RoommatePreferenceProfile['guest_preference'], number> = {
  no_guests: 0,
  occasional_daytime: 1,
  flexible: 2,
};

export function calculateRoommateCompatibility(
  a: RoommatePreferenceProfile,
  b: RoommatePreferenceProfile
): CompatibilityResult {
  const matches: string[] = [];
  const differences: string[] = [];

  // 1. Budget (20%)
  const maxBudget = Math.max(a.monthly_budget || 1, b.monthly_budget || 1, 1);
  const budgetDiffRatio = Math.abs((a.monthly_budget || 0) - (b.monthly_budget || 0)) / maxBudget;
  const budgetScore = Math.max(0, Math.round((1 - Math.min(budgetDiffRatio * 1.5, 1)) * 20));
  if (budgetScore >= 16) {
    matches.push('Compatible monthly budgets');
  } else {
    differences.push('Different monthly budget ranges');
  }

  // 2. Location (20%)
  const locA = (a.preferred_location || '').trim().toLowerCase();
  const locB = (b.preferred_location || '').trim().toLowerCase();
  let locationScore = 6;
  if (locA && locB && locA === locB) {
    locationScore = 20;
    matches.push(`Both prefer ${a.preferred_location}`);
  } else if (locA && locB && (locA.includes(locB) || locB.includes(locA))) {
    locationScore = 15;
    matches.push('Overlapping preferred neighborhoods');
  } else {
    differences.push(`Different target areas (${a.preferred_location || 'Any'} vs ${b.preferred_location || 'Any'})`);
  }

  // 3. Smoking Preference (15%)
  let smokingScore = 0;
  if (a.smoking_preference === b.smoking_preference) {
    smokingScore = 15;
    matches.push(
      a.smoking_preference === 'non_smoker'
        ? 'Both are non-smokers'
        : 'Matching smoking preferences'
    );
  } else if (
    (a.smoking_preference === 'non_smoker' && b.smoking_preference === 'outside_only') ||
    (b.smoking_preference === 'non_smoker' && a.smoking_preference === 'outside_only')
  ) {
    smokingScore = 7;
    differences.push('Different smoking boundaries (non-smoker vs outside only)');
  } else {
    smokingScore = 0;
    differences.push('Incompatible smoking preferences');
  }

  // 4. Cleanliness (15%)
  const cleanDiff = Math.abs((a.cleanliness_level || 3) - (b.cleanliness_level || 3));
  const cleanlinessScore = Math.max(0, Math.round(((4 - cleanDiff) / 4) * 15));
  if (cleanDiff <= 1) {
    matches.push('Aligned cleanliness standards');
  } else {
    differences.push('Different cleanliness expectations');
  }

  // 5. Sleep Schedule (10%)
  const sleepDiff = Math.abs(SLEEP_INDEX[a.sleep_schedule] - SLEEP_INDEX[b.sleep_schedule]);
  const sleepScore = sleepDiff === 0 ? 10 : sleepDiff === 1 ? 6 : 2;
  if (sleepDiff === 0) {
    matches.push('Similar sleeping schedules');
  } else {
    differences.push('Different sleeping schedules');
  }

  // 6. Noise Preference (10%)
  const noiseDiff = Math.abs(NOISE_INDEX[a.noise_preference] - NOISE_INDEX[b.noise_preference]);
  const noiseScore = noiseDiff === 0 ? 10 : noiseDiff === 1 ? 5 : 1;
  if (noiseDiff === 0) {
    matches.push(
      a.noise_preference === 'quiet' ? 'Both prefer a quiet environment' : 'Matching noise comfort level'
    );
  } else {
    differences.push('Different noise preferences');
  }

  // 7. Cooking Habits (5%)
  const cookDiff = Math.abs(COOK_INDEX[a.cooking_habits] - COOK_INDEX[b.cooking_habits]);
  const cookingScore = cookDiff === 0 ? 5 : cookDiff === 1 ? 3 : 1;
  if (cookDiff === 0) {
    matches.push('Similar cooking routines');
  } else {
    differences.push('Different cooking habits');
  }

  // 8. Guest Preference (5%)
  const guestDiff = Math.abs(GUEST_INDEX[a.guest_preference] - GUEST_INDEX[b.guest_preference]);
  const guestScore = guestDiff === 0 ? 5 : guestDiff === 1 ? 3 : 1;
  if (guestDiff === 0) {
    matches.push('Compatible visitor & guest expectations');
  } else {
    differences.push('Different guest preferences');
  }

  const total = Math.min(
    100,
    Math.max(
      0,
      budgetScore +
        locationScore +
        smokingScore +
        cleanlinessScore +
        sleepScore +
        noiseScore +
        cookingScore +
        guestScore
    )
  );

  return {
    score: total,
    matches,
    differences,
    breakdown: {
      budget: budgetScore,
      location: locationScore,
      smoking: smokingScore,
      cleanliness: cleanlinessScore,
      sleepSchedule: sleepScore,
      noise: noiseScore,
      cooking: cookingScore,
      guest: guestScore,
    },
  };
}

export interface TrustScoreInput {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean; // Student ID, NID, or Landlord Doc approved
  completedRentals: number;
  averageRating: number; // 0 to 5
  reviewCount: number;
  confirmedComplaints: number;
  cancellations: number;
}

export function calculateTrustScore(input: TrustScoreInput): {
  score: number;
  tier: 'High Trust' | 'Standard' | 'Needs Verification';
  isVerified: boolean;
} {
  let score = 20; // Base score for registered account
  if (input.emailVerified) score += 15;
  if (input.phoneVerified) score += 15;
  if (input.identityVerified) score += 20;

  score += Math.min(15, Math.max(0, input.completedRentals) * 5);

  if (input.reviewCount > 0) {
    score += Math.round((Math.min(5, Math.max(0, input.averageRating)) / 5) * 15);
  } else {
    score += 5; // Neutral baseline before reviews exist
  }

  score -= Math.max(0, input.confirmedComplaints) * 15;
  score -= Math.max(0, input.cancellations) * 5;

  const clamped = Math.min(100, Math.max(0, score));
  const isVerified = input.emailVerified && input.identityVerified;
  const tier =
    clamped >= 75 ? 'High Trust' : clamped >= 45 ? 'Standard' : 'Needs Verification';

  return { score: clamped, tier, isVerified };
}

export interface ScamDetectionInput {
  monthlyRent: number;
  advanceAmount: number;
  areaMedianRent: number;
  landlordVerified: boolean;
  duplicateListingCount: number;
  complaintCount: number;
  accountAgeDays: number;
}

export interface ScamDetectionResult {
  suspicious: boolean;
  riskScore: number; // 0 to 100
  reasons: string[];
  label: 'Normal' | 'Potentially Suspicious Listing';
}

export function detectSuspiciousListing(input: ScamDetectionInput): ScamDetectionResult {
  const reasons: string[] = [];
  let riskScore = 0;

  const hasMedian = input.areaMedianRent > 0;
  const significantlyBelowMedian = hasMedian && input.monthlyRent < input.areaMedianRent * 0.55;
  const excessiveAdvance = input.monthlyRent > 0 && input.advanceAmount > input.monthlyRent * 4;

  if (significantlyBelowMedian) {
    riskScore += 30;
    reasons.push(
      `Listed rent (৳${input.monthlyRent.toLocaleString()}) is over 45% below area median (৳${Math.round(
        input.areaMedianRent
      ).toLocaleString()})`
    );
  }

  if (excessiveAdvance) {
    riskScore += 30;
    reasons.push(
      `High advance deposit requested (৳${input.advanceAmount.toLocaleString()}, >4x monthly rent)`
    );
  }

  if (!input.landlordVerified) {
    riskScore += 20;
    reasons.push('Landlord identity or property documents are not yet verified');
  }

  if (input.duplicateListingCount > 0) {
    riskScore += 25;
    reasons.push('Duplicate or repeated listing details detected across multiple postings');
  }

  if (input.complaintCount > 0) {
    riskScore += Math.min(35, input.complaintCount * 15);
    reasons.push(`${input.complaintCount} user report(s) filed against this listing or landlord`);
  }

  if (input.accountAgeDays < 3 && !input.landlordVerified) {
    riskScore += 10;
    reasons.push('Newly created unverified landlord account');
  }

  // Requirement: Do not automatically label a listing/user suspicious based on low price alone.
  const onlyLowPrice =
    significantlyBelowMedian &&
    !excessiveAdvance &&
    input.landlordVerified &&
    input.duplicateListingCount === 0 &&
    input.complaintCount === 0;

  const cappedRisk = Math.min(100, riskScore);
  const suspicious = !onlyLowPrice && cappedRisk >= 45;

  return {
    suspicious,
    riskScore: cappedRisk,
    reasons,
    label: suspicious ? 'Potentially Suspicious Listing' : 'Normal',
  };
}

export type SplitType = 'equal' | 'custom' | 'percentage';

export interface SplitParticipantInput {
  userId: number;
  value?: number; // exact amount for custom, or percentage (0-100) for percentage
}

export interface ComputedSplit {
  userId: number;
  shareAmount: number;
}

export function calculateExpenseSplits(
  totalAmount: number,
  splitType: SplitType,
  participants: SplitParticipantInput[]
): ComputedSplit[] {
  if (participants.length === 0) {
    throw new Error('At least one participant is required to split an expense');
  }
  const cleanTotal = Math.round(Number(totalAmount) * 100) / 100;
  if (cleanTotal <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  if (splitType === 'equal') {
    const count = participants.length;
    const base = Math.floor((cleanTotal * 100) / count) / 100;
    let remainderCents = Math.round(cleanTotal * 100) - Math.round(base * 100) * count;

    return participants.map((p) => {
      const extra = remainderCents > 0 ? 0.01 : 0;
      if (remainderCents > 0) remainderCents -= 1;
      return {
        userId: p.userId,
        shareAmount: Math.round((base + extra) * 100) / 100,
      };
    });
  }

  if (splitType === 'percentage') {
    const sumPct = participants.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
    if (Math.abs(sumPct - 100) > 0.5) {
      throw new Error(`Percentages must sum to 100% (got ${sumPct}%)`);
    }
    const raw = participants.map((p) => ({
      userId: p.userId,
      shareAmount: Math.floor(((cleanTotal * (Number(p.value) || 0)) / 100) * 100) / 100,
    }));
    const allocated = raw.reduce((acc, r) => acc + r.shareAmount, 0);
    const diff = Math.round((cleanTotal - allocated) * 100) / 100;
    if (raw.length > 0 && Math.abs(diff) > 0) {
      raw[0].shareAmount = Math.round((raw[0].shareAmount + diff) * 100) / 100;
    }
    return raw;
  }

  // custom
  const customSum = participants.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  if (Math.abs(customSum - cleanTotal) > 1) {
    throw new Error(
      `Custom split amounts (৳${customSum}) must equal total expense (৳${cleanTotal})`
    );
  }
  return participants.map((p) => ({
    userId: p.userId,
    shareAmount: Math.round((Number(p.value) || 0) * 100) / 100,
  }));
}

export interface ExpenseLedgerRecord {
  id: number;
  paidByUserId: number;
  amount: number;
}

export interface SplitLedgerRecord {
  expenseId: number;
  userId: number;
  shareAmount: number;
}

export interface SettlementLedgerRecord {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

export interface TransferEdge {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

export function calculateSettlements(
  expenses: ExpenseLedgerRecord[],
  splits: SplitLedgerRecord[],
  recordedSettlements: SettlementLedgerRecord[]
): {
  netBalances: Record<number, number>;
  transfers: TransferEdge[];
} {
  const netBalances: Record<number, number> = {};

  for (const exp of expenses) {
    netBalances[exp.paidByUserId] = (netBalances[exp.paidByUserId] || 0) + exp.amount;
  }

  for (const sp of splits) {
    netBalances[sp.userId] = (netBalances[sp.userId] || 0) - sp.shareAmount;
  }

  for (const st of recordedSettlements) {
    // When fromUserId pays toUserId, fromUserId's debt decreases (balance goes up),
    // and toUserId's receivable decreases (balance goes down).
    netBalances[st.fromUserId] = (netBalances[st.fromUserId] || 0) + st.amount;
    netBalances[st.toUserId] = (netBalances[st.toUserId] || 0) - st.amount;
  }

  const debtors: Array<{ userId: number; amount: number }> = [];
  const creditors: Array<{ userId: number; amount: number }> = [];

  for (const [uidStr, rawBal] of Object.entries(netBalances)) {
    const uid = Number(uidStr);
    const bal = Math.round(rawBal * 100) / 100;
    netBalances[uid] = bal;
    if (bal < -0.5) debtors.push({ userId: uid, amount: Math.abs(bal) });
    else if (bal > 0.5) creditors.push({ userId: uid, amount: bal });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: TransferEdge[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transferAmt = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(transferAmt * 100) / 100;
    if (rounded >= 1) {
      transfers.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount: rounded,
      });
    }
    debtors[i].amount -= transferAmt;
    creditors[j].amount -= transferAmt;
    if (debtors[i].amount < 0.5) i++;
    if (creditors[j].amount < 0.5) j++;
  }

  return { netBalances, transfers };
}

export function getUtilityBillStatus(
  dueDateIso: string,
  paidAt: string | null | undefined,
  referenceDate: Date = new Date()
): {
  status: 'Paid' | 'Overdue' | 'Due soon' | 'Upcoming';
  reminderStage: '3_days' | '1_day' | 'due_today' | 'overdue' | null;
  daysRemaining: number;
} {
  if (paidAt) {
    return { status: 'Paid', reminderStage: null, daysRemaining: 0 };
  }

  const due = new Date(dueDateIso.slice(0, 10) + 'T00:00:00Z');
  const today = new Date(referenceDate.toISOString().slice(0, 10) + 'T00:00:00Z');
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'Overdue', reminderStage: 'overdue', daysRemaining: diffDays };
  }
  if (diffDays === 0) {
    return { status: 'Due soon', reminderStage: 'due_today', daysRemaining: 0 };
  }
  if (diffDays === 1) {
    return { status: 'Due soon', reminderStage: '1_day', daysRemaining: 1 };
  }
  if (diffDays <= 3) {
    return { status: 'Due soon', reminderStage: '3_days', daysRemaining: diffDays };
  }
  return { status: 'Upcoming', reminderStage: null, daysRemaining: diffDays };
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function estimateDhakaTransitCost(distanceKm: number): {
  busFareBdt: number;
  rickshawFareBdt: number;
  cngFareBdt: number;
  estimatedMinutes: number;
} {
  const d = Math.max(0.2, distanceKm);
  const busFareBdt = d <= 2 ? 10 : Math.min(60, Math.round(10 + (d - 2) * 3));
  const rickshawFareBdt = d <= 3 ? Math.max(20, Math.round(d * 25)) : Math.round(d * 22);
  const cngFareBdt = Math.max(50, Math.round(40 + d * 25));
  const estimatedMinutes = Math.max(5, Math.round(d * 6.5));
  return { busFareBdt, rickshawFareBdt, cngFareBdt, estimatedMinutes };
}
