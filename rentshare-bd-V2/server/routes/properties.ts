import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { optionalAuth, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth';
import {
  calculateTotalMonthlyCost,
  calculateHaversineDistanceKm,
  estimateDhakaTransitCost,
} from '../../src/utils/domainLogic';
import { evaluatePropertyScamRisk, getUserTrustSummary } from '../services/trustAndScamService';

const router = Router();

const DHAKA_LANDMARKS = [
  { name: 'Dhaka University (TSC)', type: 'University', lat: 23.7336, lng: 90.3955 },
  { name: 'BUET Campus', type: 'University', lat: 23.7266, lng: 90.3927 },
  { name: 'North South University (NSU)', type: 'University', lat: 23.8151, lng: 90.4255 },
  { name: 'Daffodil Smart City / Dhanmondi Hub', type: 'University', lat: 23.7549, lng: 90.3764 },
  { name: 'Mirpur 10 Metro Station', type: 'Bus & Metro Stop', lat: 23.8069, lng: 90.3687 },
  { name: 'Farmgate / Karwan Bazar Tech Hub', type: 'Workplace', lat: 23.7561, lng: 90.3872 },
  { name: 'Square Hospital Panthapath', type: 'Hospital', lat: 23.7529, lng: 90.3816 },
  { name: 'Labaid Specialized Hospital', type: 'Hospital', lat: 23.7418, lng: 90.3831 },
  { name: 'Lazz Pharma Dhanmondi', type: 'Pharmacy', lat: 23.7458, lng: 90.3738 },
  { name: 'Shwapno Super Shop Mirpur', type: 'Supermarket', lat: 23.8045, lng: 90.3698 },
  { name: 'Dutch-Bangla ATM Booth', type: 'ATM', lat: 23.8075, lng: 90.3679 },
  { name: 'Uttara North Metro & Bus Hub', type: 'Bus & Metro Stop', lat: 23.8691, lng: 90.3671 },
];

router.get('/', optionalAuth, async (req: AuthedRequest, res) => {
  const {
    location,
    minBudget,
    maxBudget,
    roomType,
    rooms,
    furnished,
    availableFrom,
    attachedBath,
    balcony,
    wifi,
    parking,
    generator,
    includePending,
  } = req.query;

  const where: string[] = [];
  const params: any[] = [];

  if (includePending !== 'true' || req.user?.role !== 'admin') {
    where.push("p.verification_status = 'approved'");
  }

  if (location && String(location).trim()) {
    where.push('(LOWER(p.area) LIKE ? OR LOWER(p.address) LIKE ? OR LOWER(p.title) LIKE ?)');
    const q = `%${String(location).trim().toLowerCase()}%`;
    params.push(q, q, q);
  }
  if (minBudget) {
    where.push('p.monthly_rent >= ?');
    params.push(Number(minBudget));
  }
  if (maxBudget) {
    where.push('p.monthly_rent <= ?');
    params.push(Number(maxBudget));
  }
  if (roomType && String(roomType) !== 'All') {
    where.push('p.room_type = ?');
    params.push(String(roomType));
  }
  if (rooms) {
    where.push('p.total_rooms >= ?');
    params.push(Number(rooms));
  }
  if (furnished === 'true') where.push('p.furnished = 1');
  if (furnished === 'false') where.push('p.furnished = 0');
  if (availableFrom) {
    where.push('p.available_from <= ?');
    params.push(String(availableFrom));
  }
  if (attachedBath === 'true') where.push('p.attached_bath = 1');
  if (balcony === 'true') where.push('p.has_balcony = 1');
  if (wifi === 'true') where.push('p.has_wifi = 1');
  if (parking === 'true') where.push('p.has_parking = 1');
  if (generator === 'true') where.push('p.has_generator = 1');

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await db.query<any>(
    `SELECT p.*, u.full_name AS landlord_name, u.identity_verified AS landlord_verified,
      (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS primary_image,
      (SELECT AVG(rating) FROM reviews r WHERE r.property_id = p.id) AS avg_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.property_id = p.id) AS review_count
     FROM properties p
     JOIN users u ON u.id = p.landlord_id
     ${whereSql}
     ORDER BY p.created_at DESC`,
    params
  );

  let savedIds = new Set<number>();
  if (req.user) {
    const saved = await db.query<{ property_id: number }>(
      'SELECT property_id FROM saved_properties WHERE user_id = ?',
      [req.user.userId]
    );
    savedIds = new Set(saved.map((s) => s.property_id));
  }

  const enriched = rows.map((p) => ({
    ...p,
    costBreakdown: calculateTotalMonthlyCost(p),
    is_saved: savedIds.has(p.id),
    avg_rating: p.avg_rating ? Math.round(Number(p.avg_rating) * 10) / 10 : 0,
  }));

  res.json({ properties: enriched });
});

router.get('/saved', requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db.query<any>(
    `SELECT p.*, u.full_name AS landlord_name, u.identity_verified AS landlord_verified,
      (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS primary_image
     FROM saved_properties sp
     JOIN properties p ON p.id = sp.property_id
     JOIN users u ON u.id = p.landlord_id
     WHERE sp.user_id = ?
     ORDER BY sp.created_at DESC`,
    [req.user!.userId]
  );
  res.json({
    properties: rows.map((p) => ({ ...p, costBreakdown: calculateTotalMonthlyCost(p) })),
  });
});

