import bcrypt from 'bcryptjs';
import type { DbClient } from './client';

export async function seedDatabaseIfEmpty(db: DbClient): Promise<void> {
  const existing = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM users');
  if (existing && Number(existing.cnt) > 0) return;

  console.log('[DB] Seeding RentShare BD demonstration dataset...');
  const demoPass = await bcrypt.hash('Demo1234!', 10);

  // 1. Seed Users (Tenants, Landlords, Admin)
  const simiRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'tenant', ?, ?, ?, 1, 1, 1)`,
    ['simi@rentshare.bd', demoPass, 'Simi Akter (Demo)', '+8801711000101', '']
  );
  const simiId = simiRes.insertId;

  const rahimRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'tenant', ?, ?, ?, 1, 1, 1)`,
    ['rahim@rentshare.bd', demoPass, 'Rahim Uddin (Demo)', '+8801711000102', '']
  );
  const rahimId = rahimRes.insertId;

  const tanvirRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'tenant', ?, ?, ?, 1, 1, 0)`,
    ['tanvir@rentshare.bd', demoPass, 'Tanvir Hasan (Demo)', '+8801711000103', '']
  );
  const tanvirId = tanvirRes.insertId;

  const nusratRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'tenant', ?, ?, ?, 1, 0, 1)`,
    ['nusrat@rentshare.bd', demoPass, 'Nusrat Jahan (Demo)', '+8801711000104', '']
  );
  const nusratId = nusratRes.insertId;

  const karimLandlordRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'landlord', ?, ?, ?, 1, 1, 1)`,
    ['karim.landlord@rentshare.bd', demoPass, 'Kamrul Karim (Demo Landlord)', '+8801811000201', '']
  );
  const karimLandlordId = karimLandlordRes.insertId;

  const farhanaLandlordRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'landlord', ?, ?, ?, 1, 1, 0)`,
    ['farhana.landlord@rentshare.bd', demoPass, 'Farhana Begum (Demo Landlord)', '+8801811000202', '']
  );
  const farhanaLandlordId = farhanaLandlordRes.insertId;

  const adminRes = await db.execute(
    `INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, email_verified, phone_verified, identity_verified)
     VALUES (?, ?, 'admin', ?, ?, ?, 1, 1, 1)`,
    ['admin@rentshare.bd', demoPass, 'Platform Admin (Demo)', '+8801911000301', '']
  );
  const adminId = adminRes.insertId;

  // 2. Tenant Profiles & Roommate Preferences
  await db.execute(
    `INSERT INTO tenant_profiles (user_id, gender, occupation, institution_or_workplace, preferred_location, monthly_budget, move_in_date, preferred_room_type, bio, completed_rentals)
     VALUES (?, 'Female', 'CSE Student', 'Daffodil International University', 'Mirpur', 9500, '2026-12-01', 'Single Room', 'Quiet final-year student looking for a clean shared flat near Mirpur 10 metro.', 1)`,
    [simiId]
  );
  await db.execute(
    `INSERT INTO tenant_profiles (user_id, gender, occupation, institution_or_workplace, preferred_location, monthly_budget, move_in_date, preferred_room_type, bio, completed_rentals)
     VALUES (?, 'Male', 'Junior Software Engineer', 'Karwan Bazar Tech Hub', 'Mirpur', 9000, '2026-12-01', 'Single Room', 'Remote-hybrid developer, non-smoker, keeps kitchen tidy and respects quiet study hours.', 2)`,
    [rahimId]
  );
  await db.execute(
    `INSERT INTO tenant_profiles (user_id, gender, occupation, institution_or_workplace, preferred_location, monthly_budget, move_in_date, preferred_room_type, bio, completed_rentals)
     VALUES (?, 'Male', 'BBA Student', 'North South University', 'Bashundhara', 12000, '2026-12-01', 'Single Room', 'Looking for an active shared apartment in Bashundhara R/A Block C or D.', 0)`,
    [tanvirId]
  );
  await db.execute(
    `INSERT INTO tenant_profiles (user_id, gender, occupation, institution_or_workplace, preferred_location, monthly_budget, move_in_date, preferred_room_type, bio, completed_rentals)
     VALUES (?, 'Female', 'UI/UX Designer', 'Banani Studio', 'Dhanmondi', 10500, '2026-12-05', 'Shared Room', 'Clean, creative professional who cooks occasionally and loves calm mornings.', 1)`,
    [nusratId]
  );

  await db.execute(
    `INSERT INTO roommate_preferences (user_id, monthly_budget, preferred_location, sleep_schedule, wake_schedule, smoking_preference, cooking_habits, cleanliness_level, noise_preference, study_work_schedule, guest_preference, sharing_preference)
     VALUES (?, 9500, 'Mirpur', 'moderate', '07:30 AM', 'non_smoker', 'daily_cook', 5, 'quiet', '8:30 AM - 5:00 PM', 'occasional_daytime', 'Share kitchen, Wi-Fi & utilities')`,
    [simiId]
  );
  await db.execute(
    `INSERT INTO roommate_preferences (user_id, monthly_budget, preferred_location, sleep_schedule, wake_schedule, smoking_preference, cooking_habits, cleanliness_level, noise_preference, study_work_schedule, guest_preference, sharing_preference)
     VALUES (?, 9000, 'Mirpur', 'moderate', '08:00 AM', 'non_smoker', 'occasional', 4, 'quiet', '9:30 AM - 6:30 PM', 'occasional_daytime', 'Share bills, groceries & weekly meals')`,
    [rahimId]
  );
  await db.execute(
    `INSERT INTO roommate_preferences (user_id, monthly_budget, preferred_location, sleep_schedule, wake_schedule, smoking_preference, cooking_habits, cleanliness_level, noise_preference, study_work_schedule, guest_preference, sharing_preference)
     VALUES (?, 12000, 'Bashundhara', 'night_owl', '09:30 AM', 'outside_only', 'rarely_order_out', 3, 'lively', '11:00 AM - 7:00 PM', 'flexible', 'Share rent & internet')`,
    [tanvirId]
  );
  await db.execute(
    `INSERT INTO roommate_preferences (user_id, monthly_budget, preferred_location, sleep_schedule, wake_schedule, smoking_preference, cooking_habits, cleanliness_level, noise_preference, study_work_schedule, guest_preference, sharing_preference)
     VALUES (?, 10500, 'Dhanmondi', 'early_bird', '06:45 AM', 'non_smoker', 'daily_cook', 5, 'quiet', '9:00 AM - 5:30 PM', 'no_guests', 'Share kitchen & cleaning')`,
    [nusratId]
  );

  // 3. Landlord Profiles
  await db.execute(
    `INSERT INTO landlord_profiles (user_id, address, verification_status, nid_last4, completed_rentals)
     VALUES (?, 'House 14, Road 4, Mirpur 10, Dhaka', 'verified', '4821', 4)`,
    [karimLandlordId]
  );
  await db.execute(
    `INSERT INTO landlord_profiles (user_id, address, verification_status, nid_last4, completed_rentals)
     VALUES (?, 'Sector 11, Road 9, Uttara, Dhaka', 'pending', '9104', 0)`,
    [farhanaLandlordId]
  );

  // 4. Properties (Verified & Realistic Dhaka listings + 1 Flagged Suspicious Listing for Admin Review)
  const p1 = await db.execute(
    `INSERT INTO properties (landlord_id, title, description, area, address, latitude, longitude, room_type, total_rooms, furnished, attached_bath, has_balcony, has_wifi, has_parking, has_generator, monthly_rent, advance_amount, service_charge, estimated_electricity, estimated_water, estimated_gas, estimated_internet, other_recurring_charges, available_from, availability_status, verification_status, is_suspicious)
     VALUES (?, ?, ?, 'Mirpur', ?, 23.8069, 90.3687, 'Single Room', 3, 1, 1, 1, 1, 1, 1, 7000, 14000, 500, 1000, 200, 300, 500, 0, '2026-12-01', 'available', 'approved', 0)`,
    [
      karimLandlordId,
      'Sunlit 3-Room Shared Flat near Mirpur 10 Metro',
      'Bright 4th-floor shared apartment just 4 minutes walk from Mirpur 10 Metro Station. Ideal for university students and young professionals. Includes backup generator, high-speed fiber Wi-Fi, filtered water, and dedicated study desk.',
      'Flat 4B, House 14, Block C, Mirpur 10, Dhaka',
    ]
  );

  const p2 = await db.execute(
    `INSERT INTO properties (landlord_id, title, description, area, address, latitude, longitude, room_type, total_rooms, furnished, attached_bath, has_balcony, has_wifi, has_parking, has_generator, monthly_rent, advance_amount, service_charge, estimated_electricity, estimated_water, estimated_gas, estimated_internet, other_recurring_charges, available_from, availability_status, verification_status, is_suspicious)
     VALUES (?, ?, ?, 'Uttara', ?, 23.8759, 90.3795, 'Single Room', 4, 1, 1, 1, 1, 1, 1, 9500, 19000, 800, 1200, 250, 350, 500, 0, '2026-12-01', 'available', 'approved', 0)`,
    [
      karimLandlordId,
      'Modern Lake-View Shared Apartment in Uttara Sector 11',
      'Spacious shared living in a quiet residential block of Uttara Sector 11. Features tiled lounge, large shared dining space, lift, 24/7 security guard, and full kitchen access.',
      'House 22, Road 9, Sector 11, Uttara, Dhaka',
    ]
  );

  const p3 = await db.execute(
    `INSERT INTO properties (landlord_id, title, description, area, address, latitude, longitude, room_type, total_rooms, furnished, attached_bath, has_balcony, has_wifi, has_parking, has_generator, monthly_rent, advance_amount, service_charge, estimated_electricity, estimated_water, estimated_gas, estimated_internet, other_recurring_charges, available_from, availability_status, verification_status, is_suspicious)
     VALUES (?, ?, ?, 'Dhanmondi', ?, 23.7461, 90.3742, 'Shared Room', 3, 1, 0, 1, 1, 0, 1, 8200, 16400, 600, 1100, 200, 300, 500, 100, '2026-12-05', 'available', 'approved', 0)`,
    [
      karimLandlordId,
      'Cozy Student Seat & Study Flat near Dhanmondi 15',
      'Walking distance to Dhanmondi Lake, Star Kabab, and major private universities. Furnished with wooden wardrobe, single bed, study lamp, and dependable line gas.',
      'Apt 3A, Road 15/A, Dhanmondi, Dhaka',
    ]
  );

  const p4 = await db.execute(
    `INSERT INTO properties (landlord_id, title, description, area, address, latitude, longitude, room_type, total_rooms, furnished, attached_bath, has_balcony, has_wifi, has_parking, has_generator, monthly_rent, advance_amount, service_charge, estimated_electricity, estimated_water, estimated_gas, estimated_internet, other_recurring_charges, available_from, availability_status, verification_status, is_suspicious)
     VALUES (?, ?, ?, 'Bashundhara', ?, 23.8191, 90.4526, 'Master Suite', 3, 1, 1, 1, 1, 1, 1, 11500, 23000, 1000, 1400, 300, 400, 600, 0, '2026-12-01', 'available', 'approved', 0)`,
    [
      karimLandlordId,
      'Executive Shared Suite near NSU & IUB, Bashundhara R/A',
      'Contemporary apartment in Block C Bashundhara R/A with open kitchen bar, inverter AC readiness, 24/7 generator backup, and gated security.',
      'Plot 112, Block C, Bashundhara R/A, Dhaka',
    ]
  );

  const p5 = await db.execute(
    `INSERT INTO properties (landlord_id, title, description, area, address, latitude, longitude, room_type, total_rooms, furnished, attached_bath, has_balcony, has_wifi, has_parking, has_generator, monthly_rent, advance_amount, service_charge, estimated_electricity, estimated_water, estimated_gas, estimated_internet, other_recurring_charges, available_from, availability_status, verification_status, is_suspicious, suspicious_reason)
     VALUES (?, ?, ?, 'Mohammadpur', ?, 23.7654, 90.3588, 'Single Room', 2, 0, 0, 0, 1, 0, 0, 3200, 28000, 300, 700, 150, 250, 400, 0, '2026-11-20', 'pending_verification', 'pending', 1, ?)`,
    [
      farhanaLandlordId,
      'Urgent Cheap Room in Mohammadpur Tajmahal Road',
      'Very low monthly rent for quick booking. Must pay 8 months advance deposit immediately before viewing.',
      'House 8, Tajmahal Road, Mohammadpur, Dhaka',
      'Listed rent (৳3,200) is significantly below area median and demands excessive advance (৳28,000, >4x rent) from an unverified landlord.',
    ]
  );

  // Property Images (using our generated local images)
  const imgs: Array<[number, string, number]> = [
    [p1.insertId, '/src/assets/images/property_mirpur_studio_1794759566369.jpg', 1],
    [p1.insertId, '/src/assets/images/hero_dhaka_apartment_1794759566649.jpg', 0],
    [p2.insertId, '/src/assets/images/property_uttara_shared_1794759567665.jpg', 1],
    [p3.insertId, '/src/assets/images/property_dhanmondi_flat_1794759567783.jpg', 1],
    [p4.insertId, '/src/assets/images/property_bashundhara_suite_1794759568185.jpg', 1],
    [p5.insertId, '/src/assets/images/property_mirpur_studio_1794759566369.jpg', 1],
  ];
  for (const [pid, url, primary] of imgs) {
    await db.execute(
      'INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?, ?, ?)',
      [pid, url, primary]
    );
  }

  // Rooms
  await db.execute(
    `INSERT INTO rooms (property_id, room_label, room_type, monthly_rent, is_available, available_from)
     VALUES (?, 'Room A (Balcony Single)', 'Single Room', 7000, 1, '2026-12-01'),
            (?, 'Room B (Study Single)', 'Single Room', 6800, 1, '2026-12-01'),
            (?, 'Room C (Occupied by Simi)', 'Single Room', 7000, 0, '2026-12-01')`,
    [p1.insertId, p1.insertId, p1.insertId]
  );
  await db.execute(
    `INSERT INTO rooms (property_id, room_label, room_type, monthly_rent, is_available, available_from)
     VALUES (?, 'Master Suite', 'Master Suite', 9500, 1, '2026-12-01'),
            (?, 'East Bedroom', 'Single Room', 8800, 1, '2026-12-01')`,
    [p2.insertId, p2.insertId]
  );

  // Facilities
  const facilityMap: Array<[number, string[]]> = [
    [p1.insertId, ['High-Speed Wi-Fi', 'Generator Backup', 'Balcony', 'Attached Bath', 'Water Filter', '24/7 Guard']],
    [p2.insertId, ['High-Speed Wi-Fi', 'Generator Backup', 'Lift', 'Parking', 'Balcony', 'CCTV']],
    [p3.insertId, ['High-Speed Wi-Fi', 'Generator Backup', 'Line Gas', 'Study Desk', 'Balcony']],
    [p4.insertId, ['High-Speed Wi-Fi', 'Generator Backup', 'Parking', 'Attached Bath', 'AC Ready', 'Gated Block']],
  ];
  for (const [pid, facs] of facilityMap) {
    for (const f of facs) {
      await db.execute('INSERT INTO property_facilities (property_id, facility_name) VALUES (?, ?)', [
        pid,
        f,
      ]);
    }
  }

  // Saved property for Simi
  await db.execute('INSERT INTO saved_properties (user_id, property_id) VALUES (?, ?)', [
    simiId,
    p3.insertId,
  ]);

  // 5. Rental Request & Active Rental Agreement
  await db.execute(
    `INSERT INTO rental_requests (property_id, tenant_id, move_in_date, duration_months, message, status)
     VALUES (?, ?, '2026-11-01', 12, 'Interested in Flat 4B Room C for 1 year academic stay.', 'accepted')`,
    [p1.insertId, simiId]
  );
  await db.execute(
    `INSERT INTO rental_requests (property_id, tenant_id, move_in_date, duration_months, message, status)
     VALUES (?, ?, '2026-12-01', 12, 'Software engineer working nearby, clean and non-smoker.', 'pending')`,
    [p2.insertId, rahimId]
  );

  await db.execute(
    `INSERT INTO rental_agreements (property_id, tenant_id, landlord_id, monthly_rent, advance_amount, duration_months, notice_period_days, utility_terms, house_rules, start_date, end_date, tenant_accepted, tenant_accepted_at, landlord_accepted, status)
     VALUES (?, ?, ?, 7000, 14000, 12, 30, 'DESCO electricity, Titas gas, WASA water, and fiber Wi-Fi split equally among active flatmates.', 'No indoor smoking. Quiet hours after 11:00 PM. Guests require prior flatmate notice.', '2026-11-01', '2027-10-31', 1, '2026-10-25 14:00:00', 1, 'active')`,
    [p1.insertId, simiId, karimLandlordId]
  );

  // 6. Roommate Group: "Flat 4B - Roommate Group"
  const grpRes = await db.execute(
    `INSERT INTO roommate_groups (name, property_id, created_by) VALUES (?, ?, ?)`,
    ['Flat 4B - Roommate Group', p1.insertId, simiId]
  );
  const groupId = grpRes.insertId;

  await db.execute(
    `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin'), (?, ?, 'member'), (?, ?, 'member')`,
    [groupId, simiId, groupId, rahimId, groupId, nusratId]
  );

  // Roommate Request
  await db.execute(
    `INSERT INTO roommate_requests (sender_id, receiver_id, message, status)
     VALUES (?, ?, 'Hey! Our Mirpur compatibility score is 92%. Would love to share Flat 4B.', 'accepted')`,
    [rahimId, simiId]
  );
  await db.execute(
    `INSERT INTO roommate_requests (sender_id, receiver_id, message, status)
     VALUES (?, ?, 'Hi Simi, noticed we both prefer quiet clean flats in Dhaka.', 'pending')`,
    [tanvirId, simiId]
  );

  // 7. Chat Messages (Group + Private)
  await db.execute(
    `INSERT INTO messages (group_id, sender_id, content, is_read, created_at) VALUES
     (?, ?, 'Assalamu Alaikum everyone! Welcome to Flat 4B group chat.', 1, '2026-11-12 09:30:00'),
     (?, ?, 'Walaikum Assalam! I paid the DESCO electricity bill for November.', 1, '2026-11-12 10:15:00'),
     (?, ?, 'Thanks Rahim! Let us update the Saturday meal plan and grocery list tonight.', 1, '2026-11-13 18:45:00')`,
    [groupId, simiId, groupId, rahimId, groupId, nusratId]
  );

  await db.execute(
    `INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at) VALUES
     (?, ?, 'Hello Kamrul bhai, the bathroom tap in Flat 4B is dripping slightly.', 1, '2026-11-14 11:00:00'),
     (?, ?, 'Noted Simi, I have assigned a plumber for tomorrow afternoon.', 1, '2026-11-14 11:25:00')`,
    [simiId, karimLandlordId, karimLandlordId, simiId]
  );

  // 8. Expenses & Splits (Current Month + Last Month for AI Financial Assistant real data!)
  const exp1 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'House rent', 'November Flat 4B Rent', 21000, 'equal', '2026-11-02', 'Paid to Kamrul Karim')`,
    [groupId, simiId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 7000), (?, ?, 7000), (?, ?, 7000)`,
    [exp1.insertId, simiId, exp1.insertId, rahimId, exp1.insertId, nusratId]
  );

  const exp2 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'Electricity', 'DESCO Prepaid Recharge', 3000, 'equal', '2026-11-05', 'Meter #44210')`,
    [groupId, rahimId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 1000), (?, ?, 1000), (?, ?, 1000)`,
    [exp2.insertId, simiId, exp2.insertId, rahimId, exp2.insertId, nusratId]
  );

  const exp3 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'Grocery', 'Weekly Bazar & Rice/Chicken', 2850, 'equal', '2026-11-10', 'Mirpur 10 Kitchen Market')`,
    [groupId, nusratId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 950), (?, ?, 950), (?, ?, 950)`,
    [exp3.insertId, simiId, exp3.insertId, rahimId, exp3.insertId, nusratId]
  );

  const exp4 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'Food', 'Late Night Takeout & Snacks', 1800, 'equal', '2026-11-12', 'Foodpanda group order')`,
    [groupId, simiId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 600), (?, ?, 600), (?, ?, 600)`,
    [exp4.insertId, simiId, exp4.insertId, rahimId, exp4.insertId, nusratId]
  );

  // Previous month expenses (October 2026) for real MoM comparison
  const expPrev1 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'House rent', 'October Flat 4B Rent', 21000, 'equal', '2026-10-02', 'October Rent')`,
    [groupId, simiId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 7000), (?, ?, 7000), (?, ?, 7000)`,
    [expPrev1.insertId, simiId, expPrev1.insertId, rahimId, expPrev1.insertId, nusratId]
  );

  const expPrev2 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'Grocery', 'October Shared Groceries', 2400, 'equal', '2026-10-14', 'October Bazar')`,
    [groupId, rahimId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 800), (?, ?, 800), (?, ?, 800)`,
    [expPrev2.insertId, simiId, expPrev2.insertId, rahimId, expPrev2.insertId, nusratId]
  );

  const expPrev3 = await db.execute(
    `INSERT INTO expenses (group_id, paid_by_user_id, category, title, amount, split_type, expense_date, notes)
     VALUES (?, ?, 'Food', 'October Dining Out', 1200, 'equal', '2026-10-19', 'Group dinner')`,
    [groupId, nusratId]
  );
  await db.execute(
    `INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, 400), (?, ?, 400), (?, ?, 400)`,
    [expPrev3.insertId, simiId, expPrev3.insertId, rahimId, expPrev3.insertId, nusratId]
  );

  // Recorded settlement
  await db.execute(
    `INSERT INTO settlements (group_id, from_user_id, to_user_id, amount, payment_method, reference_note)
     VALUES (?, ?, ?, 5000, 'bKash (Manual Ref)', 'TRX992817A')`,
    [groupId, rahimId, simiId]
  );

  // 9. Utility Bills (Upcoming, Due soon, Overdue, Paid)
  await db.execute(
    `INSERT INTO utility_bills (group_id, category, bill_name, amount, due_date, billing_period, assigned_user_ids, auto_pay_enabled, auto_pay_provider, paid_at)
     VALUES
     (?, 'Internet', 'Link3 Fiber 50Mbps', 1500, '2026-11-16', 'Nov 2026', ?, 0, 'bKash', NULL),
     (?, 'Gas', 'Titas Gas Monthly Bill', 1080, '2026-11-18', 'Nov 2026', ?, 0, 'Nagad', NULL),
     (?, 'Water', 'Dhaka WASA Bill', 750, '2026-11-12', 'Nov 2026', ?, 0, '', NULL),
     (?, 'Electricity', 'DESCO Electricity Bill', 3000, '2026-11-05', 'Nov 2026', ?, 0, 'bKash', '2026-11-05 14:20:00')`,
    [
      groupId,
      JSON.stringify([simiId, rahimId, nusratId]),
      groupId,
      JSON.stringify([simiId, rahimId, nusratId]),
      groupId,
      JSON.stringify([simiId, rahimId, nusratId]),
      groupId,
      JSON.stringify([simiId, rahimId, nusratId]),
    ]
  );

  // 10. Weekly Meal Plan
  const mealPlanRes = await db.execute(
    `INSERT INTO meal_plans (group_id, week_label, created_by) VALUES (?, 'Week of Nov 14 - Nov 20, 2026', ?)`,
    [groupId, simiId]
  );
  const mealPlanId = mealPlanRes.insertId;

  const meals: Array<[string, string, string, string, number]> = [
    ['Saturday', 'Breakfast', 'Paratha and Egg', 'Aloo bhaji + fried egg + milk tea', 3],
    ['Saturday', 'Lunch', 'Rice and Chicken Curry', 'Steamed miniket rice, deshi chicken curry & dal', 3],
    ['Saturday', 'Dinner', 'Bhuna Khichuri', 'Moong dal khichuri with begun bhaja & achar', 2],
    ['Sunday', 'Breakfast', 'Bread and Omelette', 'Toasted bread, masala omelette & banana', 2],
    ['Sunday', 'Lunch', 'Rice and Rui Fish', 'Rui fish dopeyaja, shak & thick dal', 3],
    ['Sunday', 'Dinner', 'Rice and Mixed Vegetables', 'Seasonal labra, egg bhorta & rice', 2],
    ['Monday', 'Breakfast', 'Oats & Banana', 'Quick morning oats with honey', 2],
    ['Monday', 'Lunch', 'Chicken Tehari', 'Light home-style tehari with cucumber salad', 3],
    ['Tuesday', 'Dinner', 'Ruti & Beef Bhuna', 'Whole wheat ruti with spicy beef bhuna', 3],
    ['Wednesday', 'Lunch', 'Rice, Egg Curry & Dal', 'Budget mid-week homestyle lunch', 2],
    ['Thursday', 'Dinner', 'Fried Rice & Chili Chicken', 'Thursday night group special', 3],
    ['Friday', 'Lunch', 'Kacchi / Polao Feast', 'Friday Jummah special chicken roast & polao', 3],
  ];
  for (const [day, slot, name, desc, votes] of meals) {
    await db.execute(
      `INSERT INTO meal_items (meal_plan_id, day_of_week, meal_slot, meal_name, description, votes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mealPlanId, day, slot, name, desc, votes]
    );
  }

  // 11. Grocery List & Items
  const glistRes = await db.execute(
    `INSERT INTO grocery_lists (group_id, title) VALUES (?, 'Weekly Bazar - Nov Week 3')`,
    [groupId]
  );
  const glistId = glistRes.insertId;

  await db.execute(
    `INSERT INTO grocery_items (grocery_list_id, item_name, quantity, estimated_price, assigned_to_user_id, is_purchased)
     VALUES
     (?, 'Miniket Rice', '5 kg', 420, ?, 1),
     (?, 'Broiler Chicken', '3 kg', 660, ?, 1),
     (?, 'Farm Eggs', '30 pieces', 390, ?, 1),
     (?, 'Seasonal Vegetables', '5 kg', 480, ?, 0),
     (?, 'Soybean Oil & Spices', '2 L + pack', 900, ?, 0)`,
    [glistId, rahimId, glistId, rahimId, glistId, nusratId, glistId, simiId, glistId, simiId]
  );

  // 12. Maintenance Requests
  await db.execute(
    `INSERT INTO maintenance_requests (property_id, tenant_id, landlord_id, category, title, description, priority, status, landlord_response)
     VALUES (?, ?, ?, 'Plumbing', 'Dripping basin tap in Bathroom 2', 'Cold water tap handle keeps dripping even when fully shut.', 'Medium', 'Assigned', 'Plumber scheduled for tomorrow at 3 PM.')`,
    [p1.insertId, simiId, karimLandlordId]
  );

  // 13. Reviews, Verification Records, Complaints, Notifications
  await db.execute(
    `INSERT INTO reviews (property_id, reviewer_id, landlord_id, rating, comment)
     VALUES (?, ?, ?, 5, 'Very responsive landlord, clean flat, and transparent utility billing.')`,
    [p1.insertId, simiId, karimLandlordId]
  );

  await db.execute(
    `INSERT INTO verification_records (user_id, verification_type, document_ref, status, reviewed_by, notes)
     VALUES
     (?, 'student_id', 'DIU-241-35-381', 'approved', ?, 'Student ID verified'),
     (?, 'landlord_id', 'NID-****-4821', 'approved', ?, 'Landlord NID & deed verified'),
     (?, 'nid', 'NID-****-9104', 'pending', NULL, 'Awaiting admin review')`,
    [simiId, adminId, karimLandlordId, adminId, farhanaLandlordId]
  );

  await db.execute(
    `INSERT INTO complaints (reporter_id, target_user_id, property_id, reason, details, status)
     VALUES (?, ?, ?, 'Excessive advance deposit & suspicious low rent', 'Landlord asked for 8 months advance before showing the room.', 'open')`,
    [tanvirId, farhanaLandlordId, p5.insertId]
  );

  await db.execute(
    `INSERT INTO notifications (user_id, type, title, message, link_path)
     VALUES
     (?, 'utility', 'Internet bill due tomorrow', 'Link3 Fiber 50Mbps (৳1,500) is due on 2026-11-16.', '/tenant/utilities'),
     (?, 'roommate', 'New roommate request', 'Tanvir Hasan sent you a roommate connection request.', '/tenant/matches'),
     (?, 'maintenance', 'Maintenance status updated', 'Kamrul Karim assigned a plumber for your basin tap issue.', '/tenant/maintenance')`,
    [simiId, simiId, simiId]
  );
}
