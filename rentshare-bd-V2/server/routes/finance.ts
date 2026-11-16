import { Router } from 'express';
import { db } from '../db/client';
import { createNotification, requireAuth, type AuthedRequest } from '../middleware/auth';
import { getPublicIntegrationStatus } from '../config/env';
import {
  calculateExpenseSplits,
  calculateSettlements,
  getUtilityBillStatus,
  type SplitType,
} from '../../src/utils/domainLogic';

const router = Router();

async function resolveUserGroupId(userId: number, requestedGroupId?: number): Promise<number | null> {
  if (requestedGroupId) {
    const member = await db.queryOne(
      'SELECT group_id FROM group_members WHERE group_id = ? AND user_id = ?',
      [requestedGroupId, userId]
    );
    return member ? requestedGroupId : null;
  }
  const first = await db.queryOne<{ group_id: number }>(
    'SELECT group_id FROM group_members WHERE user_id = ? ORDER BY id ASC LIMIT 1',
    [userId]
  );
  return first ? first.group_id : null;
}

router.get('/expenses', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await resolveUserGroupId(
    req.user!.userId,
    req.query.groupId ? Number(req.query.groupId) : undefined
  );
  if (!groupId) {
    res.json({ groupId: null, members: [], expenses: [], splits: [], settlements: [], ledger: { netBalances: {}, transfers: [] }, analytics: { byCategory: {}, byMonth: {}, byMember: {} } });
    return;
  }

  const members = await db.query<any>(
    `SELECT u.id, u.full_name, u.email FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?`,
    [groupId]
  );

  const expenses = await db.query<any>(
    `SELECT e.*, u.full_name AS paid_by_name
     FROM expenses e
     JOIN users u ON u.id = e.paid_by_user_id
     WHERE e.group_id = ?
     ORDER BY e.expense_date DESC, e.id DESC`,
    [groupId]
  );

  const splits = await db.query<any>(
    `SELECT es.*, u.full_name AS user_name
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     JOIN users u ON u.id = es.user_id
     WHERE e.group_id = ?`,
    [groupId]
  );

  const settlements = await db.query<any>(
    `SELECT s.*, f.full_name AS from_name, t.full_name AS to_name
     FROM settlements s
     JOIN users f ON f.id = s.from_user_id
     JOIN users t ON t.id = s.to_user_id
     WHERE s.group_id = ?
     ORDER BY s.settled_at DESC`,
    [groupId]
  );

  const ledger = calculateSettlements(
    expenses.map((e) => ({ id: e.id, paidByUserId: e.paid_by_user_id, amount: Number(e.amount) })),
    splits.map((s) => ({ expenseId: s.expense_id, userId: s.user_id, shareAmount: Number(s.share_amount) })),
    settlements.map((st) => ({ fromUserId: st.from_user_id, toUserId: st.to_user_id, amount: Number(st.amount) }))
  );

  const byCategory: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byMember: Record<string, number> = {};

  for (const e of expenses) {
    const amt = Number(e.amount);
    byCategory[e.category] = (byCategory[e.category] || 0) + amt;
    const monthKey = String(e.expense_date).slice(0, 7);
    byMonth[monthKey] = (byMonth[monthKey] || 0) + amt;
    byMember[e.paid_by_name] = (byMember[e.paid_by_name] || 0) + amt;
  }

  res.json({
    groupId,
    members,
    expenses,
    splits,
    settlements,
    ledger,
    analytics: { byCategory, byMonth, byMember },
  });
});

router.post('/expenses', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body || {};
  const groupId = await resolveUserGroupId(req.user!.userId, b.group_id ? Number(b.group_id) : undefined);
  if (!groupId) {
    res.status(400).json({ error: 'Join or create a roommate group before adding expenses' });
    return;
  }

  const amount = Number(b.amount);
  const title = String(b.title || '').trim();
  const category = String(b.category || 'Other');
  const splitType: SplitType = ['equal', 'custom', 'percentage'].includes(b.split_type)
    ? b.split_type
    : 'equal';
  const paidBy = Number(b.paid_by_user_id) || req.user!.userId;
  const expenseDate = String(b.expense_date || new Date().toISOString().slice(0, 10));

  if (!title || Number.isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: 'Valid title and positive amount required' });
    return;
  }

  const members = await db.query<{ user_id: number }>(
    'SELECT user_id FROM group_members WHERE group_id = ?',
    [groupId]
  );

  const participants =
    Array.isArray(b.participants) && b.participants.length > 0
      ? b.participants
      : members.map((m) => ({ userId: m.user_id }));

  let computedSplits;
  try {
    computedSplits = calculateExpenseSplits(amount, splitType, participants);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const expRes = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, receipt_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      groupId,
      paidBy,
      category,
      title,
      amount,
      splitType,
      expenseDate,
      b.receipt_url || '',
      b.notes || '',
    ]
  );

  for (const sp of computedSplits) {
    await db.execute(
      'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
      [expRes.insertId, sp.userId, sp.shareAmount]
    );
    if (sp.userId !== paidBy) {
      await createNotification(
        sp.userId,
        'finance',
        'New shared expense added',
        `${title}: ৳${amount.toLocaleString()} (your share: ৳${sp.shareAmount.toLocaleString()})`,
        '/tenant/splits'
      );
    }
  }

  res.status(201).json({ id: expRes.insertId, splits: computedSplits });
});

