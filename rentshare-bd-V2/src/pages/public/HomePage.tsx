import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, ShieldCheck, Users, Wallet, Sparkles } from 'lucide-react';
import { PublicLayout } from '../../components/layout/Layouts';
import { apiFetch, formatBdt } from '../../lib/api';

export function HomePage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [searchLoc, setSearchLoc] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ properties: any[] }>('/api/properties')
      .then((d) => setProperties(d.properties.slice(0, 3)))
      .catch(() => {});
    apiFetch<{ matches: any[] }>('/api/roommates/matches')
      .then((d) => setMatches(d.matches.slice(0, 3)))
      .catch(() => {});
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLoc.trim()) params.set('location', searchLoc.trim());
    if (maxBudget.trim()) params.set('maxBudget', maxBudget.trim());
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wide text-[#0D9488] mb-3">
              Built for Students & Young Professionals in Bangladesh
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12] text-balance">
              Find a Place. Find the Right Roommate. Manage Your Life Together.
            </h1>
            <p className="mt-4 text-base text-slate-600 max-w-xl leading-relaxed">
              Explore verified flats in Mirpur, Uttara, Dhanmondi, and Bashundhara with true
              monthly cost breakdowns, weighted roommate compatibility matching, shared expense
              splitting, and real-time group living tools.
            </p>

            {/* Quick Search Bar */}
            <form
              onSubmit={handleQuickSearch}
              className="mt-8 p-2 rounded-xl border border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row gap-2"
            >
              <label className="sr-only" htmlFor="home-location">
                Preferred Area
              </label>
              <input
                id="home-location"
                type="text"
                value={searchLoc}
                onChange={(e) => setSearchLoc(e.target.value)}
                placeholder="Area (Mirpur, Uttara, Dhanmondi...)"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
              <label className="sr-only" htmlFor="home-budget">
                Max Monthly Rent (BDT)
              </label>
              <input
                id="home-budget"
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="Max rent ৳"
                className="w-full sm:w-36 px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
              >
                Search Rentals
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-600">
              <Link
                to="/roommates"
                className="font-semibold text-[#4F46E5] hover:underline inline-flex items-center gap-1.5"
              >
                Match with Roommates <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/register" className="hover:text-slate-900 font-medium">
                List a Property as Landlord
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src="/src/assets/images/hero_dhaka_apartment_1794759566649.jpg"
                alt="Bright shared apartment living room in Dhaka with balcony greenery"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-Width Key Capabilities Strip */}
        <div className="border-t border-slate-200 bg-[#F8FAFC]">
          <div className="max-w-[1280px] mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Verified Listings & Trust Score</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Scam detection flags abnormal advances and unverified landlords.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Weighted Roommate Matching</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Clear compatibility explanations across budget, sleep, and lifestyle.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Smart Splitting & Bills</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Split rent, DESCO, WASA, and groceries with zero calculation drift.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Gemini AI Financial Coach</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Grounded monthly expense forecasts and natural-language flat search.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Verified Properties */}
      <section className="max-w-[1280px] mx-auto px-6 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Verified Shared Flats in Dhaka
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Every listing shows true Total Monthly Cost including utilities and service charges.
            </p>
          </div>
          <Link
            to="/properties"
            className="text-sm font-semibold text-[#4F46E5] hover:underline whitespace-nowrap shrink-0"
          >
            View all listings
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {properties.map((p) => (
            <Link
              key={p.id}
              to={`/properties/${p.id}`}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300 transition-colors flex flex-col"
            >
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                {p.primary_image ? (
                  <img
                    src={p.primary_image}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    {p.area}
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>{p.area}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.room_type}</span>
                  {p.landlord_verified ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#0D9488] font-medium">Verified Landlord</span>
                    </>
                  ) : null}
                </div>
                <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 group-hover:text-[#4F46E5] transition-colors">
                  {p.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{p.address}</span>
                </p>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Base Rent</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-700">
                      {formatBdt(p.monthly_rent)}/mo
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#4F46E5] font-medium block">Total Monthly</span>
                    <span className="font-mono tabular-nums text-lg font-bold text-slate-900">
                      {formatBdt(p.costBreakdown?.totalMonthlyCost || p.monthly_rent)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Roommate Compatibility Preview */}
      <section className="max-w-[1280px] mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Smart Roommate Compatibility
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                We calculate weighted scores and explain why two people fit well together.
              </p>
            </div>
            <Link
              to="/roommates"
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Explore Roommates
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {matches.map((m) => (
              <div key={m.userId} className="rounded-xl border border-slate-200 p-5 bg-[#F8FAFC]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-slate-900">{m.fullName}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {m.occupation} · {m.preferredLocation}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-lg font-bold text-[#4F46E5]">
                    {m.compatibility.score}%
                  </span>
                </div>
                <p className="mt-3 text-xs font-mono tabular-nums text-slate-700">
                  Budget: {formatBdt(m.monthlyBudget)}/mo · Trust: {m.trust?.score || 0}/100
                </p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  {m.compatibility.matches.slice(0, 2).map((reason: string) => (
                    <li key={reason} className="text-emerald-800">
                      + {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
