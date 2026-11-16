import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, Star } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatBdt, uploadImageFile } from '../../lib/api';
import { downloadAgreementPdf } from '../../utils/pdfGenerator';

export function LandlordDashboardPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<{ properties: any[] }>('/api/properties/mine').then((d) => setProperties(d.properties)).catch(() => {});
    apiFetch<{ requests: any[] }>('/api/rentals/requests').then((d) => setApps(d.requests)).catch(() => {});
    apiFetch<{ requests: any[] }>('/api/living/maintenance').then((d) => setMaintenance(d.requests)).catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Landlord Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Total Properties</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
              {properties.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Pending Applications</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#4F46E5] mt-1">
              {apps.filter((a) => a.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Open Maintenance</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">
              {maintenance.filter((m) => m.status !== 'Completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Landlord Trust Score</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#0D9488] mt-1">
              {user?.trust?.score || 0}/100
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-slate-900">Recent Rental Applications</h2>
            <Link to="/landlord/applications" className="text-xs font-semibold text-[#4F46E5]">
              Manage all
            </Link>
          </div>
          {apps.length === 0 ? (
            <p className="text-sm text-slate-500">No applications yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {apps.slice(0, 5).map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {a.tenant_name} → {a.property_title}
                    </p>
                    <p className="text-xs text-slate-500">Move-in: {a.move_in_date}</p>
                  </div>
                  <span className="text-xs font-semibold capitalize text-slate-700">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export function LandlordPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<{ properties: any[] }>('/api/properties/mine')
      .then((d) => setProperties(d.properties))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout title="My Properties">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link
            to="/landlord/properties/new"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Add Property
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-500">
                  {p.area} · {p.availability_status} · Verification: {p.verification_status}
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-1">{p.title}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{p.address}</p>
                <p className="font-mono tabular-nums text-base font-bold text-[#4F46E5] mt-3">
                  Rent: {formatBdt(p.monthly_rent)}/mo · Total Cost: {formatBdt(p.costBreakdown?.totalMonthlyCost)}/mo
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">{p.pending_requests || 0} pending request(s)</span>
                <div className="flex gap-3">
                  <Link to={`/properties/${p.id}`} className="font-semibold text-slate-700 hover:underline">
                    View
                  </Link>
                  <Link
                    to={`/landlord/properties/${p.id}/edit`}
                    className="font-semibold text-[#4F46E5] hover:underline"
                  >
                    Edit Listing
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AddPropertyPage() {
  const { showToast } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [area, setArea] = useState('Mirpur');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState('Single Room');
  const [totalRooms, setTotalRooms] = useState(3);
  const [monthlyRent, setMonthlyRent] = useState(8000);
  const [advanceAmount, setAdvanceAmount] = useState(16000);
  const [serviceCharge, setServiceCharge] = useState(500);
  const [electricity, setElectricity] = useState(1000);
  const [internet, setInternet] = useState(500);
  const [water, setWater] = useState(200);
  const [gas, setGas] = useState(300);
  const [availableFrom, setAvailableFrom] = useState('2026-12-01');
  const [furnished, setFurnished] = useState(true);
  const [wifi, setWifi] = useState(true);
  const [generator, setGenerator] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImageFile(file, 'rentshare-properties');
      setImageUrl(res.url);
      showToast(
        res.storage === 'cloudinary'
          ? 'Image uploaded to Cloudinary'
          : 'Image saved via local development fallback (/uploads)',
        'success'
      );
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<any>('/api/properties', {
        method: 'POST',
        body: JSON.stringify({
          title,
          area,
          address,
          description,
          room_type: roomType,
          total_rooms: Number(totalRooms),
          monthly_rent: Number(monthlyRent),
          advance_amount: Number(advanceAmount),
          service_charge: Number(serviceCharge),
          estimated_electricity: Number(electricity),
          estimated_internet: Number(internet),
          estimated_water: Number(water),
          estimated_gas: Number(gas),
          available_from: availableFrom,
          furnished,
          has_wifi: wifi,
          has_generator: generator,
          image_url: imageUrl || undefined,
          facilities: [wifi ? 'High-Speed Wi-Fi' : '', generator ? 'Generator Backup' : ''].filter(Boolean),
        }),
      });
      showToast(res.message, 'success');
      navigate('/landlord/properties');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="Add New Property">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Listing Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunlit 3-Room Shared Flat near Mirpur 11"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Area</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {['Mirpur', 'Uttara', 'Dhanmondi', 'Mohammadpur', 'Bashundhara', 'Savar', 'Gazipur'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option>Single Room</option>
              <option>Shared Room</option>
              <option>Master Suite</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Address</label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat, House, Road, Block, Dhaka"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Rent (৳)</label>
            <input
              type="number"
              required
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Advance Deposit (৳)</label>
            <input
              type="number"
              required
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Service Charge (৳)</label>
            <input
              type="number"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Est. Electricity (৳)</label>
            <input
              type="number"
              value={electricity}
              onChange={(e) => setElectricity(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Internet (৳)</label>
            <input
              type="number"
              value={internet}
              onChange={(e) => setInternet(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Water & Gas (৳)</label>
            <input
              type="number"
              value={water + gas}
              onChange={(e) => {
                setWater(Math.round(Number(e.target.value) * 0.4));
                setGas(Math.round(Number(e.target.value) * 0.6));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Total Rooms</label>
            <input
              type="number"
              min={1}
              value={totalRooms}
              onChange={(e) => setTotalRooms(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Available From</label>
            <input
              type="date"
              required
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} />
            <span>Furnished</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={wifi} onChange={(e) => setWifi(e.target.checked)} />
            <span>Wi-Fi Available</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={generator} onChange={(e) => setGenerator(e.target.checked)} />
            <span>Generator Backup</span>
          </label>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="prop-img-upload">
            Property Photo (uses Cloudinary if configured, or local fallback)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="prop-img-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
            />
            {uploadingImage && <span className="text-xs text-slate-500">Uploading...</span>}
            {imageUrl && (
              <span className="text-xs font-mono text-emerald-700 truncate max-w-xs">
                Uploaded: {imageUrl}
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
        >
          Publish Property
        </button>
      </form>
    </DashboardLayout>
  );
}

export function EditPropertyPage() {
  const { id } = useParams();
  const { showToast } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [roomLabel, setRoomLabel] = useState('');
  const [roomType, setRoomType] = useState('Single Room');
  const [roomRent, setRoomRent] = useState('7000');

  const loadProperty = () => {
    apiFetch<{ property: any }>(`/api/properties/${id}`)
      .then((d) => setForm(d.property))
      .catch(() => {});
  };

  useEffect(() => {
    loadProperty();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/properties/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      showToast('Property updated', 'success');
      navigate('/landlord/properties');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const toggleRoomAvailability = async (room: any) => {
    try {
      await apiFetch(`/api/properties/${id}/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !room.is_available }),
      });
      showToast(`${room.room_label} marked ${!room.is_available ? 'available' : 'occupied'}`, 'success');
      loadProperty();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/properties/${id}/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          room_label: roomLabel,
          room_type: roomType,
          monthly_rent: Number(roomRent),
        }),
      });
      setRoomLabel('');
      showToast('Individual room added', 'success');
      loadProperty();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  if (!form) return <DashboardLayout title="Edit Property">Loading...</DashboardLayout>;

  return (
    <DashboardLayout title="Edit Property & Rooms">
      <div className="max-w-3xl space-y-6">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Rent (৳)</label>
              <input
                type="number"
                value={form.monthly_rent}
                onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Availability</label>
              <select
                value={form.availability_status}
                onChange={(e) => setForm({ ...form, availability_status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="edit-prop-img">
              Update Primary Photo (Cloudinary or local fallback)
            </label>
            <input
              id="edit-prop-img"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (ev) => {
                const file = ev.target.files?.[0];
                if (!file) return;
                try {
                  const res = await uploadImageFile(file, 'rentshare-properties');
                  setForm((prev: any) => ({ ...prev, image_url: res.url }));
                  showToast(
                    res.storage === 'cloudinary'
                      ? 'Image uploaded to Cloudinary'
                      : 'Image saved to local /uploads fallback',
                    'success'
                  );
                } catch (err) {
                  showToast((err as Error).message, 'error');
                }
              }}
              className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold"
          >
            Save Changes
          </button>
        </form>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-display font-bold text-slate-900">Individual Rooms & Availability</h2>
          {form.rooms?.length ? (
            <div className="divide-y divide-slate-100">
              {form.rooms.map((r: any) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{r.room_label}</p>
                    <p className="text-xs text-slate-500">
                      {r.room_type} · <span className="font-mono">{formatBdt(r.monthly_rent)}/mo</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRoomAvailability(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      r.is_available
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {r.is_available ? 'Available (Click to Mark Occupied)' : 'Occupied (Click to Reopen)'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No individual rooms added yet.</p>
          )}

          <form onSubmit={addRoom} className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Room Label</label>
              <input
                required
                value={roomLabel}
                onChange={(e) => setRoomLabel(e.target.value)}
                placeholder="e.g. Room C (Balcony)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option>Single Room</option>
                <option>Shared Room</option>
                <option>Master Suite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rent (৳)</label>
              <input
                type="number"
                required
                min={500}
                value={roomRent}
                onChange={(e) => setRoomRent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-sm font-semibold"
            >
              Add Room
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function LandlordApplicationsPage() {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  const load = () => {
    apiFetch<{ requests: any[] }>('/api/rentals/requests')
      .then((d) => setRequests(d.requests))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: number, status: 'accepted' | 'rejected') => {
    try {
      await apiFetch(`/api/rentals/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(
        status === 'accepted'
          ? 'Application accepted! Roommate group & agreement drafted.'
          : 'Application declined.',
        'success'
      );
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="Rental Applications">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No applications received yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((r) => (
              <div key={r.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display font-bold text-slate-900">
                    {r.tenant_name} — {r.property_title}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {r.tenant_email} · Move-in: {r.move_in_date} · {r.duration_months} months
                  </p>
                  <p className="text-sm text-slate-700 mt-1">{r.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold capitalize text-slate-600 mr-2">
                    {r.status}
                  </span>
                  {r.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => decide(r.id, 'accepted')}
                        className="px-3.5 py-2 rounded-lg bg-[#0D9488] text-white text-xs font-semibold"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r.id, 'rejected')}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export function LandlordTenantsPage() {
  const [agreements, setAgreements] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<{ agreements: any[] }>('/api/rentals/agreements')
      .then((d) => setAgreements(d.agreements))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Tenant Management">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="px-5 py-3">Tenant</th>
              <th className="px-5 py-3">Property</th>
              <th className="px-5 py-3 text-right">Monthly Rent</th>
              <th className="px-5 py-3">Term</th>
              <th className="px-5 py-3">Agreement Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agreements.map((ag) => (
              <tr key={ag.id}>
                <td className="px-5 py-3 font-medium text-slate-900">
                  {ag.tenant_name}
                  <span className="block text-xs text-slate-500">{ag.tenant_email}</span>
                </td>
                <td className="px-5 py-3 text-slate-700">{ag.property_title}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">
                  {formatBdt(ag.monthly_rent)}
                </td>
                <td className="px-5 py-3 font-mono text-xs">
                  {ag.start_date} – {ag.end_date}
                </td>
                <td className="px-5 py-3 capitalize font-medium">{ag.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export function LandlordAgreementsPage() {
  const { showToast } = useAuth();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('7000');
  const [advanceAmount, setAdvanceAmount] = useState('14000');
  const [startDate, setStartDate] = useState('2026-12-01');
  const [endDate, setEndDate] = useState('2027-11-30');
  const [utilityTerms, setUtilityTerms] = useState('Electricity, gas, water, and internet bills shared equally among occupants.');
  const [houseRules, setHouseRules] = useState('No smoking indoors. Quiet hours after 11 PM.');

  const load = () => {
    apiFetch<{ agreements: any[] }>('/api/rentals/agreements').then((d) => setAgreements(d.agreements)).catch(() => {});
    apiFetch<{ properties: any[] }>('/api/properties/mine').then((d) => {
      setProperties(d.properties);
      if (!propertyId && d.properties[0]) setPropertyId(String(d.properties[0].id));
    }).catch(() => {});
    apiFetch<{ requests: any[] }>('/api/rentals/requests').then((d) => {
      setRequests(d.requests);
      if (!tenantId && d.requests[0]) setTenantId(String(d.requests[0].tenant_id));
    }).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const createAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/rentals/agreements', {
        method: 'POST',
        body: JSON.stringify({
          property_id: Number(propertyId),
          tenant_id: Number(tenantId),
          monthly_rent: Number(monthlyRent),
          advance_amount: Number(advanceAmount),
          start_date: startDate,
          end_date: endDate,
          utility_terms: utilityTerms,
          house_rules: houseRules,
        }),
      });
      setShowForm(false);
      showToast('Digital agreement created and sent to tenant', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  // Deduplicate known tenants from requests + existing agreements
  const knownTenants = Array.from(
    new Map(
      [...requests, ...agreements].map((item) => [
        item.tenant_id,
        { id: item.tenant_id, name: item.tenant_name, email: item.tenant_email },
      ])
    ).values()
  );

  return (
    <DashboardLayout title="Digital Rental Agreements">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Digital consent agreements (not notarized e-signatures). Tenants review and accept before PDF export.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold shrink-0"
          >
            {showForm ? 'Cancel' : 'Create Agreement'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createAgreement} className="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
            <h2 className="font-display font-bold text-slate-900">Draft New Digital Rental Agreement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Property</label>
                <select
                  required
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tenant</label>
                <select
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="">Select tenant...</option>
                  {knownTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Rent (৳)</label>
                <input
                  type="number"
                  required
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Advance Deposit (৳)</label>
                <input
                  type="number"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Utility Terms</label>
                <input
                  value={utilityTerms}
                  onChange={(e) => setUtilityTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">House Rules</label>
                <input
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#0D9488] text-white text-sm font-semibold"
            >
              Send Agreement to Tenant
            </button>
          </form>
        )}

        {agreements.map((ag) => (
          <div key={ag.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Agreement #{ag.id} · Status: <span className="capitalize font-semibold">{ag.status}</span>
              </p>
              <h2 className="font-display font-bold text-slate-900 mt-0.5">
                {ag.property_title} — {ag.tenant_name}
              </h2>
              <p className="text-xs font-mono text-slate-600 mt-1">
                Rent: {formatBdt(ag.monthly_rent)}/mo · Advance: {formatBdt(ag.advance_amount)} · {ag.start_date} to {ag.end_date}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadAgreementPdf(ag)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

export function LandlordMaintenancePage() {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = () => {
    apiFetch<{ requests: any[] }>('/api/living/maintenance')
      .then((d) => setRequests(d.requests))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/living/maintenance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, landlord_response: notes[id] }),
      });
      showToast(`Ticket updated to ${status}`, 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="Maintenance Management">
      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">
                  {r.property_title} · Reported by {r.tenant_name} · Priority: {r.priority}
                </p>
                <h2 className="font-display font-bold text-slate-900 mt-0.5">{r.title}</h2>
              </div>
              <span className="text-xs font-semibold text-[#4F46E5]">{r.status}</span>
            </div>
            <p className="text-sm text-slate-700">{r.description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <input
                type="text"
                value={notes[r.id] ?? r.landlord_response ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                placeholder="Technician or schedule update..."
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              {['Assigned', 'In Progress', 'Completed', 'Rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => updateStatus(r.id, st)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
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

export function LandlordReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<{ reviews: any[] }>('/api/rentals/reviews')
      .then((d) => setReviews(d.reviews))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Tenant Reviews & Ratings">
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {reviews.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No reviews received yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">
                  {r.reviewer_name} · <span className="text-slate-500 font-normal">{r.property_title}</span>
                </p>
                <span className="font-mono text-xs text-amber-600 inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {r.rating}/5
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{r.comment}</p>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
