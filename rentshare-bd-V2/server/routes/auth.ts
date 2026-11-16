import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth, signJwt, type AuthedRequest } from '../middleware/auth';
import { getUserTrustSummary } from '../services/trustAndScamService';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional().default(''),
  role: z.enum(['tenant', 'landlord']).default('tenant'),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
    return;
  }

  const { email, password, fullName, phone, role } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  const existing = await db.queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)`,
    [cleanEmail, passwordHash, role, fullName.trim(), phone.trim()]
  );
  const userId = userRes.insertId;

  if (role === 'tenant') {
    await db.execute(`INSERT INTO tenant_profiles (user_id) VALUES (?)`, [userId]);
    await db.execute(`INSERT INTO roommate_preferences (user_id) VALUES (?)`, [userId]);
  } else {
    await db.execute(`INSERT INTO landlord_profiles (user_id) VALUES (?)`, [userId]);
  }

  const verifyToken = crypto.randomBytes(20).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await db.execute(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [userId, verifyToken, expiresAt]
  );

  const token = signJwt({ userId, email: cleanEmail, role });
  res.status(201).json({
    token,
    verificationToken: verifyToken,
    user: {
      id: userId,
      email: cleanEmail,
      role,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email_verified: 0,
      phone_verified: 0,
      identity_verified: 0,
    },
  });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await db.queryOne<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (user.is_suspended) {
    res.status(403).json({ error: 'Account is suspended. Contact platform administration.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signJwt({ userId: user.id, email: user.email, role: user.role });
  const trust = await getUserTrustSummary(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      email_verified: Boolean(user.email_verified),
      phone_verified: Boolean(user.phone_verified),
      identity_verified: Boolean(user.identity_verified),
      trust,
    },
  });
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const user = await db.queryOne<any>(
    `SELECT id, email, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified, created_at
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  let profile: any = null;
  let preferences: any = null;
  if (user.role === 'tenant') {
    profile = await db.queryOne('SELECT * FROM tenant_profiles WHERE user_id = ?', [userId]);
    preferences = await db.queryOne('SELECT * FROM roommate_preferences WHERE user_id = ?', [userId]);
  } else if (user.role === 'landlord') {
    profile = await db.queryOne('SELECT * FROM landlord_profiles WHERE user_id = ?', [userId]);
  }

  const verifications = await db.query(
    'SELECT id, verification_type, document_ref, status, notes, created_at FROM verification_records WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  const trust = await getUserTrustSummary(userId);

  res.json({
    user: {
      ...user,
      email_verified: Boolean(user.email_verified),
      phone_verified: Boolean(user.phone_verified),
      identity_verified: Boolean(user.identity_verified),
      trust,
    },
    profile,
    preferences,
    verifications,
  });
});

router.put('/profile', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const { full_name, phone, avatar_url, profile } = req.body || {};

  if (full_name) {
    await db.execute(
      `UPDATE users SET full_name = ?, phone = ?, avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [String(full_name).trim(), String(phone || '').trim(), avatar_url ?? null, userId]
    );
  }

  if (req.user!.role === 'tenant' && profile) {
    await db.execute(
      `UPDATE tenant_profiles
       SET gender = ?, occupation = ?, institution_or_workplace = ?, preferred_location = ?,
           monthly_budget = ?, move_in_date = ?, preferred_room_type = ?, bio = ?
       WHERE user_id = ?`,
      [
        profile.gender || '',
        profile.occupation || 'Student',
        profile.institution_or_workplace || '',
        profile.preferred_location || 'Mirpur',
        Number(profile.monthly_budget) || 9000,
        profile.move_in_date || null,
        profile.preferred_room_type || 'Single Room',
        profile.bio || '',
        userId,
      ]
    );
  } else if (req.user!.role === 'landlord' && profile) {
    await db.execute(
      `UPDATE landlord_profiles SET address = ? WHERE user_id = ?`,
      [profile.address || '', userId]
    );
  }

  res.json({ message: 'Profile updated successfully' });
});

router.post('/verify-email', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Verification token is required' });
    return;
  }
  const row = await db.queryOne<any>(
    'SELECT * FROM email_verification_tokens WHERE token = ? AND used = 0',
    [token]
  );
  if (!row) {
    res.status(400).json({ error: 'Invalid or already used verification token' });
    return;
  }
  await db.execute('UPDATE email_verification_tokens SET used = 1 WHERE id = ?', [row.id]);
  await db.execute('UPDATE users SET email_verified = 1 WHERE id = ?', [row.user_id]);
  res.json({ message: 'Email verified successfully' });
});

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = await db.queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
  if (!user) {
    res.json({
      message: 'If an account matches that email, password reset instructions have been generated.',
    });
    return;
  }
  const resetToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await db.execute(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, resetToken, expiresAt]
  );
  res.json({
    message: 'Password reset token generated. Enter this token below to set a new password.',
    resetToken,
  });
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  if (!token || newPassword.length < 6) {
    res.status(400).json({ error: 'Valid reset token and password (min 6 chars) required' });
    return;
  }
  const row = await db.queryOne<any>(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
    [token]
  );
  if (!row) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
  await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id]);
  res.json({ message: 'Password updated successfully' });
});

router.post('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }
  const user = await db.queryOne<any>('SELECT password_hash FROM users WHERE id = ?', [req.user!.userId]);
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user!.userId]);
  res.json({ message: 'Password changed successfully' });
});

router.post('/verifications', requireAuth, async (req: AuthedRequest, res) => {
  const type = String(req.body?.verification_type || '');
  const docRef = String(req.body?.document_ref || '').trim();
  const allowed = ['phone', 'student_id', 'nid', 'landlord_id', 'property_doc'];
  if (!allowed.includes(type) || docRef.length < 4) {
    res.status(400).json({ error: 'Valid verification type and document reference required' });
    return;
  }

  // Strictly submit as pending for Admin review (never fake instant approval)
  const result = await db.execute(
    `INSERT INTO verification_records (user_id, verification_type, document_ref, status, notes)
     VALUES (?, ?, ?, 'pending', 'Submitted by user for verification review')`,
    [req.user!.userId, type, docRef]
  );

  res.status(201).json({
    id: result.insertId,
    status: 'pending',
    message: 'Verification document submitted for admin review.',
  });
});

export default router;