router.get('/mine', requireAuth, requireRole('landlord'), async (req: AuthedRequest, res) => {
  const rows = await db.query<any>(
    `SELECT p.*,
      (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS primary_image,
      (SELECT COUNT(*) FROM rental_requests rr WHERE rr.property_id = p.id AND rr.status = 'pending') AS pending_requests
     FROM properties p
     WHERE p.landlord_id = ?
     ORDER BY p.created_at DESC`,
    [req.user!.userId]
  );
  res.json({
    properties: rows.map((p) => ({ ...p, costBreakdown: calculateTotalMonthlyCost(p) })),
  });
});

router.get('/:id', optionalAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const prop = await db.queryOne<any>(
    `SELECT p.*, u.full_name AS landlord_name, u.email AS landlord_email, u.phone AS landlord_phone
     FROM properties p
     JOIN users u ON u.id = p.landlord_id
     WHERE p.id = ?`,
    [id]
  );
  if (!prop) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const images = await db.query('SELECT * FROM property_images WHERE property_id = ?', [id]);
  const rooms = await db.query('SELECT * FROM rooms WHERE property_id = ?', [id]);
  const facilities = await db.query<{ facility_name: string }>(
    'SELECT facility_name FROM property_facilities WHERE property_id = ?',
    [id]
  );
  const reviews = await db.query<any>(
    `SELECT r.*, u.full_name AS reviewer_name
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.property_id = ?
     ORDER BY r.created_at DESC`,
    [id]
  );
  const landlordTrust = await getUserTrustSummary(prop.landlord_id);

  let isSaved = false;
  if (req.user) {
    const sp = await db.queryOne(
      'SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?',
      [req.user.userId, id]
    );
    isSaved = Boolean(sp);
  }

  const nearbyLandmarks = DHAKA_LANDMARKS.map((lm) => {
    const distanceKm = calculateHaversineDistanceKm(prop.latitude, prop.longitude, lm.lat, lm.lng);
    return {
      ...lm,
      distanceKm,
      transit: estimateDhakaTransitCost(distanceKm),
    };
  })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 7);

  res.json({
    property: {
      ...prop,
      costBreakdown: calculateTotalMonthlyCost(prop),
      images,
      rooms,
      facilities: facilities.map((f) => f.facility_name),
      reviews,
      landlordTrust,
      isSaved,
      nearbyLandmarks,
    },
  });
});

const propertySchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  area: z.string().min(2),
  address: z.string().min(5),
  latitude: z.number().optional().default(23.8069),
  longitude: z.number().optional().default(90.3687),
  room_type: z.string().default('Single Room'),
  total_rooms: z.number().int().min(1).default(3),
  furnished: z.boolean().default(true),
  attached_bath: z.boolean().default(false),
  has_balcony: z.boolean().default(true),
  has_wifi: z.boolean().default(true),
  has_parking: z.boolean().default(false),
  has_generator: z.boolean().default(true),
  monthly_rent: z.number().min(500),
  advance_amount: z.number().min(0).default(0),
  service_charge: z.number().min(0).default(0),
  estimated_electricity: z.number().min(0).default(0),
  estimated_water: z.number().min(0).default(0),
  estimated_gas: z.number().min(0).default(0),
  estimated_internet: z.number().min(0).default(0),
  other_recurring_charges: z.number().min(0).default(0),
  available_from: z.string().min(4),
  image_url: z.string().optional(),
  facilities: z.array(z.string()).optional().default([]),
  rooms: z
    .array(
      z.object({
        room_label: z.string(),
        room_type: z.string(),
        monthly_rent: z.number(),
        is_available: z.boolean().default(true),
      })
    )
    .optional()
    .default([]),
});