router.put('/expenses/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const exp = await db.queryOne<any>('SELECT * FROM expenses WHERE id = ?', [id]);
  if (!exp) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  const member = await db.queryOne(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [exp.group_id, req.user!.userId]
  );
  if (!member) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const b = req.body || {};
  const amount = Number(b.amount ?? exp.amount);
  const title = String(b.title ?? exp.title).trim();
  const category = String(b.category ?? exp.category);
  const expenseDate = String(b.expense_date ?? exp.expense_date);

  await db.execute(
    `UPDATE expenses SET title = ?, category = ?, amount = ?, expense_date = ?, notes = ? WHERE id = ?`,
    [title, category, amount, expenseDate, b.notes ?? exp.notes, id]
  );

  if (b.amount !== undefined && Number(b.amount) !== Number(exp.amount)) {
    const currentSplits = await db.query<{ user_id: number }>(
      'SELECT user_id FROM expense_splits WHERE expense_id = ?',
      [id]
    );
    const recomputed = calculateExpenseSplits(
      amount,
      'equal',
      currentSplits.map((s) => ({ userId: s.user_id }))
    );
    await db.execute('DELETE FROM expense_splits WHERE expense_id = ?', [id]);
    for (const sp of recomputed) {
      await db.execute(
        'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
        [id, sp.userId, sp.shareAmount]
      );
    }
  }

  res.json({ message: 'Expense updated' });
});

router.delete('/expenses/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const exp = await db.queryOne<any>('SELECT * FROM expenses WHERE id = ?', [id]);
  if (!exp) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  const member = await db.queryOne(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [exp.group_id, req.user!.userId]
  );
  if (!member) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }
  await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
  res.json({ message: 'Expense deleted' });
});

router.post('/settlements', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body || {};
  const groupId = await resolveUserGroupId(req.user!.userId, b.group_id ? Number(b.group_id) : undefined);
  if (!groupId) {
    res.status(400).json({ error: 'Group not found' });
    return;
  }
  const fromUserId = Number(b.from_user_id);
  const toUserId = Number(b.to_user_id);
  const amount = Number(b.amount);
  const paymentMethod = String(b.payment_method || 'Cash / Manual');
  const referenceNote = String(b.reference_note || '').trim();

  if (!fromUserId || !toUserId || fromUserId === toUserId || amount <= 0) {
    res.status(400).json({ error: 'Valid payer, payee, and positive amount required' });
    return;
  }

  // Duplicate settlement guard within 30 seconds for same amount & users
  const dup = await db.queryOne(
    `SELECT id FROM settlements
     WHERE group_id = ? AND from_user_id = ? AND to_user_id = ? AND amount = ?
       AND settled_at >= datetime('now', '-30 seconds')`,
    [groupId, fromUserId, toUserId, amount]
  ).catch(() => null);

  if (dup) {
    res.status(409).json({ error: 'Duplicate settlement detected. Please wait before re-submitting.' });
    return;
  }

  const result = await db.execute(
    `INSERT INTO settlements (group_id, from_user_id, to_user_id, amount, payment_method, reference_note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [groupId, fromUserId, toUserId, amount, paymentMethod, referenceNote]
  );

  await createNotification(
    toUserId,
    'finance',
    'Settlement recorded',
    `A settlement of ৳${amount.toLocaleString()} (${paymentMethod}) was recorded.`,
    '/tenant/splits'
  );

  res.status(201).json({ id: result.insertId });
});

router.get('/utilities', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await resolveUserGroupId(req.user!.userId);
  if (!groupId) {
    res.json({ bills: [], payments: [], gateways: getGatewayStatus() });
    return;
  }

  const bills = await db.query<any>(
    `SELECT * FROM utility_bills WHERE group_id = ? ORDER BY due_date ASC`,
    [groupId]
  );
  const payments = await db.query<any>(
    `SELECT bp.*, ub.bill_name, u.full_name AS paid_by_name
     FROM bill_payments bp
     JOIN utility_bills ub ON ub.id = bp.bill_id
     JOIN users u ON u.id = bp.paid_by_user_id
     WHERE ub.group_id = ?
     ORDER BY bp.paid_at DESC`,
    [groupId]
  );

  const enrichedBills = bills.map((b) => ({
    ...b,
    assigned_user_ids: JSON.parse(b.assigned_user_ids || '[]'),
    computedStatus: getUtilityBillStatus(b.due_date, b.paid_at),
  }));

  res.json({ bills: enrichedBills, payments, gateways: getGatewayStatus() });
});

function getGatewayStatus() {
  return getPublicIntegrationStatus().paymentGateways;
}

router.post('/utilities', requireAuth, async (req: AuthedRequest, res) => {
  const groupId = await resolveUserGroupId(req.user!.userId);
  if (!groupId) {
    res.status(400).json({ error: 'Join a roommate group first' });
    return;
  }
  const b = req.body || {};
  const billName = String(b.bill_name || '').trim();
  const amount = Number(b.amount);
  const dueDate = String(b.due_date || '');
  if (!billName || amount <= 0 || !dueDate) {
    res.status(400).json({ error: 'Bill name, positive amount, and due date are required' });
    return;
  }

  const members = await db.query<{ user_id: number }>(
    'SELECT user_id FROM group_members WHERE group_id = ?',
    [groupId]
  );
  const assignedIds =
    Array.isArray(b.assigned_user_ids) && b.assigned_user_ids.length > 0
      ? b.assigned_user_ids
      : members.map((m) => m.user_id);

  const result = await db.execute(
    `INSERT INTO utility_bills (group_id, category, bill_name, amount, due_date, billing_period, assigned_user_ids, auto_pay_enabled, auto_pay_provider)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      groupId,
      b.category || 'Electricity',
      billName,
      amount,
      dueDate,
      b.billing_period || dueDate.slice(0, 7),
      JSON.stringify(assignedIds),
      b.auto_pay_enabled ? 1 : 0,
      b.auto_pay_provider || '',
    ]
  );

  res.status(201).json({ id: result.insertId });
});

