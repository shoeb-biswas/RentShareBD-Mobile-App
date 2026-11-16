import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Heart, MapPin, ShieldCheck, Star } from 'lucide-react';
import { PublicLayout } from '../../components/layout/Layouts';
import { PropertyMap } from '../../components/maps/PropertyMap';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt } from '../../lib/api';

export function PropertyDetailsPage() {
  const { id } = useParams();
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');

  // Rental Request State
  const [moveInDate, setMoveInDate] = useState('2026-12-01');
  const [durationMonths, setDurationMonths] = useState(12);
  const [requestMsg, setRequestMsg] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Report Modal State
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('Suspicious advance deposit');
  const [reportDetails, setReportDetails] = useState('');

  // Review State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ property: any }>(`/api/properties/${id}`);
      setProperty(data.property);
      setActiveImage(data.property.images?.[0]?.image_url || '');
    } catch {
      setProperty(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const res = await apiFetch<{ saved: boolean }>(`/api/properties/${id}/save`, { method: 'POST' });
    setProperty((p: any) => ({ ...p, isSaved: res.saved }));
    showToast(res.saved ? 'Saved to your favorites' : 'Removed from saved properties', 'success');
  };

  const handleRentalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmittingReq(true);
    try {
      await apiFetch('/api/rentals/requests', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: Number(id),
          move_in_date: moveInDate,
          duration_months: Number(durationMonths),
          message: requestMsg,
        }),
      });
      showToast('Rental request sent to landlord', 'success');
      setRequestMsg('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await apiFetch(`/api/properties/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });
      showToast('Report submitted for admin review', 'info');
      setShowReport(false);
      setReportDetails('');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await apiFetch('/api/rentals/reviews', {
        method: 'POST',
        body: JSON.stringify({
          property_id: Number(id),
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      showToast('Review submitted', 'success');
      setReviewComment('');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="h-96 rounded-xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </PublicLayout>
    );
  }

  if (!property) {
    return (
      <PublicLayout>
        <div className="max-w-[1280px] mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Property Not Found</h1>
        </div>
      </PublicLayout>
    );
  }

  const cb = property.costBreakdown;

  return (
    <PublicLayout>
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {property.is_suspicious ? (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-bold">Potentially Suspicious Listing</p>
              <p className="mt-0.5">
                {property.suspicious_reason ||
                  'Flagged by automated safety checks. Never pay advance deposits before inspecting the property in person.'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Gallery, Details, Map, Reviews */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="aspect-[16/9] bg-slate-100">
                <img
                  src={activeImage || '/src/assets/images/property_mirpur_studio_1794759566369.jpg'}
                  alt={property.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {property.images?.length > 1 && (
                <div className="p-3 flex gap-2 border-t border-slate-200 overflow-x-auto">
                  {property.images.map((img: any) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImage(img.image_url)}
                      className={`w-24 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                        activeImage === img.image_url ? 'border-[#4F46E5]' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt={property.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    {property.area} · {property.room_type} · Available from {property.available_from}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    {property.title}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>{property.address}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`px-3.5 py-2 rounded-lg border text-sm font-medium flex items-center gap-1.5 ${
                      property.isSaved
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>{property.isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReport(!showReport)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Report Listing
                  </button>
                </div>
              </div>

              {showReport && (
                <form
                  onSubmit={handleReport}
                  className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3"
                >
                  <p className="text-sm font-bold text-slate-900">Report Suspicious Activity</p>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                  >
                    <option>Suspicious advance deposit</option>
                    <option>Misleading photos or rent price</option>
                    <option>Duplicate / scam posting</option>
                    <option>Unresponsive or abusive landlord</option>
                  </select>
                  <textarea
                    required
                    rows={2}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide factual details for our safety team..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReport(false)}
                      className="px-3 py-1.5 text-sm text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold"
                    >
                      Submit Report
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-5 text-sm text-slate-700 leading-relaxed">{property.description}</p>

              {/* Facilities */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h2 className="font-display font-bold text-slate-900 mb-3">
                  Facilities & Specs
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm text-slate-700">
                  <div>{property.furnished ? 'Furnished' : 'Unfurnished'}</div>
                  <div>{property.total_rooms} Total Rooms</div>
                  <div>{property.attached_bath ? 'Attached Bath' : 'Shared Bath'}</div>
                  <div>{property.has_balcony ? 'Balcony Included' : 'No Balcony'}</div>
                  <div>{property.has_wifi ? 'Fiber Wi-Fi Ready' : 'No Wi-Fi'}</div>
                  <div>{property.has_generator ? 'Generator Backup' : 'No Generator'}</div>
                  {property.facilities?.map((f: string) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rooms */}
              {property.rooms?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h2 className="font-display font-bold text-slate-900 mb-3">Individual Rooms</h2>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {property.rooms.map((r: any) => (
                      <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm bg-white">
                        <div>
                          <p className="font-semibold text-slate-900">{r.room_label}</p>
                          <p className="text-xs text-slate-500">{r.room_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono tabular-nums font-bold text-slate-900">
                            {formatBdt(r.monthly_rent)}/mo
                          </p>
                          <p
                            className={`text-xs font-medium ${
                              r.is_available ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {r.is_available ? 'Available' : 'Occupied'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location Intelligence & OpenStreetMap */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-display text-xl font-bold text-slate-900 mb-1">
                Location Intelligence & Commute Estimates
              </h2>
              <p className="text-xs text-slate-600 mb-4">
                Interactive OpenStreetMap view with nearby Dhaka universities, transit hubs, hospitals, and ATMs.
              </p>

              <PropertyMap
                latitude={Number(property.latitude)}
                longitude={Number(property.longitude)}
                title={property.title}
                landmarks={property.nearbyLandmarks}
              />

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Nearby Landmark</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4 text-right">Distance</th>
                      <th className="py-2 pr-4 text-right">Bus Fare</th>
                      <th className="py-2 text-right">Rickshaw Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {property.nearbyLandmarks?.map((lm: any) => (
                      <tr key={lm.name}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{lm.name}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{lm.type}</td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                          {lm.distanceKm} km
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-700">
                          {formatBdt(lm.transit.busFareBdt)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                          {formatBdt(lm.transit.rickshawFareBdt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">
                Tenant Reviews & Ratings ({property.reviews?.length || 0})
              </h2>
              <div className="space-y-4">
                {property.reviews?.map((rev: any) => (
                  <div key={rev.id} className="pb-4 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{rev.reviewer_name}</span>
                      <span className="font-mono text-xs text-amber-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{rev.comment}</p>
                  </div>
                ))}
              </div>

              {user?.role === 'tenant' && (
                <form onSubmit={handleReviewSubmit} className="mt-5 pt-5 border-t border-slate-100 space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Leave a Review</p>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-600" htmlFor="rev-rating">
                      Rating:
                    </label>
                    <select
                      id="rev-rating"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} Stars
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your honest feedback about this property and landlord..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
                  >
                    Post Review
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Total Monthly Cost Calculator, Landlord Trust, Rental Request */}
          <div className="lg:col-span-4 space-y-6">
            {/* Total Monthly Cost Card */}
            <div className="bg-white rounded-2xl border border-indigo-200 p-6">
              <p className="text-xs font-semibold text-[#4F46E5]">Total Monthly Cost Calculator</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono tabular-nums text-3xl font-extrabold text-slate-900">
                  {formatBdt(cb.totalMonthlyCost)}
                </span>
                <span className="text-xs text-slate-500">per month</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Base Monthly Rent</span>
                  <span className="font-mono tabular-nums font-medium">{formatBdt(cb.rent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Electricity (Est.)</span>
                  <span className="font-mono tabular-nums">{formatBdt(cb.electricity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Internet / Wi-Fi</span>
                  <span className="font-mono tabular-nums">{formatBdt(cb.internet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Service Charge</span>
                  <span className="font-mono tabular-nums">{formatBdt(cb.serviceCharge)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Water & Gas</span>
                  <span className="font-mono tabular-nums">
                    {formatBdt(cb.water + cb.gas + cb.otherCharges)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Advance Security Deposit</span>
                  <span className="font-mono tabular-nums">{formatBdt(property.advance_amount)}</span>
                </div>
              </div>
            </div>

            {/* Landlord Trust Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Listed By</p>
                  <p className="font-display font-bold text-slate-900">{property.landlord_name}</p>
                </div>
                {property.landlordTrust?.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]">
                    <ShieldCheck className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-700">Unverified</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-[#F8FAFC] rounded-xl p-3 border border-slate-100">
                <div>
                  <p className="font-mono tabular-nums font-bold text-slate-900">
                    {property.landlordTrust?.score || 0}/100
                  </p>
                  <p className="text-[11px] text-slate-500">Trust Score</p>
                </div>
                <div>
                  <p className="font-mono tabular-nums font-bold text-slate-900">
                    {property.landlordTrust?.completedRentals || 0}
                  </p>
                  <p className="text-[11px] text-slate-500">Rentals</p>
                </div>
                <div>
                  <p className="font-mono tabular-nums font-bold text-slate-900">
                    {property.landlordTrust?.averageRating || '—'}
                  </p>
                  <p className="text-[11px] text-slate-500">Avg Rating</p>
                </div>
              </div>
            </div>

            {/* Rental Request Form */}
            <form
              onSubmit={handleRentalRequest}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-slate-900">
                Send Rental Request
              </h2>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="req-date">
                  Preferred Move-In Date
                </label>
                <input
                  id="req-date"
                  type="date"
                  required
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="req-dur">
                  Stay Duration (Months)
                </label>
                <input
                  id="req-dur"
                  type="number"
                  min={1}
                  max={36}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="req-msg">
                  Introduction Message
                </label>
                <textarea
                  id="req-msg"
                  rows={3}
                  required
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder="Share your university/workplace and preferred move-in plan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReq}
                className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {submittingReq ? 'Sending...' : user ? 'Submit Rental Request' : 'Sign In to Request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
