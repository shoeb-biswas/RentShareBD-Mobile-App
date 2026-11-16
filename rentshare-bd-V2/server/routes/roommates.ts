import { Router } from 'express';
import { db } from '../db/client';
import { createNotification, optionalAuth, requireAuth, type AuthedRequest } from '../middleware/auth';
import { calculateRoommateCompatibility } from '../../src/utils/domainLogic';
import { getUserTrustSummary } from '../services/trustAndScamService';

const router = Router();

router.get('/preferences', requireAuth, async (req: AuthedRequest, res) => {
  const pref = await db.queryOne('SELECT * FROM roommate_preferences WHERE user_id = ?', [
    req.user!.userId,
  ]);
  res.json({ preferences: pref });
});

router.put('/preferences', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body || {};
  const userId = req.user!.userId;
  const existing = await db.queryOne('SELECT id FROM roommate_preferences WHERE user_id = ?', [userId]);

  if (!existing) {
    await db.execute(
      `INSERT INTO roommate_preferences (
        user_id, monthly_budget, preferred_location, sleep_schedule, wake_schedule,
        smoking_preference, cooking_habits, cleanliness_level, noise_preference,
        study_work_schedule, guest_preference, sharing_preference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        Number(b.monthly_budget) || 9000,
        b.preferred_location || 'Mirpur',
        b.sleep_schedule || 'moderate',
        b.wake_schedule || '07:30 AM',
        b.smoking_preference || 'non_smoker',
        b.cooking_habits || 'occasional',
        Number(b.cleanliness_level) || 4,
        b.noise_preference || 'quiet',
        b.study_work_schedule || '9 AM - 5 PM',
        b.guest_preference || 'occasional_daytime',
        b.sharing_preference || 'Open to sharing utilities & kitchen',
      ]
    );
  } else {
    await db.execute(
      `UPDATE roommate_preferences SET
        monthly_budget = ?, preferred_location = ?, sleep_schedule = ?, wake_schedule = ?,
        smoking_preference = ?, cooking_habits = ?, cleanliness_level = ?, noise_preference = ?,
        study_work_schedule = ?, guest_preference = ?, sharing_preference = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        Number(b.monthly_budget) || 9000,
        b.preferred_location || 'Mirpur',
        b.sleep_schedule || 'moderate',
        b.wake_schedule || '07:30 AM',
        b.smoking_preference || 'non_smoker',
        b.cooking_habits || 'occasional',
        Number(b.cleanliness_level) || 4,
        b.noise_preference || 'quiet',
        b.study_work_schedule || '9 AM - 5 PM',
        b.guest_preference || 'occasional_daytime',
        b.sharing_preference || 'Open to sharing utilities & kitchen',
        userId,
      ]
    );
  }

  res.json({ message: 'Roommate preferences updated' });
});

router.get('/matches', optionalAuth, async (req: AuthedRequest, res) => {
  const currentUserId = req.user?.userId;
  const locationFilter = String(req.query.location || '').trim().toLowerCase();
  const maxBudgetFilter = req.query.maxBudget ? Number(req.query.maxBudget) : null;

  let myPref: any = null;
  if (currentUserId) {
    myPref = await db.queryOne('SELECT * FROM roommate_preferences WHERE user_id = ?', [currentUserId]);
  }
  if (!myPref) {
    myPref = {
      monthly_budget: Number(req.query.budget) || 9500,
      preferred_location: String(req.query.location || 'Mirpur'),
      smoking_preference: 'non_smoker',
      cleanliness_level: 4,
      sleep_schedule: 'moderate',
      noise_preference: 'quiet',
      cooking_habits: 'occasional',
      guest_preference: 'occasional_daytime',
    };
  }

  const candidates = await db.query<any>(
    `SELECT u.id, u.full_name, u.avatar_url, u.email_verified, u.phone_verified, u.identity_verified,
      tp.occupation, tp.institution_or_workplace, tp.bio, tp.preferred_room_type,
      rp.*
     FROM users u
     JOIN roommate_preferences rp ON rp.user_id = u.id
     LEFT JOIN tenant_profiles tp ON tp.user_id = u.id
     WHERE u.role = 'tenant' AND u.is_suspended = 0 AND u.id != ?`,
    [currentUserId || -1]
  );

  let outgoingRequests = new Map<number, any>();
  if (currentUserId) {
    const reqs = await db.query<any>(
      `SELECT * FROM roommate_requests WHERE sender_id = ? OR receiver_id = ?`,
      [currentUserId, currentUserId]
    );
    for (const r of reqs) {
      const otherId = r.sender_id === currentUserId ? r.receiver_id : r.sender_id;
      outgoingRequests.set(otherId, r);
    }
  }

  const results = [];
  for (const c of candidates) {
    if (locationFilter && !String(c.preferred_location).toLowerCase().includes(locationFilter)) {
      continue;
    }
    if (maxBudgetFilter && Number(c.monthly_budget) > maxBudgetFilter) {
      continue;
    }
    const compatibility = calculateRoommateCompatibility(myPref, c);
    const trust = await getUserTrustSummary(c.id);
    const reqInfo = outgoingRequests.get(c.id) || null;

    results.push({
      userId: c.id,
      fullName: c.full_name,
      avatarUrl: c.avatar_url,
      occupation: c.occupation || 'Student',
      institution: c.institution_or_workplace || '',
      bio: c.bio || '',
      preferredLocation: c.preferred_location,
      monthlyBudget: c.monthly_budget,
      preferredRoomType: c.preferred_room_type || 'Single Room',
      preferences: {
        sleep_schedule: c.sleep_schedule,
        smoking_preference: c.smoking_preference,
        cleanliness_level: c.cleanliness_level,
        noise_preference: c.noise_preference,
        cooking_habits: c.cooking_habits,
        guest_preference: c.guest_preference,
      },
      compatibility,
      trust,
      request: reqInfo,
    });
  }

  results.sort((a, b) => b.compatibility.score - a.compatibility.score);
  res.json({ matches: results });
});

