import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalMonthlyCost,
  calculateRoommateCompatibility,
  calculateTrustScore,
  detectSuspiciousListing,
  calculateExpenseSplits,
  calculateSettlements,
  getUtilityBillStatus,
  calculateHaversineDistanceKm,
  estimateDhakaTransitCost,
} from './domainLogic';

test('calculateTotalMonthlyCost sums rent, utilities, and service charges', () => {
  const result = calculateTotalMonthlyCost({
    monthly_rent: 7000,
    estimated_electricity: 1000,
    estimated_internet: 500,
    service_charge: 500,
  });
  assert.equal(result.totalMonthlyCost, 9000);
});

test('calculateRoommateCompatibility computes high score with clear explanations', () => {
  const a = {
    monthly_budget: 9000,
    preferred_location: 'Mirpur',
    smoking_preference: 'non_smoker' as const,
    cleanliness_level: 4,
    sleep_schedule: 'moderate' as const,
    noise_preference: 'quiet' as const,
    cooking_habits: 'daily_cook' as const,
    guest_preference: 'occasional_daytime' as const,
  };
  const b = {
    monthly_budget: 9500,
    preferred_location: 'Mirpur',
    smoking_preference: 'non_smoker' as const,
    cleanliness_level: 4,
    sleep_schedule: 'moderate' as const,
    noise_preference: 'quiet' as const,
    cooking_habits: 'rarely_order_out' as const,
    guest_preference: 'no_guests' as const,
  };
  const res = calculateRoommateCompatibility(a, b);
  assert.ok(res.score >= 85 && res.score <= 100);
  assert.ok(res.matches.includes('Both are non-smokers'));
  assert.ok(res.matches.includes('Both prefer a quiet environment'));
  assert.ok(res.differences.includes('Different cooking habits'));
  assert.ok(res.differences.includes('Different guest preferences'));
});

test('calculateTrustScore enforces actual verification before marking verified', () => {
  const unverified = calculateTrustScore({
    emailVerified: true,
    phoneVerified: true,
    identityVerified: false,
    completedRentals: 0,
    averageRating: 0,
    reviewCount: 0,
    confirmedComplaints: 0,
    cancellations: 0,
  });
  assert.equal(unverified.isVerified, false);

  const verified = calculateTrustScore({
    emailVerified: true,
    phoneVerified: true,
    identityVerified: true,
    completedRentals: 2,
    averageRating: 4.8,
    reviewCount: 4,
    confirmedComplaints: 0,
    cancellations: 0,
  });
  assert.equal(verified.isVerified, true);
  assert.ok(verified.score >= 85);
});

test('detectSuspiciousListing does not flag low price alone when landlord is verified', () => {
  const lowPriceOnly = detectSuspiciousListing({
    monthlyRent: 5000,
    advanceAmount: 10000,
    areaMedianRent: 15000,
    landlordVerified: true,
    duplicateListingCount: 0,
    complaintCount: 0,
    accountAgeDays: 120,
  });
  assert.equal(lowPriceOnly.suspicious, false);

  const scamSignals = detectSuspiciousListing({
    monthlyRent: 5000,
    advanceAmount: 40000,
    areaMedianRent: 15000,
    landlordVerified: false,
    duplicateListingCount: 1,
    complaintCount: 2,
    accountAgeDays: 1,
  });
  assert.equal(scamSignals.suspicious, true);
  assert.equal(scamSignals.label, 'Potentially Suspicious Listing');
});

test('calculateExpenseSplits and calculateSettlements balance accurately', () => {
  const splits = calculateExpenseSplits(3000, 'equal', [
    { userId: 1 },
    { userId: 2 },
    { userId: 3 },
  ]);
  assert.deepEqual(
    splits.map((s) => s.shareAmount),
    [1000, 1000, 1000]
  );

  const pctSplits = calculateExpenseSplits(1000, 'percentage', [
    { userId: 1, value: 50 },
    { userId: 2, value: 30 },
    { userId: 3, value: 20 },
  ]);
  assert.equal(
    pctSplits.reduce((a, b) => a + b.shareAmount, 0),
    1000
  );

  const settlement = calculateSettlements(
    [{ id: 10, paidByUserId: 1, amount: 3000 }],
    [
      { expenseId: 10, userId: 1, shareAmount: 1000 },
      { expenseId: 10, userId: 2, shareAmount: 1000 },
      { expenseId: 10, userId: 3, shareAmount: 1000 },
    ],
    [{ fromUserId: 2, toUserId: 1, amount: 1000 }]
  );

  assert.equal(settlement.netBalances[1], 1000);
  assert.equal(settlement.netBalances[2], 0);
  assert.equal(settlement.netBalances[3], -1000);
  assert.deepEqual(settlement.transfers, [{ fromUserId: 3, toUserId: 1, amount: 1000 }]);
});

test('getUtilityBillStatus computes reminder stages correctly', () => {
  const ref = new Date('2026-11-15T10:00:00Z');
  assert.equal(getUtilityBillStatus('2026-11-18', null, ref).reminderStage, '3_days');
  assert.equal(getUtilityBillStatus('2026-11-16', null, ref).reminderStage, '1_day');
  assert.equal(getUtilityBillStatus('2026-11-15', null, ref).reminderStage, 'due_today');
  assert.equal(getUtilityBillStatus('2026-11-12', null, ref).status, 'Overdue');
  assert.equal(getUtilityBillStatus('2026-11-12', '2026-11-11T09:00:00Z', ref).status, 'Paid');
});

test('location distance and transit fare estimation work for Dhaka coordinates', () => {
  // Mirpur 10 to Dhanmondi 27
  const dist = calculateHaversineDistanceKm(23.8069, 90.3687, 23.7516, 90.3773);
  assert.ok(dist > 5 && dist < 8);
  const transit = estimateDhakaTransitCost(dist);
  assert.ok(transit.busFareBdt > 0 && transit.rickshawFareBdt > transit.busFareBdt);
});
