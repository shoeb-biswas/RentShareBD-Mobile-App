import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, Sparkles } from 'lucide-react';
import { PublicLayout } from '../../components/layout/Layouts';
import { apiFetch, formatBdt } from '../../lib/api';

const AREAS = ['All', 'Mirpur', 'Uttara', 'Dhanmondi', 'Mohammadpur', 'Bashundhara', 'Savar', 'Gazipur'];

export function MarketplacePage() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState(searchParams.get('maxBudget') || '');
  const [roomType, setRoomType] = useState('All');
  const [rooms, setRooms] = useState('');
  const [furnished, setFurnished] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [attachedBath, setAttachedBath] = useState(false);
  const [balcony, setBalcony] = useState(false);
  const [wifi, setWifi] = useState(false);
  const [parking, setParking] = useState(false);
  const [generator, setGenerator] = useState(false);

  // AI Natural Language Search
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (location.trim() && location !== 'All') qs.set('location', location.trim());
      if (minBudget) qs.set('minBudget', minBudget);
      if (maxBudget) qs.set('maxBudget', maxBudget);
      if (roomType !== 'All') qs.set('roomType', roomType);
      if (rooms) qs.set('rooms', rooms);
      if (furnished) qs.set('furnished', furnished);
      if (availableFrom) qs.set('availableFrom', availableFrom);
      if (attachedBath) qs.set('attachedBath', 'true');
      if (balcony) qs.set('balcony', 'true');
      if (wifi) qs.set('wifi', 'true');
      if (parking) qs.set('parking', 'true');
      if (generator) qs.set('generator', 'true');

      const data = await apiFetch<{ properties: any[] }>(`/api/properties?${qs.toString()}`);
      setProperties(data.properties);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiFetch<any>('/api/ai/rental-assistant', {
        method: 'POST',
        body: JSON.stringify({ query: aiQuery }),
      });
      setAiResult(res);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">
              Rental Property Marketplace
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Transparent rent, utility estimates, and verified landlords across Bangladesh.
            </p>
          </div>
        </div>

        {/* AI Natural Language Rental Assistant Bar */}
        <form
          onSubmit={handleAiSearch}
          className="mb-8 bg-white rounded-xl border border-indigo-200 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        >
          <div className="flex items-center gap-2 text-[#4F46E5] font-semibold text-sm shrink-0">
            <Sparkles className="w-4 h-4" />
            <span>AI Rental Assistant</span>
          </div>
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder='e.g. "Room near Mirpur under 8000, quiet roommate"'
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
          <button
            type="submit"
            disabled={aiLoading}
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {aiLoading ? 'Searching...' : 'Ask AI Assistant'}
          </button>
        </form>

        {aiResult && (
          <div className="mb-8 bg-indigo-50/70 rounded-xl border border-indigo-200 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-bold text-slate-900">
                  AI Assistant Recommendations
                </h2>
                <p className="text-sm text-slate-700 mt-0.5">{aiResult.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setAiResult(null)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Dismiss
              </button>
            </div>
            {aiResult.properties?.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiResult.properties.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/properties/${p.id}`}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-indigo-400"
                  >
                    <p className="text-xs text-slate-500">
                      {p.area} · {p.room_type}
                    </p>
                    <p className="font-semibold text-slate-900 mt-1">{p.title}</p>
                    <p className="font-mono text-sm font-bold text-[#4F46E5] mt-2">
                      {formatBdt(p.costBreakdown?.totalMonthlyCost || p.monthly_rent)}/mo total
                    </p>
                  </Link>
                ))}
              </div>
            )}
            {aiResult.roommates?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-200/70">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Compatible Roommates Found in Database:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {aiResult.roommates.map((r: any) => (
                    <div key={r.userId} className="bg-white rounded-lg border border-slate-200 p-3 text-xs">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{r.fullName}</span>
                        <span className="font-mono text-[#4F46E5]">{r.compatibilityScore}%</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        {r.preferredLocation} · {formatBdt(r.monthlyBudget)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filter Sidebar */}
          <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 h-fit space-y-4">
            <h2 className="font-display font-bold text-slate-900">Filter Properties</h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="filter-loc">
                Area / Location
              </label>
              <select
                id="filter-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a === 'All' ? '' : a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="min-b">
                  Min Rent (৳)
                </label>
                <input
                  id="min-b"
                  type="number"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  placeholder="3000"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="max-b">
                  Max Rent (৳)
                </label>
                <input
                  id="max-b"
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="15000"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="room-type">
                Room Type
              </label>
              <select
                id="room-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="All">All Types</option>
                <option value="Single Room">Single Room</option>
                <option value="Shared Room">Shared Room</option>
                <option value="Master Suite">Master Suite</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="rooms-cnt">
                  Min Rooms
                </label>
                <input
                  id="rooms-cnt"
                  type="number"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  placeholder="1"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="furn">
                  Furnished
                </label>
                <select
                  id="furn"
                  value={furnished}
                  onChange={(e) => setFurnished(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="">Any</option>
                  <option value="true">Furnished</option>
                  <option value="false">Unfurnished</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="avail-date">
                Available By Date
              </label>
              <input
                id="avail-date"
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-sm">
              <p className="text-xs font-medium text-slate-700">Facilities</p>
              {[
                ['Attached Bath', attachedBath, setAttachedBath],
                ['Balcony', balcony, setBalcony],
                ['High-Speed Wi-Fi', wifi, setWifi],
                ['Parking', parking, setParking],
                ['Generator Backup', generator, setGenerator],
              ].map(([label, val, setter]: any) => (
                <label key={label} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setter(e.target.checked)}
                    className="rounded border-slate-300 text-[#4F46E5]"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchProperties}
              className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Apply Filters
            </button>
          </aside>

          {/* Listings Grid */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-80 rounded-xl bg-white border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="font-display font-bold text-slate-900">No properties match these filters</p>
                <p className="text-sm text-slate-600 mt-1">
                  Try widening your budget range or selecting another neighborhood.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLocation('');
                    setMinBudget('');
                    setMaxBudget('');
                    setRoomType('All');
                    setRooms('');
                    setFurnished('');
                    setAvailableFrom('');
                    setAttachedBath(false);
                    setBalcony(false);
                    setWifi(false);
                    setParking(false);
                    setGenerator(false);
                    setTimeout(fetchProperties, 0);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {properties.map((p) => (
                  <Link
                    key={p.id}
                    to={`/properties/${p.id}`}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300 transition-colors flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                      <img
                        src={p.primary_image || '/src/assets/images/property_mirpur_studio_1794759566369.jpg'}
                        alt={p.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="text-xs text-slate-500">
                        {p.area} · {p.room_type} · {p.total_rooms} rooms
                        {p.is_suspicious ? ' · Potentially Suspicious Listing' : ''}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                        {p.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{p.address}</span>
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">Base Rent</span>
                          <span className="font-mono tabular-nums text-sm font-semibold text-slate-700">
                            {formatBdt(p.monthly_rent)}/mo
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#4F46E5] font-medium block">
                            Total Monthly Cost
                          </span>
                          <span className="font-mono tabular-nums text-lg font-bold text-slate-900">
                            {formatBdt(p.costBreakdown?.totalMonthlyCost || p.monthly_rent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