router.get('/requests', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  const rows = await db.query<any>(
    `SELECT rr.*,
      s.full_name AS sender_name, s.email AS sender_email,
      r.full_name AS receiver_name, r.email AS receiver_email
     FROM roommate_requests rr
     JOIN users s ON s.id = rr.sender_id
     JOIN users r ON r.id = rr.receiver_id
     WHERE rr.sender_id = ? OR rr.receiver_id = ?
     ORDER BY rr.created_at DESC`,
    [uid, uid]
  );
  res.json({ requests: rows });
});

router.post('/requests', requireAuth, async (req: AuthedRequest, res) => {
  const senderId = req.user!.userId;
  const receiverId = Number(req.body?.receiverId);
  const message = String(req.body?.message || '').trim();

  if (!receiverId || receiverId === senderId) {
    res.status(400).json({ error: 'Valid target user required' });
    return;
  }

  const existing = await db.queryOne(
    `SELECT id FROM roommate_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
    [senderId, receiverId]
  );
  if (existing) {
    res.status(409).json({ error: 'A pending roommate request already exists' });
    return;
  }

  const result = await db.execute(
    `INSERT INTO roommate_requests (sender_id, receiver_id, message, status) VALUES (?, ?, ?, 'pending')`,
    [senderId, receiverId, message]
  );

  const sender = await db.queryOne<{ full_name: string }>('SELECT full_name FROM users WHERE id = ?', [
    senderId,
  ]);
  await createNotification(
    receiverId,
    'roommate',
    'New roommate request',
    `${sender?.full_name || 'A tenant'} sent you a roommate request.`,
    '/tenant/matches'
  );

  res.status(201).json({ id: result.insertId, status: 'pending' });
});

router.patch('/requests/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const action = String(req.body?.status || '');
  const uid = req.user!.userId;

  const row = await db.queryOne<any>('SELECT * FROM roommate_requests WHERE id = ?', [id]);
  if (!row) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (action === 'cancelled' && row.sender_id !== uid) {
    res.status(403).json({ error: 'Only sender can cancel' });
    return;
  }
  if ((action === 'accepted' || action === 'rejected') && row.receiver_id !== uid) {
    res.status(403).json({ error: 'Only receiver can accept or reject' });
    return;
  }
  if (!['accepted', 'rejected', 'cancelled'].includes(action)) {
    res.status(400).json({ error: 'Invalid status update' });
    return;
  }

  await db.execute(
    `UPDATE roommate_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [action, id]
  );

  if (action === 'accepted') {
    const receiver = await db.queryOne<{ full_name: string }>(
      'SELECT full_name FROM users WHERE id = ?',
      [uid]
    );
    await createNotification(
      row.sender_id,
      'roommate',
      'Roommate request accepted',
      `${receiver?.full_name || 'Your match'} accepted your roommate request!`,
      '/tenant/matches'
    );
  }

  res.json({ id, status: action });
});

export default router;
