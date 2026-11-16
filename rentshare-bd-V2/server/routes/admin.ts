import { Router } from 'express';
import { db } from '../db/client';
import { createNotification, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/analytics', async (_req, res) => {
  const usersTotal = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM users');
  const activeTenants = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM users WHERE role = 'tenant' AND is_suspended = 0"
  );
  const totalLandlords = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM users WHERE role = 'landlord'"
  );
  const verifiedUsers = await db.queryOne<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM users WHERE identity_verified = 1'
  );

  const propsTotal = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM properties');
  const propsAvail = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM properties WHERE availability_status = 'available'"
  );
  const propsOccupied = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM properties WHERE availability_status = 'occupied'"
  );
  const propsPending = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM properties WHERE verification_status = 'pending'"
  );

  const reqTotal = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM rental_requests');
  const reqAccepted = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM rental_requests WHERE status = 'accepted'"
  );
  const reqPending = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM rental_requests WHERE status = 'pending'"
  );

  const suspiciousCount = await db.queryOne<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM properties WHERE is_suspicious = 1'
  );
  const openComplaints = await db.queryOne<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM complaints WHERE status IN ('open', 'investigating')"
  );

  const rentVolume = await db.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE category = 'House rent'"
  );
  const sharedExpensesTotal = await db.queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses'
  );
  const unpaidBillsTotal = await db.queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM utility_bills WHERE paid_at IS NULL'
  );

  const areaDistribution = await db.query<{ area: string; count: number; avg_rent: number }>(
    `SELECT area, COUNT(*) AS count, ROUND(AVG(monthly_rent)) AS avg_rent FROM properties GROUP BY area`
  );

  const expenseCategories = await db.query<{ category: string; total: number }>(
    `SELECT category, ROUND(SUM(amount)) AS total FROM expenses GROUP BY category`
  );

  res.json({
    users: {
      total: Number(usersTotal?.cnt || 0),
      activeTenants: Number(activeTenants?.cnt || 0),
      totalLandlords: Number(totalLandlords?.cnt || 0),
      verifiedUsers: Number(verifiedUsers?.cnt || 0),
    },
    properties: {
      total: Number(propsTotal?.cnt || 0),
      available: Number(propsAvail?.cnt || 0),
      occupied: Number(propsOccupied?.cnt || 0),
      pending: Number(propsPending?.cnt || 0),
    },
    rentals: {
      totalRequests: Number(reqTotal?.cnt || 0),
      successfulRentals: Number(reqAccepted?.cnt || 0),
      pendingApplications: Number(reqPending?.cnt || 0),
    },
    safety: {
      suspiciousListings: Number(suspiciousCount?.cnt || 0),
      openComplaints: Number(openComplaints?.cnt || 0),
    },
    financial: {
      recordedRentPayments: Number(rentVolume?.total || 0),
      totalSharedExpenses: Number(sharedExpensesTotal?.total || 0),
      outstandingUtilityBills: Number(unpaidBillsTotal?.total || 0),
    },
    charts: {
      areaDistribution,
      expenseCategories,
    },
  });
});

router.get('/users', async (_req, res) => {
  const users = await db.query<any>(
    `SELECT id, email, role, full_name, phone, email_verified, phone_verified, identity_verified, is_suspended, created_at
     FROM users ORDER BY created_at DESC`
  );
  const verifications = await db.query<any>(
    `SELECT vr.*, u.full_name, u.email, u.role
     FROM verification_records vr
     JOIN users u ON u.id = vr.user_id
     ORDER BY vr.created_at DESC`
  );
  res.json({ users, verifications });
});

router.patch('/users/:id/suspend', async (req, res) => {
  const id = Number(req.params.id);
  const suspend = Boolean(req.body?.is_suspended);
  await db.execute('UPDATE users SET is_suspended = ? WHERE id = ?', [suspend ? 1 : 0, id]);
  res.json({ id, is_suspended: suspend });
});

router.patch('/verifications/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const vr = await db.queryOne<any>('SELECT * FROM verification_records WHERE id = ?', [id]);
  if (!vr) {
    res.status(404).json({ error: 'Verification record not found' });
    return;
  }

  await db.execute(
    'UPDATE verification_records SET status = ?, reviewed_by = ?, notes = ? WHERE id = ?',
    [status, req.user!.userId, String(req.body?.notes || ''), id]
  );

  if (status === 'approved') {
    if (vr.verification_type === 'phone') {
      await db.execute('UPDATE users SET phone_verified = 1 WHERE id = ?', [vr.user_id]);
    } else if (vr.verification_type === 'email') {
      await db.execute('UPDATE users SET email_verified = 1 WHERE id = ?', [vr.user_id]);
    } else {
      await db.execute('UPDATE users SET identity_verified = 1 WHERE id = ?', [vr.user_id]);
      await db.execute(
        "UPDATE landlord_profiles SET verification_status = 'verified' WHERE user_id = ?",
        [vr.user_id]
      );
    }
    await createNotification(
      vr.user_id,
      'verification',
      'Verification approved',
      `Your ${vr.verification_type.replace('_', ' ')} verification was approved.`,
      '/tenant/profile'
    );
  }

  res.json({ id, status });
});

router.get('/properties', async (_req, res) => {
  const properties = await db.query<any>(
    `SELECT p.*, u.full_name AS landlord_name, u.email AS landlord_email, u.identity_verified AS landlord_verified
     FROM properties p
     JOIN users u ON u.id = p.landlord_id
     ORDER BY p.is_suspicious DESC, p.created_at DESC`
  );
  res.json({ properties });
});

router.patch('/properties/:id/verify', async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.verification_status || '');
  const clearSuspicious = Boolean(req.body?.clear_suspicious);

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Invalid verification status' });
    return;
  }

  const prop = await db.queryOne<any>('SELECT landlord_id, title FROM properties WHERE id = ?', [id]);
  if (!prop) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  await db.execute(
    `UPDATE properties SET verification_status = ?, availability_status = ?, is_suspicious = ? WHERE id = ?`,
    [
      status,
      status === 'approved' ? 'available' : 'suspended',
      clearSuspicious ? 0 : status === 'rejected' ? 1 : 0,
      id,
    ]
  );

  await createNotification(
    prop.landlord_id,
    'rental',
    `Property ${status}`,
    `Your listing "${prop.title}" was ${status} by platform verification.`,
    '/landlord/properties'
  );

  res.json({ id, verification_status: status });
});

router.get('/complaints', async (_req, res) => {
  const complaints = await db.query<any>(
    `SELECT c.*, r.full_name AS reporter_name, t.full_name AS target_name, p.title AS property_title
     FROM complaints c
     JOIN users r ON r.id = c.reporter_id
     LEFT JOIN users t ON t.id = c.target_user_id
     LEFT JOIN properties p ON p.id = c.property_id
     ORDER BY c.created_at DESC`
  );
  res.json({ complaints });
});

router.patch('/complaints/:id', async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || 'investigating');
  const adminNotes = String(req.body?.admin_notes || '');
  await db.execute('UPDATE complaints SET status = ?, admin_notes = ? WHERE id = ?', [
    status,
    adminNotes,
    id,
  ]);
  res.json({ id, status });
});

export default router;
