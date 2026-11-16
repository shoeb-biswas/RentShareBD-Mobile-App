import { db } from '../db/client';
import { calculateTrustScore, detectSuspiciousListing } from '../../src/utils/domainLogic';

export async function getUserTrustSummary(userId: number) {
  const user = await db.queryOne<{
    id: number;
    role: string;
    email_verified: number;
    phone_verified: number;
    identity_verified: number;
  }>(
    'SELECT id, role, email_verified, phone_verified, identity_verified FROM users WHERE id = ?',
    [userId]
  );

  if (!user) return null;

  let completedRentals = 0;
  let cancellations = 0;
  if (user.role === 'tenant') {
    const tp = await db.queryOne<{ completed_rentals: number; cancellations: number }>(
      'SELECT completed_rentals, cancellations FROM tenant_profiles WHERE user_id = ?',
      [userId]
    );
    completedRentals = Number(tp?.completed_rentals || 0);
    cancellations = Number(tp?.cancellations || 0);
  } else if (user.role === 'landlord') {
    const lp = await db.queryOne<{ completed_rentals: number; cancellations: number }>(
      'SELECT completed_rentals, cancellations FROM landlord_profiles WHERE user_id = ?',
      [userId]
    );
    completedRentals = Number(lp?.completed_rentals || 0);
    cancellations = Number(lp?.cancellations || 0);
  }

  const rev = await db.queryOne<{ avg_rating: number; cnt: number }>(
    'SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM reviews WHERE landlord_id = ?',
    [userId]
  );

  const comp = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM complaints WHERE target_user_id = ? AND status IN ('investigating', 'resolved')",
    [userId]
  );

  const trust = calculateTrustScore({
    emailVerified: Boolean(user.email_verified),
    phoneVerified: Boolean(user.phone_verified),
    identityVerified: Boolean(user.identity_verified),
    completedRentals,
    averageRating: Number(rev?.avg_rating || 0),
    reviewCount: Number(rev?.cnt || 0),
    confirmedComplaints: Number(comp?.cnt || 0),
    cancellations,
  });

  return {
    ...trust,
    completedRentals,
    averageRating: rev?.cnt ? Math.round(Number(rev.avg_rating) * 10) / 10 : 0,
    reviewCount: Number(rev?.cnt || 0),
    complaintCount: Number(comp?.cnt || 0),
    emailVerified: Boolean(user.email_verified),
    phoneVerified: Boolean(user.phone_verified),
    identityVerified: Boolean(user.identity_verified),
  };
}

export async function evaluatePropertyScamRisk(params: {
  propertyId?: number;
  landlordId: number;
  area: string;
  title: string;
  description: string;
  monthlyRent: number;
  advanceAmount: number;
}) {
  const areaRows = await db.query<{ monthly_rent: number }>(
    `SELECT monthly_rent FROM properties WHERE area = ? AND verification_status = 'approved' AND is_suspicious = 0`,
    [params.area]
  );
  const rents = areaRows.map((r) => Number(r.monthly_rent)).sort((a, b) => a - b);
  const areaMedianRent =
    rents.length > 0 ? rents[Math.floor(rents.length / 2)] : 12000;

  const landlord = await db.queryOne<{ identity_verified: number; created_at: string }>(
    'SELECT identity_verified, created_at FROM users WHERE id = ?',
    [params.landlordId]
  );

  const dup = await db.queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM properties WHERE landlord_id = ? AND (title = ? OR description = ?) AND id != ?`,
    [params.landlordId, params.title, params.description, params.propertyId || -1]
  );

  const complaints = await db.queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM complaints WHERE (target_user_id = ? OR property_id = ?) AND status != 'dismissed'`,
    [params.landlordId, params.propertyId || -1]
  );

  const createdMs = landlord?.created_at ? new Date(landlord.created_at).getTime() : Date.now();
  const ageDays = Math.max(0, Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24)));

  return detectSuspiciousListing({
    monthlyRent: params.monthlyRent,
    advanceAmount: params.advanceAmount,
    areaMedianRent,
    landlordVerified: Boolean(landlord?.identity_verified),
    duplicateListingCount: Number(dup?.cnt || 0),
    complaintCount: Number(complaints?.cnt || 0),
    accountAgeDays: ageDays,
  });
}
