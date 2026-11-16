-- RentShare BD - Normalized MySQL 8.0 Database Schema
-- Charset & Foreign Key Enforcement

CREATE DATABASE IF NOT EXISTS rentshare_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rentshare_bd;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('tenant', 'landlord', 'admin') NOT NULL DEFAULT 'tenant',
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) DEFAULT '',
  avatar_url TEXT,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  phone_verified TINYINT(1) NOT NULL DEFAULT 0,
  identity_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_suspended TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  gender VARCHAR(30) DEFAULT '',
  occupation VARCHAR(100) DEFAULT 'Student',
  institution_or_workplace VARCHAR(150) DEFAULT '',
  preferred_location VARCHAR(100) DEFAULT 'Mirpur',
  monthly_budget INT NOT NULL DEFAULT 9000,
  move_in_date DATE NULL,
  preferred_room_type VARCHAR(50) DEFAULT 'Shared Room',
  bio TEXT,
  completed_rentals INT NOT NULL DEFAULT 0,
  cancellations INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS landlord_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  address VARCHAR(255) DEFAULT '',
  verification_status ENUM('unverified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unverified',
  nid_last4 VARCHAR(10) DEFAULT '',
  completed_rentals INT NOT NULL DEFAULT 0,
  cancellations INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  monthly_budget INT NOT NULL DEFAULT 9000,
  preferred_location VARCHAR(100) NOT NULL DEFAULT 'Mirpur',
  sleep_schedule ENUM('early_bird', 'moderate', 'night_owl') NOT NULL DEFAULT 'moderate',
  wake_schedule VARCHAR(50) NOT NULL DEFAULT '07:30 AM',
  smoking_preference ENUM('non_smoker', 'outside_only', 'smoker') NOT NULL DEFAULT 'non_smoker',
  cooking_habits ENUM('daily_cook', 'occasional', 'rarely_order_out') NOT NULL DEFAULT 'occasional',
  cleanliness_level INT NOT NULL DEFAULT 4,
  noise_preference ENUM('quiet', 'moderate', 'lively') NOT NULL DEFAULT 'quiet',
  study_work_schedule VARCHAR(100) DEFAULT '9 AM - 5 PM',
  guest_preference ENUM('no_guests', 'occasional_daytime', 'flexible') NOT NULL DEFAULT 'occasional_daytime',
  sharing_preference VARCHAR(100) DEFAULT 'Open to sharing kitchen & utilities',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landlord_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  area VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL DEFAULT 23.8103,
  longitude DECIMAL(10, 7) NOT NULL DEFAULT 90.4125,
  room_type VARCHAR(50) NOT NULL DEFAULT 'Single Room',
  total_rooms INT NOT NULL DEFAULT 3,
  furnished TINYINT(1) NOT NULL DEFAULT 1,
  attached_bath TINYINT(1) NOT NULL DEFAULT 0,
  has_balcony TINYINT(1) NOT NULL DEFAULT 1,
  has_wifi TINYINT(1) NOT NULL DEFAULT 1,
  has_parking TINYINT(1) NOT NULL DEFAULT 0,
  has_generator TINYINT(1) NOT NULL DEFAULT 1,
  monthly_rent INT NOT NULL,
  advance_amount INT NOT NULL DEFAULT 0,
  service_charge INT NOT NULL DEFAULT 0,
  estimated_electricity INT NOT NULL DEFAULT 0,
  estimated_water INT NOT NULL DEFAULT 0,
  estimated_gas INT NOT NULL DEFAULT 0,
  estimated_internet INT NOT NULL DEFAULT 0,
  other_recurring_charges INT NOT NULL DEFAULT 0,
  available_from DATE NOT NULL,
  availability_status ENUM('available', 'occupied', 'pending_verification', 'suspended') NOT NULL DEFAULT 'available',
  verification_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  is_suspicious TINYINT(1) NOT NULL DEFAULT 0,
  suspicious_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_properties_area (area),
  INDEX idx_properties_rent (monthly_rent),
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  room_label VARCHAR(100) NOT NULL,
  room_type VARCHAR(50) NOT NULL DEFAULT 'Single Seat',
  monthly_rent INT NOT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  available_from DATE NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  image_url TEXT NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_facilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  facility_name VARCHAR(80) NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_saved (user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  target_user_id INT NOT NULL,
  computed_score INT NOT NULL,
  summary_json TEXT,
  computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pair (user_id, target_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rental_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  room_id INT NULL,
  tenant_id INT NOT NULL,
  move_in_date DATE NOT NULL,
  duration_months INT NOT NULL DEFAULT 12,
  message TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rental_agreements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  tenant_id INT NOT NULL,
  landlord_id INT NOT NULL,
  monthly_rent INT NOT NULL,
  advance_amount INT NOT NULL,
  duration_months INT NOT NULL DEFAULT 12,
  notice_period_days INT NOT NULL DEFAULT 30,
  utility_terms TEXT NOT NULL,
  house_rules TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tenant_accepted TINYINT(1) NOT NULL DEFAULT 0,
  tenant_accepted_at DATETIME NULL,
  landlord_accepted TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('draft', 'pending_tenant', 'active', 'expired', 'terminated') NOT NULL DEFAULT 'pending_tenant',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  property_id INT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_group_member (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NULL,
  sender_id INT NOT NULL,
  receiver_id INT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_group (group_id),
  INDEX idx_messages_dm (sender_id, receiver_id),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  paid_by_user_id INT NOT NULL,
  category VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  split_type ENUM('equal', 'custom', 'percentage') NOT NULL DEFAULT 'equal',
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_splits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  share_amount DECIMAL(12, 2) NOT NULL,
  is_settled TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash / Manual',
  reference_note VARCHAR(255) DEFAULT '',
  settled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS utility_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  bill_name VARCHAR(150) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  billing_period VARCHAR(50) NOT NULL,
  assigned_user_ids TEXT NOT NULL,
  auto_pay_enabled TINYINT(1) NOT NULL DEFAULT 0,
  auto_pay_provider VARCHAR(40) DEFAULT '',
  paid_at DATETIME NULL,
  receipt_url TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  paid_by_user_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Manual',
  transaction_ref VARCHAR(120) DEFAULT '',
  status ENUM('pending', 'recorded', 'failed') NOT NULL DEFAULT 'recorded',
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES utility_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  week_label VARCHAR(80) NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_plan_id INT NOT NULL,
  day_of_week ENUM('Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
  meal_slot ENUM('Breakfast', 'Lunch', 'Dinner') NOT NULL,
  meal_name VARCHAR(150) NOT NULL,
  description TEXT,
  votes INT NOT NULL DEFAULT 0,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_item_id INT NOT NULL,
  user_id INT NOT NULL,
  voted TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_meal_part (meal_item_id, user_id),
  FOREIGN KEY (meal_item_id) REFERENCES meal_items(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grocery_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  synced_expense_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grocery_list_id INT NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  quantity VARCHAR(60) NOT NULL,
  estimated_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  assigned_to_user_id INT NULL,
  is_purchased TINYINT(1) NOT NULL DEFAULT 0,
  purchased_by_user_id INT NULL,
  FOREIGN KEY (grocery_list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  tenant_id INT NOT NULL,
  landlord_id INT NOT NULL,
  category VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  status ENUM('Submitted', 'Assigned', 'In Progress', 'Completed', 'Rejected') NOT NULL DEFAULT 'Submitted',
  landlord_response TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  landlord_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  target_user_id INT NULL,
  property_id INT NULL,
  reason VARCHAR(150) NOT NULL,
  details TEXT NOT NULL,
  status ENUM('open', 'investigating', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  verification_type ENUM('email', 'phone', 'student_id', 'nid', 'landlord_id', 'property_doc') NOT NULL,
  document_ref VARCHAR(150) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  link_path VARCHAR(180) DEFAULT '',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
