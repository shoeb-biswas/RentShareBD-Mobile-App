import { Router } from 'express';
import { db } from '../db/client';
import { createNotification, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth';
import { calculateExpenseSplits } from '../../src/utils/domainLogic';

const router = Router();

async function getUserGroupId(userId: number): Promise<number | null> {
  const row = await db.queryOne<{ group_id: number }>(
    'SELECT group_id FROM group_members WHERE user_id = ? ORDER BY id ASC LIMIT 1',
    [userId]
  );
  return row ? row.group_id : null;
}

// --- WEEKLY MEAL MANAGER ---
router.get('/meals', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await getUserGroupId(req.user!.userId);
  if (!groupId) {
    res.json({ plan: null, items: [] });
    return;
  }

  let plan = await db.queryOne<any>(
    'SELECT * FROM meal_plans WHERE group_id = ? ORDER BY id DESC LIMIT 1',
    [groupId]
  );
  if (!plan) {
    const created = await db.execute(
      `INSERT INTO meal_plans (group_id, week_label, created_by) VALUES (?, 'Current Week Plan', ?)`,
      [groupId, req.user!.userId]
    );
    plan = { id: created.insertId, group_id: groupId, week_label: 'Current Week Plan' };
  }

  const items = await db.query<any>(
    `SELECT mi.*,
      (SELECT COUNT(*) FROM meal_participants mp WHERE mp.meal_item_id = mi.id) AS participant_count,
      EXISTS(SELECT 1 FROM meal_participants mp WHERE mp.meal_item_id = mi.id AND mp.user_id = ?) AS user_participating,
      EXISTS(SELECT 1 FROM meal_participants mp WHERE mp.meal_item_id = mi.id AND mp.user_id = ? AND mp.voted = 1) AS user_voted
     FROM meal_items mi
     WHERE mi.meal_plan_id = ?`,
    [req.user!.userId, req.user!.userId, plan.id]
  );

  res.json({ plan, items });
});

