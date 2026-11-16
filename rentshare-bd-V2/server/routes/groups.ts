import { Router } from 'express';
import { db } from '../db/client';
import { createNotification, requireAuth, type AuthedRequest } from '../middleware/auth';
import { getOnlineUserIds } from '../../chat-service/gateway';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  const groups = await db.query<any>(
    `SELECT rg.*, gm.role AS my_role, p.title AS property_title, p.area
     FROM roommate_groups rg
     JOIN group_members gm ON gm.group_id = rg.id
     LEFT JOIN properties p ON p.id = rg.property_id
     WHERE gm.user_id = ?
     ORDER BY rg.created_at DESC`,
    [uid]
  );

  for (const g of groups) {
    g.members = await db.query<any>(
      `SELECT gm.user_id, gm.role, gm.joined_at, u.full_name, u.email, u.phone
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ?`,
      [g.id]
    );
  }

  res.json({ groups, onlineUserIds: getOnlineUserIds() });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const propertyId = req.body?.property_id ? Number(req.body.property_id) : null;
  if (name.length < 2) {
    res.status(400).json({ error: 'Group name is required' });
    return;
  }

  const gRes = await db.execute(
    `INSERT INTO roommate_groups (name, property_id, created_by) VALUES (?, ?, ?)`,
    [name, propertyId, req.user!.userId]
  );
  await db.execute(
    `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')`,
    [gRes.insertId, req.user!.userId]
  );

  res.status(201).json({ id: gRes.insertId, name });
});

router.post('/:id/members', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = Number(req.params.id);
  const email = String(req.body?.email || '').trim().toLowerCase();

  const isMember = await db.queryOne(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.user!.userId]
  );
  if (!isMember) {
    res.status(403).json({ error: 'Only group members can add roommates' });
    return;
  }

  const target = await db.queryOne<{ id: number; full_name: string }>(
    'SELECT id, full_name FROM users WHERE email = ?',
    [email]
  );
  if (!target) {
    res.status(404).json({ error: 'No registered user found with that email' });
    return;
  }

  const existing = await db.queryOne(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, target.id]
  );
  if (existing) {
    res.status(409).json({ error: 'User is already in this group' });
    return;
  }

  await db.execute(
    `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')`,
    [groupId, target.id]
  );
  await createNotification(
    target.id,
    'chat',
    'Added to roommate group',
    'You were added to a roommate group on RentShare BD.',
    '/tenant/group'
  );

  res.status(201).json({ message: `${target.full_name} added to group` });
});

router.delete('/:id/members/:userId', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const caller = await db.queryOne<{ role: string }>(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.user!.userId]
  );
  if (!caller || (caller.role !== 'admin' && targetUserId !== req.user!.userId)) {
    res.status(403).json({ error: 'Not authorized to remove member' });
    return;
  }
  await db.execute('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [
    groupId,
    targetUserId,
  ]);
  res.json({ message: 'Member removed' });
});

router.get('/:id/messages', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = Number(req.params.id);
  const member = await db.queryOne(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.user!.userId]
  );
  if (!member) {
    res.status(403).json({ error: 'Access denied to this group chat' });
    return;
  }

  const messages = await db.query<any>(
    `SELECT m.*, u.full_name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = ?
     ORDER BY m.created_at ASC`,
    [groupId]
  );

  await db.execute(
    'UPDATE messages SET is_read = 1 WHERE group_id = ? AND sender_id != ?',
    [groupId, req.user!.userId]
  );

  res.json({ messages, onlineUserIds: getOnlineUserIds() });
});

router.get('/dm/contacts', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  const users = await db.query<any>(
    `SELECT id, full_name, email, role FROM users WHERE id != ? AND is_suspended = 0 ORDER BY full_name ASC`,
    [uid]
  );
  res.json({ contacts: users, onlineUserIds: getOnlineUserIds() });
});

router.get('/dm/:otherUserId', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  const otherId = Number(req.params.otherUserId);
  const messages = await db.query<any>(
    `SELECT m.*, u.full_name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.group_id IS NULL AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
     ORDER BY m.created_at ASC`,
    [uid, otherId, otherId, uid]
  );

  await db.execute(
    'UPDATE messages SET is_read = 1 WHERE group_id IS NULL AND sender_id = ? AND receiver_id = ?',
    [otherId, uid]
  );

  res.json({ messages, onlineUserIds: getOnlineUserIds() });
});

export default router;
