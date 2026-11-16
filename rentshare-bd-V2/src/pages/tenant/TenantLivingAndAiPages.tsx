import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, ThumbsUp, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt } from '../../lib/api';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

export function MealPlannerPage() {
  const { showToast } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [day, setDay] = useState('Saturday');
  const [slot, setSlot] = useState('Breakfast');
  const [mealName, setMealName] = useState('');
  const [desc, setDesc] = useState('');

  const load = () => {
    apiFetch<any>('/api/living/meals')
      .then((d) => {
        setPlan(d.plan);
        setItems(d.items || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/living/meals', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: day,
          meal_slot: slot,
          meal_name: mealName,
          description: desc,
        }),
      });
      setMealName('');
      setDesc('');
      showToast('Meal added to weekly calendar', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const toggleVote = async (id: number) => {
    await apiFetch(`/api/living/meals/${id}/vote`, { method: 'POST' });
    load();
  };

  const deleteMeal = async (id: number) => {
    await apiFetch(`/api/living/meals/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout title="Weekly Meal Planner">
      <div className="space-y-6">
        <form
          onSubmit={addMeal}
          className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Day</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Meal Slot</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Dish Name</label>
            <input
              required
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="e.g. Paratha & Egg"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Add Meal
          </button>
        </form>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-4">{plan?.week_label || 'Weekly Schedule'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map((d) => {
              const dayMeals = items.filter((i) => i.day_of_week === d);
              return (
                <div key={d} className="rounded-xl border border-slate-200 p-4 bg-[#F8FAFC]">
                  <h3 className="font-display font-bold text-slate-900 mb-3">{d}</h3>
                  <div className="space-y-2.5">
                    {SLOTS.map((s) => {
                      const found = dayMeals.filter((m) => m.meal_slot === s);
                      return (
                        <div key={s} className="bg-white rounded-lg border border-slate-200 p-3 text-xs">
                          <span className="font-semibold text-[#4F46E5]">{s}</span>
                          {found.length === 0 ? (
                            <p className="text-slate-400 mt-0.5">Not planned yet</p>
                          ) : (
                            found.map((m) => (
                              <div key={m.id} className="mt-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-slate-900">{m.meal_name}</p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleVote(m.id)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] ${
                                        m.user_voted
                                          ? 'border-indigo-300 bg-indigo-50 text-[#4F46E5]'
                                          : 'border-slate-200 text-slate-600'
                                      }`}
                                      aria-label={`Vote for ${m.meal_name}`}
                                    >
                                      <ThumbsUp className="w-3 h-3" />
                                      <span className="font-mono">{m.votes}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteMeal(m.id)}
                                      className="text-slate-400 hover:text-red-600"
                                      aria-label={`Delete ${m.meal_name}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {m.description && <p className="text-slate-500 mt-0.5">{m.description}</p>}
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function GroceryManagerPage() {
  const { showToast } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const load = () => {
    apiFetch<any>('/api/living/groceries')
      .then((d) => {
        setItems(d.items || []);
        setMembers(d.members || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/living/groceries/items', {
        method: 'POST',
        body: JSON.stringify({
          item_name: itemName,
          quantity,
          estimated_price: Number(price) || 0,
          assigned_to_user_id: assignedTo ? Number(assignedTo) : null,
        }),
      });
      setItemName('');
      setQuantity('');
      setPrice('');
      showToast('Grocery item added', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const togglePurchased = async (item: any) => {
    await apiFetch(`/api/living/groceries/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_purchased: !item.is_purchased }),
    });
    load();
  };

  const deleteItem = async (id: number) => {
    await apiFetch(`/api/living/groceries/items/${id}`, { method: 'DELETE' });
    load();
  };

  const syncToFinance = async () => {
    try {
      const res = await apiFetch<any>('/api/living/groceries/sync-expense', { method: 'POST' });
      showToast(res.message, 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const estimatedTotal = items.reduce((a, i) => a + Number(i.estimated_price || 0), 0);
  const purchasedTotal = items
    .filter((i) => i.is_purchased)
    .reduce((a, i) => a + Number(i.estimated_price || 0), 0);

  return (
    <DashboardLayout title="Shared Grocery Manager">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-slate-500">Estimated Total List</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-slate-900">
                {formatBdt(estimatedTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Purchased Ready to Sync</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#0D9488]">
                {formatBdt(purchasedTotal)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={syncToFinance}
            className="px-4 py-2.5 rounded-lg bg-[#0D9488] text-white text-sm font-semibold hover:bg-teal-700"
          >
            Sync Purchased to Shared Expenses
          </button>
        </div>

        <form
          onSubmit={addItem}
          className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Item</label>
            <input
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Miniket Rice"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
            <input
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5 kg"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Est. Price (৳)</label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="420"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Shopper</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Add Item
          </button>
        </form>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3">Purchased</th>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Assigned Shopper</th>
                <th className="px-5 py-3 text-right">Est. Price</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className={item.is_purchased ? 'bg-emerald-50/40' : ''}>
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(item.is_purchased)}
                      onChange={() => togglePurchased(item)}
                      aria-label={`Mark ${item.item_name} purchased`}
                    />
                  </td>
                  <td className={`px-5 py-3 font-medium ${item.is_purchased ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {item.item_name}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-slate-600">{item.assigned_to_name || 'Anyone'}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">
                    {formatBdt(item.estimated_price)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="text-slate-400 hover:text-red-600"
                      aria-label={`Delete ${item.item_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function TenantMaintenancePage() {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [category, setCategory] = useState('Plumbing');
  const [priority, setPriority] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    apiFetch<{ requests: any[] }>('/api/living/maintenance')
      .then((d) => setRequests(d.requests))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/living/maintenance', {
        method: 'POST',
        body: JSON.stringify({ category, priority, title, description }),
      });
      setTitle('');
      setDescription('');
      showToast('Maintenance request submitted to landlord', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="Maintenance Requests">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={submitTicket}
          className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit"
        >
          <h2 className="font-display font-bold text-slate-900">Report Property Issue</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option>Water Leakage</option>
                <option>Electrical</option>
                <option>Plumbing</option>
                <option>AC Issue</option>
                <option>Door & Lock</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title (e.g. Kitchen sink leak)"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue clearly..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Submit Request
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">
                    {r.category} · Priority: {r.priority} · {r.property_title}
                  </p>
                  <h3 className="font-display font-bold text-slate-900 mt-0.5">{r.title}</h3>
                </div>
                <span className="text-xs font-semibold text-[#4F46E5]">{r.status}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">{r.description}</p>
              {r.landlord_response && (
                <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-emerald-800">
                  Landlord Note: {r.landlord_response}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AiFinancialAssistantPage() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [summary, setSummary] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const askAssistant = async (promptText: string) => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text: promptText }]);
    try {
      const res = await apiFetch<any>('/api/ai/financial-assistant', {
        method: 'POST',
        body: JSON.stringify({ question: promptText }),
      });
      setSummary(res.summary);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${(err as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    askAssistant('Give me a monthly expense analysis, next-month estimate, and personalized saving tips.');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion('');
    askAssistant(q);
  };

  return (
    <DashboardLayout title="AI Financial Assistant">
      <div className="space-y-6">
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Current Month Share</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
                {formatBdt(summary.currentMonthTotal)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Previous Month Share</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
                {formatBdt(summary.previousMonthTotal)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Estimated Next Month</p>
              <p className="font-mono tabular-nums text-2xl font-bold text-[#4F46E5] mt-1">
                {summary.predictedNextMonth !== null ? formatBdt(summary.predictedNextMonth) : 'Unavailable'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-[420px]">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 font-display font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-[#4F46E5]" />
            <span>Gemini Financial Coach (Grounded in Your Real Ledger)</span>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#F8FAFC]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl text-sm whitespace-pre-line max-w-3xl ${
                  m.role === 'user'
                    ? 'ml-auto bg-[#4F46E5] text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <p className="text-xs text-slate-500">Analyzing your shared ledger...</p>}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about food spending trends, budget cuts, or next month forecast..."
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold disabled:opacity-50"
            >
              Ask AI
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function NotificationsPage() {
  const { refreshNotifications } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ notifications: any[] }>('/api/notifications')
      .then((d) => setNotifications(d.notifications))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    await apiFetch('/api/notifications/mark-read', { method: 'POST', body: JSON.stringify({}) });
    await refreshNotifications();
    load();
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-slate-900">Activity & Reminders</h2>
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-semibold text-[#4F46E5] hover:underline"
          >
            Mark all as read
          </button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500 py-6">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm ${n.is_read ? 'text-slate-700' : 'font-bold text-slate-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                </div>
                {n.is_read ? (
                  <CheckCircle2 className="w-4 h-4 text-slate-300 shrink-0" />
                ) : (
                  <span className="text-[11px] font-semibold text-[#4F46E5] shrink-0">Unread</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export function SettingsPage() {
  const { showToast } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated successfully', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="Account Settings">
      <div className="max-w-lg bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-display font-bold text-slate-900">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Update Password
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
