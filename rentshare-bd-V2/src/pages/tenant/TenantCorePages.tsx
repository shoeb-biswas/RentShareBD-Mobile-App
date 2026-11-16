import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt, uploadImageFile } from '../../lib/api';
import { downloadAgreementPdf } from '../../utils/pdfGenerator';

export function TenantDashboardPage() {
  const { user } = useAuth();
  const [finance, setFinance] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/finance/expenses').then(setFinance).catch(() => {});
    apiFetch<{ bills: any[] }>('/api/finance/utilities').then((d) => setBills(d.bills)).catch(() => {});
    apiFetch<{ matches: any[] }>('/api/roommates/matches').then((d) => setMatches(d.matches.slice(0, 3))).catch(() => {});
    apiFetch<{ requests: any[] }>('/api/rentals/requests').then((d) => setRequests(d.requests)).catch(() => {});
  }, []);

  const myBalance = user && finance?.ledger?.netBalances ? finance.ledger.netBalances[user.id] || 0 : 0;
  const unpaidBills = bills.filter((b) => !b.paid_at);

  return (
    <DashboardLayout title="Tenant Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Trust Score</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
              {user?.trust?.score || 0}/100
            </p>
            <p className="text-xs text-[#0D9488] mt-1 font-medium">
              {user?.trust?.isVerified ? 'Verified Account' : 'Verification Pending'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Group Net Balance</p>
            <p
              className={`font-mono tabular-nums text-2xl font-bold mt-1 ${
                myBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {myBalance >= 0 ? `+${formatBdt(myBalance)}` : `-${formatBdt(Math.abs(myBalance))}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {myBalance >= 0 ? 'Owed to you' : 'You owe roommates'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Unpaid Utility Bills</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
              {unpaidBills.length}
            </p>
            <Link to="/tenant/utilities" className="text-xs text-[#4F46E5] font-medium mt-1 inline-block hover:underline">
              Manage utilities
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Rental Applications</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
              {requests.length}
            </p>
            <Link to="/tenant/requests" className="text-xs text-[#4F46E5] font-medium mt-1 inline-block hover:underline">
              View requests
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-slate-900">Upcoming Utility Bills</h2>
              <Link to="/tenant/utilities" className="text-xs font-semibold text-[#4F46E5]">
                View all
              </Link>
            </div>
            {unpaidBills.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">All utility bills are settled.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {unpaidBills.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{b.bill_name}</p>
                      <p className="text-xs text-slate-500">
                        Due {b.due_date} · {b.computedStatus?.status}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {formatBdt(b.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-slate-900">Top Roommate Matches</h2>
              <Link to="/tenant/matches" className="text-xs font-semibold text-[#4F46E5]">
                See matches
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {matches.map((m) => (
                <div key={m.userId} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{m.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {m.preferredLocation} · {formatBdt(m.monthlyBudget)}/mo
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[#4F46E5]">
                    {m.compatibility.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function TenantProfilePage() {
  const { user, profile, preferences, refreshMe, showToast } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [institution, setInstitution] = useState('');
  const [location, setLocation] = useState('Mirpur');
  const [budget, setBudget] = useState(9000);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Roommate Preferences
  const [sleep, setSleep] = useState('moderate');
  const [smoking, setSmoking] = useState('non_smoker');
  const [cleanliness, setCleanliness] = useState(4);
  const [noise, setNoise] = useState('quiet');
  const [cooking, setCooking] = useState('occasional');
  const [guests, setGuests] = useState('occasional_daytime');

  // Verification submission
  const [verifType, setVerifType] = useState('student_id');
  const [docRef, setDocRef] = useState('');
  const [verifications, setVerifications] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar_url || '');
    }
    if (profile) {
      setOccupation(profile.occupation || '');
      setInstitution(profile.institution_or_workplace || '');
      setLocation(profile.preferred_location || 'Mirpur');
      setBudget(profile.monthly_budget || 9000);
      setBio(profile.bio || '');
    }
    if (preferences) {
      setSleep(preferences.sleep_schedule || 'moderate');
      setSmoking(preferences.smoking_preference || 'non_smoker');
      setCleanliness(preferences.cleanliness_level || 4);
      setNoise(preferences.noise_preference || 'quiet');
      setCooking(preferences.cooking_habits || 'occasional');
      setGuests(preferences.guest_preference || 'occasional_daytime');
    }
    apiFetch<any>('/api/auth/me')
      .then((d) => setVerifications(d.verifications || []))
      .catch(() => {});
  }, [user, profile, preferences]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl || undefined,
          profile: {
            occupation,
            institution_or_workplace: institution,
            preferred_location: location,
            monthly_budget: Number(budget),
            bio,
          },
        }),
      });
      await apiFetch('/api/roommates/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          monthly_budget: Number(budget),
          preferred_location: location,
          sleep_schedule: sleep,
          smoking_preference: smoking,
          cleanliness_level: Number(cleanliness),
          noise_preference: noise,
          cooking_habits: cooking,
          guest_preference: guests,
        }),
      });
      await refreshMe();
      showToast('Profile and roommate preferences saved', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/verifications', {
        method: 'POST',
        body: JSON.stringify({ verification_type: verifType, document_ref: docRef }),
      });
      setDocRef('');
      showToast('Submitted for admin verification review', 'success');
      const me = await apiFetch<any>('/api/auth/me');
      setVerifications(me.verifications || []);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="My Profile & Verification">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={saveProfile}
          className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-slate-900">
            Personal & Roommate Matching Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-name">
                Full Name
              </label>
              <input
                id="p-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-phone">
                Phone Number
              </label>
              <input
                id="p-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-occ">
                Occupation
              </label>
              <input
                id="p-occ"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-inst">
                University / Workplace
              </label>
              <input
                id="p-inst"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-loc">
                Preferred Area
              </label>
              <input
                id="p-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-bud">
                Monthly Budget (৳)
              </label>
              <input
                id="p-bud"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-bio">
              Bio
            </label>
            <textarea
              id="p-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="p-avatar">
              Profile Photo (Cloudinary if configured, or local /uploads fallback)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              )}
              <input
                id="p-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (ev) => {
                  const file = ev.target.files?.[0];
                  if (!file) return;
                  try {
                    const res = await uploadImageFile(file, 'rentshare-avatars');
                    setAvatarUrl(res.url);
                    showToast(
                      res.storage === 'cloudinary'
                        ? 'Profile photo uploaded to Cloudinary'
                        : 'Profile photo saved locally (/uploads)',
                      'success'
                    );
                  } catch (err) {
                    showToast((err as Error).message, 'error');
                  }
                }}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pref-sleep">
                Sleep Schedule
              </label>
              <select
                id="pref-sleep"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="early_bird">Early Bird</option>
                <option value="moderate">Moderate</option>
                <option value="night_owl">Night Owl</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pref-smoke">
                Smoking Preference
              </label>
              <select
                id="pref-smoke"
                value={smoking}
                onChange={(e) => setSmoking(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="non_smoker">Non-Smoker</option>
                <option value="outside_only">Outside Only</option>
                <option value="smoker">Smoker</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pref-clean">
                Cleanliness (1-5)
              </label>
              <select
                id="pref-clean"
                value={cleanliness}
                onChange={(e) => setCleanliness(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pref-noise">
                Noise Environment
              </label>
              <select
                id="pref-noise"
                value={noise}
                onChange={(e) => setNoise(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="quiet">Quiet</option>
                <option value="moderate">Moderate</option>
                <option value="lively">Lively</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pref-cook">
                Cooking Habits
              </label>
              <select
                id="pref-cook"
                value={cooking}
                onChange={(e) => setCooking(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="daily_cook">Cook Daily</option>
                <option value="occasional">Occasional</option>
                <option value="rarely_order_out">Order Out Mostly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pref-guest">
                Guest Policy
              </label>
              <select
                id="pref-guest"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="no_guests">No Guests</option>
                <option value="occasional_daytime">Occasional Daytime</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Save Profile & Preferences
          </button>
        </form>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-900">Trust & Safety</h2>
              <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
            </div>
            <p className="font-mono tabular-nums text-3xl font-extrabold text-slate-900 mt-2">
              {user?.trust?.score || 0}/100
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Email: {user?.email_verified ? 'Verified' : 'Unverified'} · Phone:{' '}
              {user?.phone_verified ? 'Verified' : 'Unverified'} · ID:{' '}
              {user?.identity_verified ? 'Verified' : 'Pending'}
            </p>
          </div>

          <form
            onSubmit={submitVerification}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
          >
            <h3 className="font-display font-bold text-slate-900">Submit ID Verification</h3>
            <p className="text-xs text-slate-600">
              NID references are kept private and reviewed strictly by admins.
            </p>
            <select
              value={verifType}
              onChange={(e) => setVerifType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="student_id">Student ID</option>
              <option value="nid">National ID (NID)</option>
              <option value="phone">Phone Verification</option>
            </select>
            <input
              type="text"
              required
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              placeholder="Document ID / Reference Number"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-[#0D9488] text-white text-sm font-semibold"
            >
              Submit for Review
            </button>

            {verifications.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                {verifications.map((v) => (
                  <div key={v.id} className="flex justify-between">
                    <span className="capitalize text-slate-700">
                      {v.verification_type.replace('_', ' ')} ({v.document_ref})
                    </span>
                    <span className="font-semibold capitalize">{v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function TenantMatchesPage() {
  const { user, showToast } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    const [mData, rData] = await Promise.all([
      apiFetch<{ matches: any[] }>('/api/roommates/matches'),
      apiFetch<{ requests: any[] }>('/api/roommates/requests'),
    ]);
    setMatches(mData.matches);
    setRequests(rData.requests);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const updateRequest = async (id: number, status: 'accepted' | 'rejected' | 'cancelled') => {
    try {
      await apiFetch(`/api/roommates/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Request ${status}`, 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const sendReq = async (receiverId: number) => {
    try {
      await apiFetch('/api/roommates/requests', {
        method: 'POST',
        body: JSON.stringify({ receiverId, message: 'Let us connect as roommates!' }),
      });
      showToast('Roommate request sent', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="My Roommate Matches">
      <div className="space-y-8">
        {/* Incoming & Outgoing Requests */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4">Roommate Requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">No roommate requests yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((r) => {
                const isIncoming = r.receiver_id === user?.id;
                return (
                  <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {isIncoming ? `From ${r.sender_name}` : `To ${r.receiver_name}`}
                      </p>
                      <p className="text-xs text-slate-600">{r.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold capitalize text-slate-600 mr-2">
                        {r.status}
                      </span>
                      {r.status === 'pending' && isIncoming && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateRequest(r.id, 'accepted')}
                            className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-semibold"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRequest(r.id, 'rejected')}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {r.status === 'pending' && !isIncoming && (
                        <button
                          type="button"
                          onClick={() => updateRequest(r.id, 'cancelled')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Computed Matches */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((m) => (
            <div key={m.userId} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900">{m.fullName}</h3>
                  <p className="text-xs text-slate-600">
                    {m.occupation} · {m.preferredLocation} · {formatBdt(m.monthlyBudget)}/mo
                  </p>
                </div>
                <span className="font-mono tabular-nums text-xl font-bold text-[#4F46E5]">
                  {m.compatibility.score}%
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-emerald-800">
                {m.compatibility.matches.map((reason: string) => (
                  <li key={reason}>+ {reason}</li>
                ))}
              </ul>
              {m.compatibility.differences.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  {m.compatibility.differences.map((d: string) => (
                    <li key={d}>- {d}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                {m.request ? (
                  <span className="text-xs font-semibold capitalize text-slate-500">
                    Request {m.request.status}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendReq(m.userId)}
                    className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold"
                  >
                    Send Roommate Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
}

export function TenantRentalRequestsPage() {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ requests: any[] }>('/api/rentals/requests').then((d) => setRequests(d.requests));
  };
  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: number) => {
    await apiFetch(`/api/rentals/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    showToast('Rental request cancelled', 'info');
    load();
  };

  return (
    <DashboardLayout title="My Rental Requests">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            No rental applications submitted yet.{' '}
            <Link to="/properties" className="text-[#4F46E5] font-semibold hover:underline">
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Area</th>
                  <th className="px-5 py-3">Move-In</th>
                  <th className="px-5 py-3 text-right">Rent</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link to={`/properties/${r.property_id}`} className="hover:text-[#4F46E5]">
                        {r.property_title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{r.area}</td>
                    <td className="px-5 py-3 font-mono text-xs">{r.move_in_date}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      {formatBdt(r.monthly_rent)}
                    </td>
                    <td className="px-5 py-3 capitalize font-medium">{r.status}</td>
                    <td className="px-5 py-3 text-right">
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => cancel(r.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export function SavedPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<{ properties: any[] }>('/api/properties/saved')
      .then((d) => setProperties(d.properties))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Saved Properties">
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600">
          You have not saved any properties yet.{' '}
          <Link to="/properties" className="text-[#4F46E5] font-semibold">
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {properties.map((p) => (
            <Link
              key={p.id}
              to={`/properties/${p.id}`}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300"
            >
              <div className="aspect-[4/3] bg-slate-100">
                <img
                  src={p.primary_image || '/src/assets/images/property_mirpur_studio_1794759566369.jpg'}
                  alt={p.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500">{p.area} · {p.room_type}</p>
                <p className="font-display font-bold text-slate-900 mt-1">{p.title}</p>
                <p className="font-mono text-sm font-bold text-[#4F46E5] mt-2">
                  {formatBdt(p.costBreakdown?.totalMonthlyCost || p.monthly_rent)}/mo total
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export function TenantAgreementPage() {
  const { showToast } = useAuth();
  const [agreements, setAgreements] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ agreements: any[] }>('/api/rentals/agreements')
      .then((d) => setAgreements(d.agreements))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const acceptAgreement = async (id: number) => {
    try {
      await apiFetch(`/api/rentals/agreements/${id}/accept`, { method: 'POST' });
      showToast('Agreement consent recorded', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="My Rental Agreements">
      <div className="space-y-6">
        {agreements.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600">
            No digital rental agreements yet. Once a landlord accepts your rental request, your agreement will appear here.
          </div>
        ) : (
          agreements.map((ag) => (
            <div key={ag.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Agreement #{ag.id} · Status: <span className="capitalize font-semibold">{ag.status}</span>
                  </p>
                  <h2 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                    {ag.property_title}
                  </h2>
                  <p className="text-sm text-slate-600">{ag.property_address}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!ag.tenant_accepted && (
                    <button
                      type="button"
                      onClick={() => acceptAgreement(ag.id)}
                      className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-sm font-semibold"
                    >
                      Accept Terms
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadAgreementPdf(ag)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Monthly Rent</p>
                  <p className="font-mono font-bold text-slate-900">{formatBdt(ag.monthly_rent)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Advance Deposit</p>
                  <p className="font-mono font-bold text-slate-900">{formatBdt(ag.advance_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Term Dates</p>
                  <p className="font-mono text-xs text-slate-900 mt-0.5">
                    {ag.start_date} to {ag.end_date}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Notice Period</p>
                  <p className="font-mono text-slate-900">{ag.notice_period_days} days</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">Utility Terms</p>
                  <p className="text-slate-600 mt-1">{ag.utility_terms}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">House Rules</p>
                  <p className="text-slate-600 mt-1">{ag.house_rules}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Record of mutual digital consent on RentShare BD (not a notarized legal e-signature).
              </p>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