router.post('/meals', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await getUserGroupId(req.user!.userId);
  if (!groupId) {
    res.status(400).json({ error: 'Join a roommate group first' });
    return;
  }

  const { day_of_week, meal_slot, meal_name, description } = req.body || {};
  if (!day_of_week || !meal_slot || !meal_name) {
    res.status(400).json({ error: 'Day, meal slot, and meal name are required' });
    return;
  }

  let plan = await db.queryOne<any>(
    'SELECT * FROM meal_plans WHERE group_id = ? ORDER BY id DESC LIMIT 1',
    [groupId]
  );
  if (!plan) {
    const created = await db.execute(
      `INSERT INTO meal_plans (group_id, week_label, created_by) VALUES (?, 'Current Week Plan', ?)`,
      [groupId, req.user!.userId]
    );
    plan = { id: created.insertId };
  }

  const result = await db.execute(
    `INSERT INTO meal_items (meal_plan_id, day_of_week, meal_slot, meal_name, description, votes)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [plan.id, day_of_week, meal_slot, String(meal_name).trim(), String(description || '').trim()]
  );

  await db.execute(
    `INSERT INTO meal_participants (meal_item_id, user_id, voted) VALUES (?, ?, 1)`,
    [result.insertId, req.user!.userId]
  );

  res.status(201).json({ id: result.insertId });
});

router.put('/meals/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { meal_name, description } = req.body || {};
  await db.execute('UPDATE meal_items SET meal_name = ?, description = ? WHERE id = ?', [
    String(meal_name || '').trim(),
    String(description || '').trim(),
    id,
  ]);
  res.json({ message: 'Meal item updated' });
});

router.delete('/meals/:id', requireAuth, async (req: AuthedRequest, res) => {
  await db.execute('DELETE FROM meal_items WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Meal item deleted' });
});

router.post('/meals/:id/vote', requireAuth, async (req: AuthedRequest, res) => {
  const itemId = Number(req.params.id);
  const uid = req.user!.userId;
  const existing = await db.queryOne<any>(
    'SELECT * FROM meal_participants WHERE meal_item_id = ? AND user_id = ?',
    [itemId, uid]
  );

  if (!existing) {
    await db.execute(
      'INSERT INTO meal_participants (meal_item_id, user_id, voted) VALUES (?, ?, 1)',
      [itemId, uid]
    );
    await db.execute('UPDATE meal_items SET votes = votes + 1 WHERE id = ?', [itemId]);
    res.json({ voted: true });
    return;
  }

  if (existing.voted) {
    await db.execute('UPDATE meal_participants SET voted = 0 WHERE id = ?', [existing.id]);
    await db.execute('UPDATE meal_items SET votes = MAX(0, votes - 1) WHERE id = ?', [itemId]);
    res.json({ voted: false });
  } else {
    await db.execute('UPDATE meal_participants SET voted = 1 WHERE id = ?', [existing.id]);
    await db.execute('UPDATE meal_items SET votes = votes + 1 WHERE id = ?', [itemId]);
    res.json({ voted: true });
  }
});

// --- GROCERY MANAGER ---
router.get('/groceries', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await getUserGroupId(req.user!.userId);
  if (!groupId) {
    res.json({ list: null, items: [], members: [] });
    return;
  }

  let list = await db.queryOne<any>(
    'SELECT * FROM grocery_lists WHERE group_id = ? ORDER BY id DESC LIMIT 1',
    [groupId]
  );
  if (!list) {
    const created = await db.execute(
      `INSERT INTO grocery_lists (group_id, title) VALUES (?, 'Shared Grocery List')`,
      [groupId]
    );
    list = { id: created.insertId, group_id: groupId, title: 'Shared Grocery List', synced_expense_id: null };
  }

  const items = await db.query<any>(
    `SELECT gi.*, u.full_name AS assigned_to_name
     FROM grocery_items gi
     LEFT JOIN users u ON u.id = gi.assigned_to_user_id
     WHERE gi.grocery_list_id = ?
     ORDER BY gi.is_purchased ASC, gi.id DESC`,
    [list.id]
  );
  const members = await db.query<any>(
    `SELECT u.id, u.full_name FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?`,
    [groupId]
  );

  res.json({ list, items, members });
});

router.post('/groceries/items', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await getUserGroupId(req.user!.userId);
  if (!groupId) {
    res.status(400).json({ error: 'Join a roommate group first' });
    return;
  }

  const { item_name, quantity, estimated_price, assigned_to_user_id } = req.body || {};
  if (!item_name || !quantity) {
    res.status(400).json({ error: 'Item name and quantity are required' });
    return;
  }

  let list = await db.queryOne<any>(
    'SELECT * FROM grocery_lists WHERE group_id = ? ORDER BY id DESC LIMIT 1',
    [groupId]
  );
  if (!list) {
    const created = await db.execute(
      `INSERT INTO grocery_lists (group_id, title) VALUES (?, 'Shared Grocery List')`,
      [groupId]
    );
    list = { id: created.insertId };
  }

  const result = await db.execute(
    `INSERT INTO grocery_items (grocery_list_id, item_name, quantity, estimated_price, assigned_to_user_id, is_purchased)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [
      list.id,
      String(item_name).trim(),
      String(quantity).trim(),
      Number(estimated_price) || 0,
      assigned_to_user_id ? Number(assigned_to_user_id) : null,
    ]
  );
  res.status(201).json({ id: result.insertId });
});

router.patch('/groceries/items/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const item = await db.queryOne<any>('SELECT * FROM grocery_items WHERE id = ?', [id]);
  if (!item) {
    res.status(404).json({ error: 'Grocery item not found' });
    return;
  }
  const b = req.body || {};
  const isPurchased = b.is_purchased !== undefined ? (b.is_purchased ? 1 : 0) : item.is_purchased;
  await db.execute(
    `UPDATE grocery_items SET is_purchased = ?, purchased_by_user_id = ?, estimated_price = ? WHERE id = ?`,
    [
      isPurchased,
      isPurchased ? req.user!.userId : null,
      b.estimated_price !== undefined ? Number(b.estimated_price) : item.estimated_price,
      id,
    ]
  );
  res.json({ message: 'Grocery item updated' });
});

router.delete('/groceries/items/:id', requireAuth, async (req: AuthedRequest, res) => {
  await db.execute('DELETE FROM grocery_items WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Grocery item deleted' });
});

