import { Router } from 'express';
import { db } from '../db/client';
import { createNotification, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/requests', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  if (req.user!.role === 'landlord') {
    const rows = await db.query<any>(
      `SELECT rr.*, p.title AS property_title, p.area, p.monthly_rent,
        u.full_name AS tenant_name, u.email AS tenant_email, u.phone AS tenant_phone,
        u.identity_verified AS tenant_verified
       FROM rental_requests rr
       JOIN properties p ON p.id = rr.property_id
       JOIN users u ON u.id = rr.tenant_id
       WHERE p.landlord_id = ?
       ORDER BY rr.created_at DESC`,
      [uid]
    );
    res.json({ requests: rows });
    return;
  }

  const rows = await db.query<any>(
    `SELECT rr.*, p.title AS property_title, p.area, p.monthly_rent, p.address,
      u.full_name AS landlord_name
     FROM rental_requests rr
     JOIN properties p ON p.id = rr.property_id
     JOIN users u ON u.id = p.landlord_id
     WHERE rr.tenant_id = ?
     ORDER BY rr.created_at DESC`,
    [uid]
  );
  res.json({ requests: rows });
});

router.post('/requests', requireAuth, requireRole('tenant'), async (req: AuthedRequest, res) => {
  const propertyId = Number(req.body?.propertyId);
  const moveInDate = String(req.body?.move_in_date || '2026-12-01');
  const durationMonths = Number(req.body?.duration_months) || 12;
  const message = String(req.body?.message || '').trim();
  const roomId = req.body?.room_id ? Number(req.body.room_id) : null;

  const prop = await db.queryOne<any>('SELECT id, landlord_id, title FROM properties WHERE id = ?', [
    propertyId,
  ]);
  if (!prop) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const result = await db.execute(
    `INSERT INTO rental_requests (property_id, room_id, tenant_id, move_in_date, duration_months, message, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [propertyId, roomId, req.user!.userId, moveInDate, durationMonths, message]
  );

  await createNotification(
    prop.landlord_id,
    'rental',
    'New rental application',
    `New application received for ${prop.title}.`,
    '/landlord/applications'
  );

  res.status(201).json({ id: result.insertId, status: 'pending' });
});

router.patch('/requests/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  const rr = await db.queryOne<any>(
    `SELECT rr.*, p.landlord_id, p.title, p.monthly_rent, p.advance_amount, p.area
     FROM rental_requests rr
     JOIN properties p ON p.id = rr.property_id
     WHERE rr.id = ?`,
    [id]
  );

  if (!rr) {
    res.status(404).json({ error: 'Rental request not found' });
    return;
  }

  if (status === 'cancelled' && rr.tenant_id === req.user!.userId) {
    await db.execute("UPDATE rental_requests SET status = 'cancelled' WHERE id = ?", [id]);
    res.json({ id, status: 'cancelled' });
    return;
  }

  if ((status === 'accepted' || status === 'rejected') && (rr.landlord_id === req.user!.userId || req.user!.role === 'admin')) {
    await db.execute(
      'UPDATE rental_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    if (status === 'accepted') {
      // Automatically create/join roommate group for this property
      let group = await db.queryOne<{ id: number }>(
        'SELECT id FROM roommate_groups WHERE property_id = ?',
        [rr.property_id]
      );
      if (!group) {
        const gRes = await db.execute(
          `INSERT INTO roommate_groups (name, property_id, created_by) VALUES (?, ?, ?)`,
          [`${rr.area} Shared Flat - ${rr.title.slice(0, 28)}`, rr.property_id, rr.tenant_id]
        );
        group = { id: gRes.insertId };
      }
      const alreadyMember = await db.queryOne(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [group.id, rr.tenant_id]
      );
      if (!alreadyMember) {
        await db.execute(
          `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')`,
          [group.id, rr.tenant_id]
        );
      }

      // Create digital rental agreement record pending tenant consent
      const start = new Date(rr.move_in_date || '2026-12-01');
      const end = new Date(start);
      end.setMonth(end.getMonth() + (Number(rr.duration_months) || 12));
      const endDateStr = end.toISOString().slice(0, 10);

      await db.execute(
        `INSERT INTO rental_agreements (
          property_id, tenant_id, landlord_id, monthly_rent, advance_amount,
          duration_months, notice_period_days, utility_terms, house_rules,
          start_date, end_date, tenant_accepted, landlord_accepted, status
        ) VALUES (?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?, 0, 1, 'pending_tenant')`,
        [
          rr.property_id,
          rr.tenant_id,
          rr.landlord_id,
          rr.monthly_rent,
          rr.advance_amount,
          rr.duration_months || 12,
          'Electricity, gas, water, and internet bills are shared equally among active occupants.',
          'No smoking indoors. Quiet hours after 11 PM. 30-day advance notice before moving out.',
          rr.move_in_date || '2026-12-01',
          endDateStr,
        ]
      );

      await createNotification(
        rr.tenant_id,
        'rental',
        'Rental request accepted',
        `Your request for ${rr.title} was accepted! Review and accept your digital rental agreement.`,
        '/tenant/agreement'
      );
    } else {
      await createNotification(
        rr.tenant_id,
        'rental',
        'Rental request update',
        `Your rental request for ${rr.title} was declined by the landlord.`,
        '/tenant/requests'
      );
    }

    res.json({ id, status });
    return;
  }

  res.status(403).json({ error: 'Not authorized to update this rental request' });
});

