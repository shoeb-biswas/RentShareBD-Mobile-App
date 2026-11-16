import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabaseIfEmpty } from './seedData';
import { getAppConfig } from '../config/env';

export interface ExecResult {
  insertId: number;
  affectedRows: number;
}

export interface DbClient {
  driver: 'mysql' | 'sqlite_fallback';
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = Record<string, any>>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<ExecResult>;
  init(): Promise<void>;
}

const SQLITE_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant',
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  avatar_url TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  identity_verified INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  gender TEXT DEFAULT '',
  occupation TEXT DEFAULT 'Student',
  institution_or_workplace TEXT DEFAULT '',
  preferred_location TEXT DEFAULT 'Mirpur',
  monthly_budget INTEGER NOT NULL DEFAULT 9000,
  move_in_date TEXT,
  preferred_room_type TEXT DEFAULT 'Shared Room',
  bio TEXT DEFAULT '',
  completed_rentals INTEGER NOT NULL DEFAULT 0,
  cancellations INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS landlord_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  address TEXT DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  nid_last4 TEXT DEFAULT '',
  completed_rentals INTEGER NOT NULL DEFAULT 0,
  cancellations INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  monthly_budget INTEGER NOT NULL DEFAULT 9000,
  preferred_location TEXT NOT NULL DEFAULT 'Mirpur',
  sleep_schedule TEXT NOT NULL DEFAULT 'moderate',
  wake_schedule TEXT NOT NULL DEFAULT '07:30 AM',
  smoking_preference TEXT NOT NULL DEFAULT 'non_smoker',
  cooking_habits TEXT NOT NULL DEFAULT 'occasional',
  cleanliness_level INTEGER NOT NULL DEFAULT 4,
  noise_preference TEXT NOT NULL DEFAULT 'quiet',
  study_work_schedule TEXT DEFAULT '9 AM - 5 PM',
  guest_preference TEXT NOT NULL DEFAULT 'occasional_daytime',
  sharing_preference TEXT DEFAULT 'Open to sharing kitchen & utilities',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  landlord_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL DEFAULT 23.8103,
  longitude REAL NOT NULL DEFAULT 90.4125,
  room_type TEXT NOT NULL DEFAULT 'Single Room',
  total_rooms INTEGER NOT NULL DEFAULT 3,
  furnished INTEGER NOT NULL DEFAULT 1,
  attached_bath INTEGER NOT NULL DEFAULT 0,
  has_balcony INTEGER NOT NULL DEFAULT 1,
  has_wifi INTEGER NOT NULL DEFAULT 1,
  has_parking INTEGER NOT NULL DEFAULT 0,
  has_generator INTEGER NOT NULL DEFAULT 1,
  monthly_rent INTEGER NOT NULL,
  advance_amount INTEGER NOT NULL DEFAULT 0,
  service_charge INTEGER NOT NULL DEFAULT 0,
  estimated_electricity INTEGER NOT NULL DEFAULT 0,
  estimated_water INTEGER NOT NULL DEFAULT 0,
  estimated_gas INTEGER NOT NULL DEFAULT 0,
  estimated_internet INTEGER NOT NULL DEFAULT 0,
  other_recurring_charges INTEGER NOT NULL DEFAULT 0,
  available_from TEXT NOT NULL,
  availability_status TEXT NOT NULL DEFAULT 'available',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  is_suspicious INTEGER NOT NULL DEFAULT 0,
  suspicious_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  room_label TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'Single Seat',
  monthly_rent INTEGER NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1,
  available_from TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_facilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  facility_name TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  computed_score INTEGER NOT NULL,
  summary_json TEXT,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, target_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rental_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  room_id INTEGER NULL,
  tenant_id INTEGER NOT NULL,
  move_in_date TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rental_agreements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,
  monthly_rent INTEGER NOT NULL,
  advance_amount INTEGER NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  notice_period_days INTEGER NOT NULL DEFAULT 30,
  utility_terms TEXT NOT NULL,
  house_rules TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  tenant_accepted INTEGER NOT NULL DEFAULT 0,
  tenant_accepted_at TEXT NULL,
  landlord_accepted INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_tenant',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roommate_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  property_id INTEGER NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NULL,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NULL,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  paid_by_user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  split_type TEXT NOT NULL DEFAULT 'equal',
  expense_date TEXT NOT NULL,
  receipt_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  share_amount REAL NOT NULL,
  is_settled INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash / Manual',
  reference_note TEXT DEFAULT '',
  settled_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS utility_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  bill_name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  assigned_user_ids TEXT NOT NULL,
  auto_pay_enabled INTEGER NOT NULL DEFAULT 0,
  auto_pay_provider TEXT DEFAULT '',
  paid_at TEXT NULL,
  receipt_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  paid_by_user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  provider TEXT NOT NULL DEFAULT 'Manual',
  transaction_ref TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recorded',
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bill_id) REFERENCES utility_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  week_label TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_plan_id INTEGER NOT NULL,
  day_of_week TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  votes INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_item_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  voted INTEGER NOT NULL DEFAULT 0,
  UNIQUE (meal_item_id, user_id),
  FOREIGN KEY (meal_item_id) REFERENCES meal_items(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grocery_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  synced_expense_id INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grocery_list_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  estimated_price REAL NOT NULL DEFAULT 0,
  assigned_to_user_id INTEGER NULL,
  is_purchased INTEGER NOT NULL DEFAULT 0,
  purchased_by_user_id INTEGER NULL,
  FOREIGN KEY (grocery_list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Submitted',
  landlord_response TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  target_user_id INTEGER NULL,
  property_id INTEGER NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  verification_type TEXT NOT NULL,
  document_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_path TEXT DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

class HybridDbClient implements DbClient {
  driver: 'mysql' | 'sqlite_fallback' = 'sqlite_fallback';
  private pool: mysql.Pool | null = null;
  private sqlite: DatabaseSync | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const cfg = getAppConfig();

    if (cfg.dbClient === 'mysql') {
      try {
        this.pool = mysql.createPool({
          host: cfg.mysql.host,
          port: cfg.mysql.port,
          user: cfg.mysql.user,
          password: cfg.mysql.password,
          database: cfg.mysql.database,
          waitForConnections: true,
          connectionLimit: 10,
          namedPlaceholders: false,
        });
        await this.pool.query('SELECT 1');
        this.driver = 'mysql';
        this.initialized = true;
        console.log('[DB] Connected to MySQL database:', cfg.mysql.database);
        await seedDatabaseIfEmpty(this);
        return;
      } catch (err) {
        this.pool = null;
        if (!cfg.allowSqliteFallback) {
          throw new Error(
            `MySQL connection failed (${(err as Error).message}). Verify MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.`
          );
        }
        console.warn(
          '[DB] MySQL connection failed and ALLOW_SQLITE_FALLBACK is enabled; using local SQLite store:',
          (err as Error).message
        );
      }
    }

    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'rentshare_bd.sqlite');

    this.sqlite = new DatabaseSync(dbPath);
    this.sqlite.exec(SQLITE_SCHEMA_SQL);
    this.driver = 'sqlite_fallback';
    this.initialized = true;
    console.log(
      '[DB] Local relational fallback ready (data/rentshare_bd.sqlite).'
    );
    await seedDatabaseIfEmpty(this);
  }

  private normalizeParams(params: any[] = []): any[] {
    return params.map((p) => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
  }

  async query<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
    await this.init();
    const cleanParams = this.normalizeParams(params);
    if (this.driver === 'mysql' && this.pool) {
      const [rows] = await this.pool.query(sql, cleanParams);
      return rows as T[];
    }
    if (!this.sqlite) throw new Error('Database not initialized');
    const stmt = this.sqlite.prepare(sql);
    return stmt.all(...cleanParams) as T[];
  }

  async queryOne<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<ExecResult> {
    await this.init();
    const cleanParams = this.normalizeParams(params);
    if (this.driver === 'mysql' && this.pool) {
      const [result] = await this.pool.execute(sql, cleanParams);
      const r = result as mysql.ResultSetHeader;
      return {
        insertId: Number(r.insertId || 0),
        affectedRows: Number(r.affectedRows || 0),
      };
    }
    if (!this.sqlite) throw new Error('Database not initialized');
    const stmt = this.sqlite.prepare(sql);
    const info = stmt.run(...cleanParams);
    return {
      insertId: Number(info.lastInsertRowid || 0),
      affectedRows: Number(info.changes || 0),
    };
  }
}

export const db: DbClient = new HybridDbClient();