router.post('/', requireAuth, requireRole('landlord', 'admin'), async (req: AuthedRequest, res) => {
  const parsed = propertySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid property fields' });
    return;
  }
  const d = parsed.data;
  const landlordId = req.user!.userId;

  const scamCheck = await evaluatePropertyScamRisk({
    landlordId,
    area: d.area,
    title: d.title,
    description: d.description,
    monthlyRent: d.monthly_rent,
    advanceAmount: d.advance_amount,
  });

  const verificationStatus = scamCheck.suspicious ? 'pending' : 'approved';
  const availabilityStatus = scamCheck.suspicious ? 'pending_verification' : 'available';

  const result = await db.execute(
    `INSERT INTO properties (
      landlord_id, title, description, area, address, latitude, longitude, room_type, total_rooms,
      furnished, attached_bath, has_balcony, has_wifi, has_parking, has_generator,
      monthly_rent, advance_amount, service_charge, estimated_electricity, estimated_water,
      estimated_gas, estimated_internet, other_recurring_charges, available_from,
      availability_status, verification_status, is_suspicious, suspicious_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      landlordId,
      d.title,
      d.description,
      d.area,
      d.address,
      d.latitude,
      d.longitude,
      d.room_type,
      d.total_rooms,
      d.furnished ? 1 : 0,
      d.attached_bath ? 1 : 0,
      d.has_balcony ? 1 : 0,
      d.has_wifi ? 1 : 0,
      d.has_parking ? 1 : 0,
      d.has_generator ? 1 : 0,
      d.monthly_rent,
      d.advance_amount,
      d.service_charge,
      d.estimated_electricity,
      d.estimated_water,
      d.estimated_gas,
      d.estimated_internet,
      d.other_recurring_charges,
      d.available_from,
      availabilityStatus,
      verificationStatus,
      scamCheck.suspicious ? 1 : 0,
      scamCheck.reasons.join('; '),
    ]
  );

  const propertyId = result.insertId;
  const primaryImg = d.image_url || '/src/assets/images/property_mirpur_studio_1794759566369.jpg';
  await db.execute(
    'INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?, ?, 1)',
    [propertyId, primaryImg]
  );

  for (const f of d.facilities) {
    await db.execute('INSERT INTO property_facilities (property_id, facility_name) VALUES (?, ?)', [
      propertyId,
      f,
    ]);
  }

  for (const r of d.rooms) {
    await db.execute(
      'INSERT INTO rooms (property_id, room_label, room_type, monthly_rent, is_available, available_from) VALUES (?, ?, ?, ?, ?, ?)',
      [propertyId, r.room_label, r.room_type, r.monthly_rent, r.is_available ? 1 : 0, d.available_from]
    );
  }

  res.status(201).json({
    id: propertyId,
    scamCheck,
    message: scamCheck.suspicious
      ? 'Listing created and queued for admin safety verification.'
      : 'Property published to marketplace.',
  });
});

router.put('/:id', requireAuth, requireRole('landlord', 'admin'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = await db.queryOne<any>('SELECT * FROM properties WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  if (req.user!.role !== 'admin' && existing.landlord_id !== req.user!.userId) {
    res.status(403).json({ error: 'Not authorized to edit this property' });
    return;
  }

  const b = req.body || {};
  await db.execute(
    `UPDATE properties SET
      title = ?, description = ?, area = ?, address = ?, room_type = ?, total_rooms = ?,
      furnished = ?, attached_bath = ?, has_balcony = ?, has_wifi = ?, has_parking = ?, has_generator = ?,
      monthly_rent = ?, advance_amount = ?, service_charge = ?, estimated_electricity = ?,
      estimated_water = ?, estimated_gas = ?, estimated_internet = ?, other_recurring_charges = ?,
      available_from = ?, availability_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      b.title ?? existing.title,
      b.description ?? existing.description,
      b.area ?? existing.area,
      b.address ?? existing.address,
      b.room_type ?? existing.room_type,
      Number(b.total_rooms ?? existing.total_rooms),
      b.furnished !== undefined ? (b.furnished ? 1 : 0) : existing.furnished,
      b.attached_bath !== undefined ? (b.attached_bath ? 1 : 0) : existing.attached_bath,
      b.has_balcony !== undefined ? (b.has_balcony ? 1 : 0) : existing.has_balcony,
      b.has_wifi !== undefined ? (b.has_wifi ? 1 : 0) : existing.has_wifi,
      b.has_parking !== undefined ? (b.has_parking ? 1 : 0) : existing.has_parking,
      b.has_generator !== undefined ? (b.has_generator ? 1 : 0) : existing.has_generator,
      Number(b.monthly_rent ?? existing.monthly_rent),
      Number(b.advance_amount ?? existing.advance_amount),
      Number(b.service_charge ?? existing.service_charge),
      Number(b.estimated_electricity ?? existing.estimated_electricity),
      Number(b.estimated_water ?? existing.estimated_water),
      Number(b.estimated_gas ?? existing.estimated_gas),
      Number(b.estimated_internet ?? existing.estimated_internet),
      Number(b.other_recurring_charges ?? existing.other_recurring_charges),
      b.available_from ?? existing.available_from,
      b.availability_status ?? existing.availability_status,
      id,
    ]
  );

  if (b.image_url && String(b.image_url).trim()) {
    const cleanUrl = String(b.image_url).trim();
    const existingPrimary = await db.queryOne<{ id: number }>(
      'SELECT id FROM property_images WHERE property_id = ? AND is_primary = 1',
      [id]
    );
    if (existingPrimary) {
      await db.execute('UPDATE property_images SET image_url = ? WHERE id = ?', [
        cleanUrl,
        existingPrimary.id,
      ]);
    } else {
      await db.execute(
        'INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?, ?, 1)',
        [id, cleanUrl]
      );
    }
  }

  res.json({ message: 'Property updated successfully' });
});