router.get('/agreements', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  const rows = await db.query<any>(
    `SELECT ra.*, p.title AS property_title, p.address AS property_address, p.area,
      t.full_name AS tenant_name, t.email AS tenant_email, t.phone AS tenant_phone,
      l.full_name AS landlord_name, l.email AS landlord_email, l.phone AS landlord_phone
     FROM rental_agreements ra
     JOIN properties p ON p.id = ra.property_id
     JOIN users t ON t.id = ra.tenant_id
     JOIN users l ON l.id = ra.landlord_id
     WHERE ra.tenant_id = ? OR ra.landlord_id = ?
     ORDER BY ra.created_at DESC`,
    [uid, uid]
  );
  res.json({ agreements: rows });
});

router.post('/agreements', requireAuth, requireRole('landlord', 'admin'), async (req: AuthedRequest, res) => {
  const b = req.body || {};
  const result = await db.execute(
    `INSERT INTO rental_agreements (
      property_id, tenant_id, landlord_id, monthly_rent, advance_amount,
      duration_months, notice_period_days, utility_terms, house_rules,
      start_date, end_date, tenant_accepted, landlord_accepted, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'pending_tenant')`,
    [
      Number(b.property_id),
      Number(b.tenant_id),
      req.user!.userId,
      Number(b.monthly_rent),
      Number(b.advance_amount),
      Number(b.duration_months) || 12,
      Number(b.notice_period_days) || 30,
      b.utility_terms || 'Shared equally among occupants.',
      b.house_rules || 'Respect quiet hours and shared spaces.',
      b.start_date,
      b.end_date,
    ]
  );
  await createNotification(
    Number(b.tenant_id),
    'agreement',
    'New digital rental agreement',
    'Your landlord created a digital rental agreement for your review.',
    '/tenant/agreement'
  );
  res.status(201).json({ id: result.insertId });
});

router.post('/agreements/:id/accept', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const ag = await db.queryOne<any>('SELECT * FROM rental_agreements WHERE id = ?', [id]);
  if (!ag) {
    res.status(404).json({ error: 'Agreement not found' });
    return;
  }
  if (ag.tenant_id !== req.user!.userId) {
    res.status(403).json({ error: 'Only the named tenant can accept this agreement' });
    return;
  }
  await db.execute(
    `UPDATE rental_agreements SET tenant_accepted = 1, tenant_accepted_at = CURRENT_TIMESTAMP, status = 'active' WHERE id = ?`,
    [id]
  );
  await createNotification(
    ag.landlord_id,
    'agreement',
    'Rental agreement accepted',
    'Your tenant accepted the digital rental agreement.',
    '/landlord/agreements'
  );
  res.json({ message: 'Agreement consent recorded', status: 'active' });
});

router.get('/reviews', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  const rows = await db.query<any>(
    `SELECT r.*, p.title AS property_title, u.full_name AS reviewer_name
     FROM reviews r
     JOIN properties p ON p.id = r.property_id
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.landlord_id = ? OR r.reviewer_id = ?
     ORDER BY r.created_at DESC`,
    [uid, uid]
  );
  res.json({ reviews: rows });
});

router.post('/reviews', requireAuth, requireRole('tenant'), async (req: AuthedRequest, res) => {
  const propertyId = Number(req.body?.property_id);
  const rating = Math.min(5, Math.max(1, Number(req.body?.rating) || 5));
  const comment = String(req.body?.comment || '').trim();
  const prop = await db.queryOne<any>('SELECT landlord_id FROM properties WHERE id = ?', [propertyId]);
  if (!prop || !comment) {
    res.status(400).json({ error: 'Valid property and review comment required' });
    return;
  }
  const result = await db.execute(
    `INSERT INTO reviews (property_id, reviewer_id, landlord_id, rating, comment) VALUES (?, ?, ?, ?, ?)`,
    [propertyId, req.user!.userId, prop.landlord_id, rating, comment]
  );
  res.status(201).json({ id: result.insertId });
});

export default router;