router.post('/groceries/sync-expense', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await getUserGroupId(req.user!.userId);
  if (!groupId) {
    res.status(400).json({ error: 'Group not found' });
    return;
  }
  const list = await db.queryOne<any>(
    'SELECT * FROM grocery_lists WHERE group_id = ? ORDER BY id DESC LIMIT 1',
    [groupId]
  );
  if (!list) {
    res.status(404).json({ error: 'No grocery list found' });
    return;
  }

  const purchased = await db.query<any>(
    'SELECT * FROM grocery_items WHERE grocery_list_id = ? AND is_purchased = 1',
    [list.id]
  );
  const total = purchased.reduce((acc, i) => acc + Number(i.estimated_price || 0), 0);
  if (total <= 0) {
    res.status(400).json({ error: 'Mark at least one priced grocery item as purchased before syncing.' });
    return;
  }

  const members = await db.query<{ user_id: number }>(
    'SELECT user_id FROM group_members WHERE group_id = ?',
    [groupId]
  );
  const splits = calculateExpenseSplits(
    total,
    'equal',
    members.map((m) => ({ userId: m.user_id }))
  );

  const today = new Date().toISOString().slice(0, 10);
  const expRes = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'Grocery', ?, ?, 'equal', ?, ?)`,
    [
      groupId,
      req.user!.userId,
      `${list.title} (${purchased.length} items)`,
      total,
      today,
      `Auto-synced from Grocery Manager: ${purchased.map((i) => i.item_name).join(', ')}`,
    ]
  );

  for (const sp of splits) {
    await db.execute(
      'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
      [expRes.insertId, sp.userId, sp.shareAmount]
    );
  }
  await db.execute('UPDATE grocery_lists SET synced_expense_id = ? WHERE id = ?', [
    expRes.insertId,
    list.id,
  ]);

  res.status(201).json({
    expenseId: expRes.insertId,
    totalSynced: total,
    message: `Synced ৳${total.toLocaleString()} of purchased groceries to Shared Expenses & Splits.`,
  });
});

// --- MAINTENANCE MANAGEMENT ---
router.get('/maintenance', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;
  if (req.user!.role === 'landlord') {
    const rows = await db.query<any>(
      `SELECT mr.*, p.title AS property_title, p.area, u.full_name AS tenant_name, u.phone AS tenant_phone
       FROM maintenance_requests mr
       JOIN properties p ON p.id = mr.property_id
       JOIN users u ON u.id = mr.tenant_id
       WHERE mr.landlord_id = ?
       ORDER BY mr.created_at DESC`,
      [uid]
    );
    res.json({ requests: rows });
    return;
  }

  const rows = await db.query<any>(
    `SELECT mr.*, p.title AS property_title, p.area, u.full_name AS landlord_name
     FROM maintenance_requests mr
     JOIN properties p ON p.id = mr.property_id
     JOIN users u ON u.id = mr.landlord_id
     WHERE mr.tenant_id = ?
     ORDER BY mr.created_at DESC`,
    [uid]
  );
  res.json({ requests: rows });
});

router.post('/maintenance', requireAuth, requireRole('tenant'), async (req: AuthedRequest, res) => {
  const b = req.body || {};
  let propertyId = b.property_id ? Number(b.property_id) : null;

  if (!propertyId) {
    const activeAg = await db.queryOne<{ property_id: number }>(
      `SELECT property_id FROM rental_agreements WHERE tenant_id = ? ORDER BY id DESC LIMIT 1`,
      [req.user!.userId]
    );
    propertyId = activeAg?.property_id || null;
  }

  if (!propertyId) {
    const firstProp = await db.queryOne<{ id: number }>('SELECT id FROM properties LIMIT 1');
    propertyId = firstProp?.id || null;
  }

  const prop = await db.queryOne<{ id: number; landlord_id: number; title: string }>(
    'SELECT id, landlord_id, title FROM properties WHERE id = ?',
    [propertyId]
  );

  if (!prop || !b.title || !b.description) {
    res.status(400).json({ error: 'Property, issue title, and description are required' });
    return;
  }

  const result = await db.execute(
    `INSERT INTO maintenance_requests (property_id, tenant_id, landlord_id, category, title, description, image_url, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
    [
      prop.id,
      req.user!.userId,
      prop.landlord_id,
      b.category || 'Plumbing',
      String(b.title).trim(),
      String(b.description).trim(),
      b.image_url || '',
      b.priority || 'Medium',
    ]
  );

  await createNotification(
    prop.landlord_id,
    'maintenance',
    'New maintenance request',
    `${b.title} reported for ${prop.title}.`,
    '/landlord/maintenance'
  );

  res.status(201).json({ id: result.insertId, status: 'Submitted' });
});

router.patch('/maintenance/:id', requireAuth, requireRole('landlord', 'admin'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const mr = await db.queryOne<any>('SELECT * FROM maintenance_requests WHERE id = ?', [id]);
  if (!mr) {
    res.status(404).json({ error: 'Maintenance request not found' });
    return;
  }
  if (req.user!.role !== 'admin' && mr.landlord_id !== req.user!.userId) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const status = String(req.body?.status || mr.status);
  const responseNote = String(req.body?.landlord_response ?? mr.landlord_response ?? '');

  await db.execute(
    `UPDATE maintenance_requests SET status = ?, landlord_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, responseNote, id]
  );

  await createNotification(
    mr.tenant_id,
    'maintenance',
    'Maintenance status updated',
    `Your request "${mr.title}" is now ${status}.`,
    '/tenant/maintenance'
  );

  res.json({ id, status, landlord_response: responseNote });
});

export default router;