router.patch('/utilities/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const bill = await db.queryOne<any>('SELECT * FROM utility_bills WHERE id = ?', [id]);
  if (!bill) {
    res.status(404).json({ error: 'Utility bill not found' });
    return;
  }
  const b = req.body || {};
  await db.execute(
    `UPDATE utility_bills SET bill_name = ?, category = ?, amount = ?, due_date = ?, auto_pay_enabled = ?, auto_pay_provider = ? WHERE id = ?`,
    [
      b.bill_name ?? bill.bill_name,
      b.category ?? bill.category,
      Number(b.amount ?? bill.amount),
      b.due_date ?? bill.due_date,
      b.auto_pay_enabled !== undefined ? (b.auto_pay_enabled ? 1 : 0) : bill.auto_pay_enabled,
      b.auto_pay_provider ?? bill.auto_pay_provider,
      id,
    ]
  );
  res.json({ message: 'Bill updated' });
});

router.delete('/utilities/:id', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  await db.execute('DELETE FROM utility_bills WHERE id = ?', [id]);
  res.json({ message: 'Bill deleted' });
});

router.post('/utilities/:id/pay', requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const bill = await db.queryOne<any>('SELECT * FROM utility_bills WHERE id = ?', [id]);
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' });
    return;
  }

  const provider = String(req.body?.provider || 'Manual Tracking');
  const txRef = String(req.body?.transaction_ref || '').trim();
  const receiptUrl = String(req.body?.receipt_url || '').trim();
  const mode = String(req.body?.mode || 'manual'); // 'manual' | 'gateway_intent'

  if (mode === 'gateway_intent') {
    const gw = getGatewayStatus();
    const isEnabled =
      (provider === 'SSLCommerz' && gw.sslcommerzConfigured) ||
      (provider === 'bKash' && gw.bkashConfigured) ||
      (provider === 'Nagad' && gw.nagadConfigured);

    if (!isEnabled) {
      res.status(503).json({
        error: `${provider} online checkout is disabled because merchant credentials are not configured. Record a manual payment with your transaction reference instead.`,
        disabled: true,
        requiresGatewayConfig: true,
      });
      return;
    }

    res.status(501).json({
      error: `${provider} live checkout session requires a signed merchant callback redirect. Use manual reference tracking until merchant webhook endpoints are connected.`,
      requiresGatewayCallback: true,
    });
    return;
  }

  if (mode !== 'manual' || !txRef) {
    res.status(400).json({ error: 'Please provide a receipt or transaction reference number to record manual payment.' });
    return;
  }

  await db.execute(
    `UPDATE utility_bills SET paid_at = CURRENT_TIMESTAMP, receipt_url = COALESCE(?, receipt_url) WHERE id = ?`,
    [receiptUrl || null, id]
  );

  await db.execute(
    `INSERT INTO bill_payments (bill_id, paid_by_user_id, amount, provider, transaction_ref, status)
     VALUES (?, ?, ?, ?, ?, 'manual_recorded')`,
    [id, req.user!.userId, bill.amount, provider, txRef]
  );

  res.json({ message: 'Manual payment reference recorded successfully' });
});

export default router;
