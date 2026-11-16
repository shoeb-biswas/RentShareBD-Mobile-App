import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layouts';
import { SimpleBarChart, HorizontalBreakdownChart } from '../../components/charts/Charts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt } from '../../lib/api';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/admin/analytics').then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <DashboardLayout title="Admin Analytics">
        <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
      </DashboardLayout>
    );
  }

  const areaData = (stats.charts?.areaDistribution || []).map((a: any) => ({
    label: a.area,
    value: Number(a.avg_rent),
  }));
  const catData = (stats.charts?.expenseCategories || []).map((c: any) => ({
    label: c.category,
    value: Number(c.total),
  }));

  return (
    <DashboardLayout title="Platform Analytics Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Users (Verified / Total)</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
              {stats.users.verifiedUsers} / {stats.users.total}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.users.activeTenants} tenants · {stats.users.totalLandlords} landlords
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Properties</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
              {stats.properties.total}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.properties.available} available · {stats.properties.pending} pending
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Safety Queue</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">
              {stats.safety.suspiciousListings} flagged
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.safety.openComplaints} open complaints
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Tracked Shared Expenses</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#4F46E5] mt-1">
              {formatBdt(stats.financial.totalSharedExpenses)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Unpaid bills: {formatBdt(stats.financial.outstandingUtilityBills)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 mb-4">
              Average Monthly Rent by Dhaka Area
            </h2>
            <SimpleBarChart data={areaData} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 mb-4">
              Platform Shared Expense Volume by Category
            </h2>
            <HorizontalBreakdownChart data={catData} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AdminUsersPage() {
  const { showToast } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);

  const load = () => {
    apiFetch<any>('/api/admin/users')
      .then((d) => {
        setUsers(d.users || []);
        setVerifications(d.verifications || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSuspend = async (u: any) => {
    await apiFetch(`/api/admin/users/${u.id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ is_suspended: !u.is_suspended }),
    });
    showToast(u.is_suspended ? 'Account reactivated' : 'Account suspended', 'info');
    load();
  };

  const reviewVerification = async (id: number, status: 'approved' | 'rejected') => {
    await apiFetch(`/api/admin/verifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast(`Verification ${status}`, 'success');
    load();
  };

  return (
    <DashboardLayout title="User & Verification Management">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 font-display font-bold text-slate-900">
            Identity & Document Verification Queue
          </div>
          <div className="divide-y divide-slate-100">
            {verifications.map((v) => (
              <div key={v.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">
                    {v.full_name} ({v.role}) — <span className="uppercase font-mono text-xs">{v.verification_type}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Ref: <span className="font-mono">{v.document_ref}</span> · Status: {v.status}
                  </p>
                </div>
                {v.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewVerification(v.id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewVerification(v.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 font-display font-bold text-slate-900">
            All Registered Accounts
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Verification</th>
                  <th className="px-5 py-3">Account State</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {u.full_name}
                      <span className="block text-xs text-slate-500">{u.email}</span>
                    </td>
                    <td className="px-5 py-3 capitalize">{u.role}</td>
                    <td className="px-5 py-3 text-xs">
                      {u.identity_verified ? 'ID Verified' : 'ID Unverified'}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
                      {u.is_suspended ? (
                        <span className="text-red-700">Suspended</span>
                      ) : (
                        <span className="text-emerald-700">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => toggleSuspend(u)}
                          className="text-xs font-semibold text-[#4F46E5] hover:underline"
                        >
                          {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AdminPropertyVerificationPage() {
  const { showToast } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ properties: any[] }>('/api/admin/properties')
      .then((d) => setProperties(d.properties))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (id: number, status: 'approved' | 'rejected') => {
    await apiFetch(`/api/admin/properties/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verification_status: status, clear_suspicious: status === 'approved' }),
    });
    showToast(`Property ${status}`, 'success');
    load();
  };

  return (
    <DashboardLayout title="Property Verification">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3">Property</th>
                <th className="px-5 py-3">Landlord</th>
                <th className="px-5 py-3 text-right">Rent / Advance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {p.title}
                    <span className="block text-xs text-slate-500">{p.area} · {p.address}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-700">
                    {p.landlord_name}
                    <span className="block text-slate-500">{p.landlord_verified ? 'Verified' : 'Unverified'}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {formatBdt(p.monthly_rent)} / {formatBdt(p.advance_amount)}
                  </td>
                  <td className="px-5 py-3 capitalize font-semibold text-xs">
                    {p.verification_status}
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => verify(p.id, 'approved')}
                      className="px-2.5 py-1 rounded bg-[#0D9488] text-white text-xs font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => verify(p.id, 'rejected')}
                      className="px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold text-red-700"
                    >
                      Reject
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

export function AdminSuspiciousListingsPage() {
  const { showToast } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ properties: any[] }>('/api/admin/properties')
      .then((d) => setProperties(d.properties.filter((p) => p.is_suspicious)))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const resolveFlag = async (id: number, status: 'approved' | 'rejected') => {
    await apiFetch(`/api/admin/properties/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verification_status: status, clear_suspicious: status === 'approved' }),
    });
    showToast(`Suspicious listing ${status}`, 'info');
    load();
  };

  return (
    <DashboardLayout title="Suspicious Listings & Scam Detection">
      <div className="space-y-4">
        {properties.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600">
            No suspicious listings currently flagged for review.
          </div>
        ) : (
          properties.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-amber-300 p-6 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-amber-800">Potentially Suspicious Listing</p>
                  <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">{p.title}</h2>
                  <p className="text-xs text-slate-600">
                    Landlord: {p.landlord_name} ({p.landlord_email}) · Rent: {formatBdt(p.monthly_rent)} · Advance: {formatBdt(p.advance_amount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolveFlag(p.id, 'approved')}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
                  >
                    Clear Flag & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveFlag(p.id, 'rejected')}
                    className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold"
                  >
                    Suspend Listing
                  </button>
                </div>
              </div>
              <p className="text-sm text-amber-900 bg-amber-50 rounded-lg p-3 border border-amber-200">
                Flag Reasons: {p.suspicious_reason}
              </p>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

export function AdminComplaintsPage() {
  const { showToast } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ complaints: any[] }>('/api/admin/complaints')
      .then((d) => setComplaints(d.complaints))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const updateComplaint = async (id: number, status: string) => {
    await apiFetch(`/api/admin/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast(`Complaint marked ${status}`, 'success');
    load();
  };

  return (
    <DashboardLayout title="Complaints Management">
      <div className="space-y-4">
        {complaints.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Reported by {c.reporter_name} · Against: {c.target_name || 'Listing'} · Status:{' '}
                <span className="font-semibold capitalize">{c.status}</span>
              </p>
              <h2 className="font-display font-bold text-slate-900 mt-1">{c.reason}</h2>
              <p className="text-sm text-slate-700 mt-1">{c.details}</p>
            </div>
            <div className="flex gap-2">
              {['investigating', 'resolved', 'dismissed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateComplaint(c.id, st)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold capitalize hover:bg-slate-50"
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

export function AdminReportsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/admin/analytics').then(setStats).catch(() => {});
  }, []);

  const downloadJson = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RentShareBD_Admin_Report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Reports & Platform Export">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Executive Platform Summary Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database snapshot across users, verified properties, rentals, and shared finances.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadJson}
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export JSON Report
          </button>
        </div>

        {stats && (
          <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono overflow-x-auto">
            {JSON.stringify(stats, null, 2)}
          </pre>
        )}
      </div>
    </DashboardLayout>
  );
}
