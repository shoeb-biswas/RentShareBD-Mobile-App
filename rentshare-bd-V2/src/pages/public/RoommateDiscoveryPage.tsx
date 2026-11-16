import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { PublicLayout } from '../../components/layout/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt } from '../../lib/api';

export function RoommateDiscoveryPage() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (locationFilter.trim()) qs.set('location', locationFilter.trim());
      if (maxBudget.trim()) qs.set('maxBudget', maxBudget.trim());
      const data = await apiFetch<{ matches: any[] }>(`/api/roommates/matches?${qs.toString()}`);
      setMatches(data.matches);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendRequest = async (receiverId: number) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await apiFetch('/api/roommates/requests', {
        method: 'POST',
        body: JSON.stringify({
          receiverId,
          message: 'Hi! Our lifestyle compatibility score looks great. Let us connect.',
        }),
      });
      showToast('Roommate request sent', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">
              Roommate Discovery & Compatibility
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Weighted scoring across budget (20%), location (20%), smoking (15%), cleanliness (15%), sleep, noise, cooking, and guests.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Area (e.g. Mirpur)"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
            />
            <input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Max Budget ৳"
              className="w-36 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono"
            />
            <button
              type="button"
              onClick={load}
              className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((m) => (
              <div key={m.userId} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-slate-900">{m.fullName}</h2>
                      {m.trust?.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-[#0D9488]" aria-label="Verified User" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {m.occupation} {m.institution ? `· ${m.institution}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Preferred Area: {m.preferredLocation} · Budget:{' '}
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {formatBdt(m.monthlyBudget)}/mo
                      </span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono tabular-nums text-2xl font-extrabold text-[#4F46E5]">
                      {m.compatibility.score}%
                    </span>
                    <span className="block text-[11px] text-slate-500">Compatible</span>
                  </div>
                </div>

                {m.bio && <p className="mt-3 text-sm text-slate-700">{m.bio}</p>}

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-emerald-800 mb-1.5">Why you match</p>
                    <ul className="space-y-1 text-slate-700">
                      {m.compatibility.matches.map((item: string) => (
                        <li key={item}>+ {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 mb-1.5">Key differences</p>
                    {m.compatibility.differences.length === 0 ? (
                      <p className="text-slate-500">No major lifestyle friction detected.</p>
                    ) : (
                      <ul className="space-y-1 text-slate-600">
                        {m.compatibility.differences.map((diff: string) => (
                          <li key={diff}>- {diff}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">
                    Trust Score: {m.trust?.score || 0}/100
                  </span>

                  {m.request ? (
                    <span className="text-xs font-semibold text-slate-600 capitalize">
                      Request {m.request.status}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendRequest(m.userId)}
                      className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      Send Request
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