router.patch('/:id/rooms/:roomId', requireAuth, requireRole('landlord', 'admin'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const roomId = Number(req.params.roomId);
  const prop = await db.queryOne<any>('SELECT landlord_id FROM properties WHERE id = ?', [id]);
  if (!prop || (req.user!.role !== 'admin' && prop.landlord_id !== req.user!.userId)) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }
  await db.execute('UPDATE rooms SET is_available = ? WHERE id = ? AND property_id = ?', [
    req.body?.is_available ? 1 : 0,
    roomId,
    id,
  ]);
  res.json({ message: 'Room availability updated' });
});

router.post('/:id/rooms', requireAuth, requireRole('landlord', 'admin'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const prop = await db.queryOne<any>('SELECT landlord_id, available_from FROM properties WHERE id = ?', [id]);
  if (!prop || (req.user!.role !== 'admin' && prop.landlord_id !== req.user!.userId)) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }
  const roomLabel = String(req.body?.room_label || '').trim();
  const roomType = String(req.body?.room_type || 'Single Room');
  const monthlyRent = Number(req.body?.monthly_rent);
  if (!roomLabel || !monthlyRent || monthlyRent <= 0) {
    res.status(400).json({ error: 'Room label and positive monthly rent are required' });
    return;
  }
  const result = await db.execute(
    'INSERT INTO rooms (property_id, room_label, room_type, monthly_rent, is_available, available_from) VALUES (?, ?, ?, ?, 1, ?)',
    [id, roomLabel, roomType, monthlyRent, req.body?.available_from || prop.available_from]
  );
  res.status(201).json({ id: result.insertId, message: 'Room added' });
});

router.post('/:id/save', requireAuth, async (req: AuthedRequest, res) => {
  const propertyId = Number(req.params.id);
  const userId = req.user!.userId;
  const existing = await db.queryOne(
    'SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?',
    [userId, propertyId]
  );
  if (existing) {
    await db.execute('DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?', [
      userId,
      propertyId,
    ]);
    res.json({ saved: false });
    return;
  }
  await db.execute('INSERT INTO saved_properties (user_id, property_id) VALUES (?, ?)', [
    userId,
    propertyId,
  ]);
  res.json({ saved: true });
});

router.post('/:id/report', requireAuth, async (req: AuthedRequest, res) => {
  const propertyId = Number(req.params.id);
  const prop = await db.queryOne<any>('SELECT landlord_id FROM properties WHERE id = ?', [propertyId]);
  if (!prop) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  const reason = String(req.body?.reason || '').trim();
  const details = String(req.body?.details || '').trim();
  if (!reason || !details) {
    res.status(400).json({ error: 'Reason and details are required' });
    return;
  }
  await db.execute(
    `INSERT INTO complaints (reporter_id, target_user_id, property_id, reason, details, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    [req.user!.userId, prop.landlord_id, propertyId, reason, details]
  );
  await db.execute(
    `UPDATE properties SET is_suspicious = 1, suspicious_reason = ? WHERE id = ?`,
    [`Reported by user: ${reason}`, propertyId]
  );
  res.status(201).json({ message: 'Report submitted for admin investigation' });
});

export default router;
