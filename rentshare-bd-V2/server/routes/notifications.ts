import { Router } from 'express';
import { db } from '../db/client';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { getUtilityBillStatus } from '../../src/utils/domainLogic';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.userId;

  // Smart Bill Reminder Sync: check if user has unpaid bills due within 3 days / today / overdue
  const groups = await db.query<{ group_id: number }>(
    'SELECT group_id FROM group_members WHERE user_id = ?',
    [uid]
  );
  for (const g of groups) {
    const bills = await db.query<any>(
      'SELECT id, bill_name, amount, due_date, paid_at FROM utility_bills WHERE group_id = ? AND paid_at IS NULL',
      [g.group_id]
    );
    for (const bill of bills) {
      const st = getUtilityBillStatus(bill.due_date, bill.paid_at);
      if (st.reminderStage) {
        const title = `Utility reminder: ${bill.bill_name}`;
        const existing = await db.queryOne(
          'SELECT id FROM notifications WHERE user_id = ? AND title = ? AND is_read = 0',
          [uid, title]
        );
        if (!existing) {
          await db.execute(
            `INSERT INTO notifications (user_id, type, title, message, link_path) VALUES (?, 'utility', ?, ?, '/tenant/utilities')`,
            [
              uid,
              title,
              `${bill.bill_name} (৳${Number(bill.amount).toLocaleString()}) is ${st.status.toLowerCase()} (Due: ${bill.due_date}).`,
            ]
          );
        }
      }
    }
  }

  const notifications = await db.query<any>(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [uid]
  );
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  res.json({ notifications, unreadCount });
});

router.post('/mark-read', requireAuth, async (req: AuthedRequest, res) => {
  const id = req.body?.id ? Number(req.body.id) : null;
  if (id) {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [
      id,
      req.user!.userId,
    ]);
  } else {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.userId]);
  }
  res.json({ message: 'Notifications updated' });
});

export default router;
