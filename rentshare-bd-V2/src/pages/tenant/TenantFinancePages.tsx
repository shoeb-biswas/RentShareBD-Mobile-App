import React, { useEffect, useState } from 'react';
import { Trash2, Download, Pencil, Check, X } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layouts';
import { SimpleBarChart, HorizontalBreakdownChart } from '../../components/charts/Charts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt } from '../../lib/api';

const EXPENSE_CATEGORIES = [
  'House rent',
  'Electricity',
  'Gas',
  'Water',
  'Internet',
  'Food',
  'Grocery',
  'Cleaning',
  'Maintenance',
  'Transportation',
  'Other',
];

export function ExpenseDashboardPage() {
  const { showToast } = useAuth();
  const [data, setData] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('2026-11-15');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Grocery');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');

  const load = () => {
    apiFetch('/api/finance/expenses').then(setData).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          amount: Number(amount),
          expense_date: expenseDate,
          split_type: 'equal',
          notes,
        }),
      });
      setTitle('');
      setAmount('');
      setNotes('');
      showToast('Expense added and split among group members', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const deleteExpense = async (id: number) => {
    await apiFetch(`/api/finance/expenses/${id}`, { method: 'DELETE' });
    showToast('Expense deleted', 'info');
    load();
  };

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditTitle(e.title);
    setEditCategory(e.category);
    setEditAmount(String(e.amount));
    setEditDate(e.expense_date);
  };

  const saveEdit = async (id: number) => {
    try {
      await apiFetch(`/api/finance/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          category: editCategory,
          amount: Number(editAmount),
          expense_date: editDate,
        }),
      });
      setEditingId(null);
      showToast('Expense updated and splits recalculated', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const exportCsv = () => {
    if (!data?.expenses) return;
    const rows = [
      ['Date', 'Category', 'Title', 'Amount (BDT)', 'Paid By', 'Split Type'],
      ...data.expenses.map((e: any) => [
        e.expense_date,
        e.category,
        `"${e.title}"`,
        e.amount,
        `"${e.paid_by_name}"`,
        e.split_type,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RentShareBD_Expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const catChart = Object.entries(data?.analytics?.byCategory || {}).map(([label, value]) => ({
    label,
    value: Number(value),
  }));
  const monthChart = Object.entries(data?.analytics?.byMonth || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value: Number(value) }));
  const memberChart = Object.entries(data?.analytics?.byMember || {}).map(([label, value]) => ({
    label,
    value: Number(value),
  }));

  return (
    <DashboardLayout title="Monthly Money & Expense Dashboard">
      <div className="space-y-6">
        {/* Add Expense Form */}
        <form
          onSubmit={addExpense}
          className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="exp-title">
              Expense Title
            </label>
            <input
              id="exp-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Bazar / Wi-Fi Bill"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="exp-cat">
              Category
            </label>
            <select
              id="exp-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="exp-amt">
              Amount (৳)
            </label>
            <input
              id="exp-amt"
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="exp-date">
              Date
            </label>
            <input
              id="exp-date"
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Add Expense
          </button>
        </form>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-display font-bold text-slate-900 mb-4">Monthly Comparison</h2>
            <SimpleBarChart data={monthChart} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-display font-bold text-slate-900 mb-4">Category Spending</h2>
            <HorizontalBreakdownChart data={catChart} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-display font-bold text-slate-900 mb-4">Member Contributions</h2>
            <HorizontalBreakdownChart data={memberChart} />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900">Expense Ledger</h2>
            <button
              type="button"
              onClick={exportCsv}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Paid By</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.expenses?.map((e: any) =>
                  editingId === e.id ? (
                    <tr key={e.id} className="bg-indigo-50/40">
                      <td className="px-5 py-2.5">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(ev) => setEditDate(ev.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                          aria-label="Edit date"
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(ev) => setEditTitle(ev.target.value)}
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                          aria-label="Edit title"
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <select
                          value={editCategory}
                          onChange={(ev) => setEditCategory(ev.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                          aria-label="Edit category"
                        >
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-2.5 text-slate-700 text-xs">{e.paid_by_name}</td>
                      <td className="px-5 py-2.5 text-right">
                        <input
                          type="number"
                          min={1}
                          value={editAmount}
                          onChange={(ev) => setEditAmount(ev.target.value)}
                          className="w-24 px-2 py-1 rounded border border-slate-200 text-xs font-mono text-right bg-white"
                          aria-label="Edit amount"
                        />
                      </td>
                      <td className="px-5 py-2.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => saveEdit(e.id)}
                          className="p-1 text-[#0D9488] hover:text-teal-800"
                          aria-label={`Save ${e.title}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          aria-label="Cancel edit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={e.id}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{e.expense_date}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{e.title}</td>
                      <td className="px-5 py-3 text-slate-600">{e.category}</td>
                      <td className="px-5 py-3 text-slate-700">{e.paid_by_name}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatBdt(e.amount)}
                      </td>
                      <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(e)}
                          className="p-1 text-slate-400 hover:text-[#4F46E5]"
                          aria-label={`Edit ${e.title}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExpense(e.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          aria-label={`Delete ${e.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function ExpenseSplittingPage() {
  const { user, showToast } = useAuth();
  const [data, setData] = useState<any>(null);

  // Split creator
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electricity');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState<string>('');
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [customValues, setCustomValues] = useState<Record<number, string>>({});

  // Settlement
  const [payMethod, setPayMethod] = useState('bKash (Manual Ref)');
  const [refNote, setRefNote] = useState('');

  const load = () => {
    apiFetch('/api/finance/expenses')
      .then((d: any) => {
        setData(d);
        if (!paidById && user?.id) setPaidById(String(user.id));
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const createSplitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const members = data?.members || [];
      const participants = members.map((m: any) => ({
        userId: m.id,
        value: splitType === 'equal' ? undefined : Number(customValues[m.id] || 0),
      }));

      await apiFetch('/api/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          amount: Number(amount),
          paid_by_user_id: paidById ? Number(paidById) : undefined,
          split_type: splitType,
          participants,
        }),
      });
      setTitle('');
      setAmount('');
      setCustomValues({});
      showToast('Split expense recorded and balances recalculated', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const settleTransfer = async (fromId: number, toId: number, amt: number) => {
    try {
      await apiFetch('/api/finance/settlements', {
        method: 'POST',
        body: JSON.stringify({
          from_user_id: fromId,
          to_user_id: toId,
          amount: amt,
          payment_method: payMethod,
          reference_note: refNote || 'Settled via dashboard',
        }),
      });
      setRefNote('');
      showToast('Settlement recorded successfully', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const memberName = (id: number) =>
    data?.members?.find((m: any) => m.id === id)?.full_name || `User #${id}`;

  return (
    <DashboardLayout title="Smart Expense Splitting & Settlements">
      <div className="space-y-6">
        {/* Who Owes Whom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 mb-3">
              Who Owes Whom (Settlement Plan)
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
              >
                <option>bKash (Manual Ref)</option>
                <option>Nagad (Manual Ref)</option>
                <option>Cash / Hand-to-Hand</option>
                <option>Bank Transfer</option>
              </select>
              <input
                type="text"
                value={refNote}
                onChange={(e) => setRefNote(e.target.value)}
                placeholder="TrxID / Note (optional)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
              />
            </div>

            {!data?.ledger?.transfers?.length ? (
              <p className="text-sm text-emerald-700 font-medium py-4">
                All roommates are completely settled up!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.ledger.transfers.map((t: any, i: number) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-slate-900">{memberName(t.fromUserId)}</span>{' '}
                      <span className="text-slate-500">owes</span>{' '}
                      <span className="font-semibold text-slate-900">{memberName(t.toUserId)}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums font-bold text-red-700">
                        {formatBdt(t.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => settleTransfer(t.fromUserId, t.toUserId, t.amount)}
                        className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-semibold"
                      >
                        Record Paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 mb-3">Net Roommate Balances</h2>
            <div className="divide-y divide-slate-100">
              {data?.members?.map((m: any) => {
                const bal = data?.ledger?.netBalances?.[m.id] || 0;
                return (
                  <div key={m.id} className="py-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{m.full_name}</span>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        bal >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {bal >= 0 ? `+${formatBdt(bal)}` : `-${formatBdt(Math.abs(bal))}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Custom / Percentage / Equal Split Creator */}
        <form onSubmit={createSplitExpense} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-display font-bold text-slate-900">Create New Shared Split</h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Expense description"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Total Amount ৳"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
            <select
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              aria-label="Paid by roommate"
            >
              {data?.members?.map((m: any) => (
                <option key={m.id} value={m.id}>
                  Paid by: {m.full_name}
                </option>
              ))}
            </select>
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="equal">Equal Split</option>
              <option value="custom">Custom Amount (৳)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          {splitType !== 'equal' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {data?.members?.map((m: any) => (
                <div key={m.id}>
                  <label className="block text-xs text-slate-600 mb-1">
                    {m.full_name} ({splitType === 'percentage' ? '%' : '৳'})
                  </label>
                  <input
                    type="number"
                    required
                    value={customValues[m.id] || ''}
                    onChange={(e) =>
                      setCustomValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Save Split Expense
          </button>
        </form>

        {/* Settlement History */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display font-bold text-slate-900 mb-3">Settlement History</h2>
          {!data?.settlements?.length ? (
            <p className="text-sm text-slate-500">No settlements recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {data.settlements.map((s: any) => (
                <div key={s.id} className="py-2.5 flex justify-between">
                  <span>
                    {s.from_name} paid {s.to_name} via {s.payment_method}{' '}
                    {s.reference_note ? `(${s.reference_note})` : ''}
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{formatBdt(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export function UtilityBillsPage() {
  const { showToast } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any>({});

  // Add bill state
  const [billName, setBillName] = useState('');
  const [category, setCategory] = useState('Electricity');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('2026-11-20');
  const [autoPay, setAutoPay] = useState(false);
  const [provider, setProvider] = useState('bKash');

  // Pay modal state
  const [payingBillId, setPayingBillId] = useState<number | null>(null);
  const [txRef, setTxRef] = useState('');
  const [payProvider, setPayProvider] = useState('bKash');

  const load = () => {
    apiFetch<any>('/api/finance/utilities')
      .then((d) => {
        setBills(d.bills || []);
        setPayments(d.payments || []);
        setGateways(d.gateways || {});
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const addBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/finance/utilities', {
        method: 'POST',
        body: JSON.stringify({
          bill_name: billName,
          category,
          amount: Number(amount),
          due_date: dueDate,
          auto_pay_enabled: autoPay,
          auto_pay_provider: provider,
        }),
      });
      setBillName('');
      setAmount('');
      showToast('Utility bill scheduled', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const recordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBillId) return;
    try {
      await apiFetch(`/api/finance/utilities/${payingBillId}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'manual',
          provider: payProvider,
          transaction_ref: txRef,
        }),
      });
      setPayingBillId(null);
      setTxRef('');
      showToast('Utility bill payment recorded', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const deleteBill = async (id: number) => {
    await apiFetch(`/api/finance/utilities/${id}`, { method: 'DELETE' });
    showToast('Bill removed', 'info');
    load();
  };

  return (
    <DashboardLayout title="Utility Bills & Payment Reminders">
      <div className="space-y-6">
        {/* Payment Gateway Configuration Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              Bangladesh Payment Gateway Integration Status
            </p>
            <p className="text-slate-600 mt-0.5">
              SSLCommerz, bKash, and Nagad online checkouts are optional and gracefully disabled until merchant credentials are added to environment variables. Manual transaction reference tracking remains active.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 font-mono">
            <span className={gateways.sslcommerzConfigured ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
              SSLCommerz: {gateways.sslcommerzConfigured ? 'Enabled' : 'Disabled'}
            </span>
            <span className={gateways.bkashConfigured ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
              bKash: {gateways.bkashConfigured ? 'Enabled' : 'Disabled (Manual Ref Only)'}
            </span>
            <span className={gateways.nagadConfigured ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
              Nagad: {gateways.nagadConfigured ? 'Enabled' : 'Disabled (Manual Ref Only)'}
            </span>
          </div>
        </div>

        {/* Add Bill Form */}
        <form
          onSubmit={addBill}
          className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="bill-name">
              Bill Name
            </label>
            <input
              id="bill-name"
              required
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="e.g. DESCO Electricity Nov"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="bill-cat">
              Category
            </label>
            <select
              id="bill-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option>Electricity</option>
              <option>Gas</option>
              <option>Water</option>
              <option>Internet</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="bill-amt">
              Amount (৳)
            </label>
            <input
              id="bill-amt"
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="bill-due">
              Due Date
            </label>
            <input
              id="bill-due"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Add Utility Bill
          </button>
          <div className="lg:col-span-6 flex items-center gap-4 text-xs text-slate-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
              />
              <span>Enable Auto-Payment Preference</span>
            </label>
            {autoPay && (
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 bg-white"
              >
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="SSLCommerz">SSLCommerz</option>
              </select>
            )}
          </div>
        </form>

        {/* Manual Payment Recording & Optional Gateway Status */}
        {payingBillId && (
          <form
            onSubmit={recordManualPayment}
            className="bg-indigo-50 rounded-xl border border-indigo-200 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/70 pb-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Record Utility Bill Payment</p>
                <p className="text-xs text-slate-600">
                  Online gateway checkouts are disabled unless merchant credentials are configured; enter a verified manual transaction reference below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'SSLCommerz', enabled: Boolean(gateways.sslcommerzConfigured) },
                  { name: 'bKash', enabled: Boolean(gateways.bkashConfigured) },
                  { name: 'Nagad', enabled: Boolean(gateways.nagadConfigured) },
                ].map((gw) => (
                  <button
                    key={gw.name}
                    type="button"
                    disabled={!gw.enabled}
                    title={gw.enabled ? `Pay online via ${gw.name}` : `${gw.name} credentials not configured`}
                    onClick={async () => {
                      try {
                        await apiFetch(`/api/finance/utilities/${payingBillId}/pay`, {
                          method: 'POST',
                          body: JSON.stringify({ mode: 'gateway_intent', provider: gw.name }),
                        });
                      } catch (err) {
                        showToast((err as Error).message, 'info');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gw.enabled ? `Checkout: ${gw.name}` : `${gw.name} (Disabled)`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manual Payment Method
                </label>
                <select
                  value={payProvider}
                  onChange={(e) => setPayProvider(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                >
                  <option>bKash</option>
                  <option>Nagad</option>
                  <option>SSLCommerz</option>
                  <option>Cash / Bank</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / Receipt Reference ID
                </label>
                <input
                  type="text"
                  required
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. BKASH-9X2210"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-sm font-semibold"
              >
                Confirm Payment Record
              </button>
              <button
                type="button"
                onClick={() => setPayingBillId(null)}
                className="px-3 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Bills Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">Bill</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => {
                  const st = b.computedStatus?.status || 'Upcoming';
                  return (
                    <tr key={b.id}>
                      <td className="px-5 py-3 font-medium text-slate-900">{b.bill_name}</td>
                      <td className="px-5 py-3 text-slate-600">{b.category}</td>
                      <td className="px-5 py-3 font-mono text-xs">{b.due_date}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">
                        {formatBdt(b.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            st === 'Paid'
                              ? 'text-emerald-700'
                              : st === 'Overdue'
                              ? 'text-red-700'
                              : st === 'Due soon'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        {!b.paid_at && (
                          <button
                            type="button"
                            onClick={() => setPayingBillId(b.id)}
                            className="text-xs font-semibold text-[#4F46E5] hover:underline"
                          >
                            Record Payment
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteBill(b.id)}
                          className="text-xs text-slate-400 hover:text-red-600"
                          aria-label={`Delete ${b.bill_name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display font-bold text-slate-900 mb-3">Payment History</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">No recorded utility payments yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {payments.map((p) => (
                <div key={p.id} className="py-2.5 flex justify-between">
                  <span>
                    {p.bill_name} · Paid by {p.paid_by_name} via {p.provider} (Ref:{' '}
                    <span className="font-mono text-xs">{p.transaction_ref}</span>)
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{formatBdt(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
