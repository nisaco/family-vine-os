import type Database from 'better-sqlite3';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  phone TEXT,
  voice_part TEXT,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'FINANCIAL_SECRETARY', 'TREASURER', 'MEMBER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  officer_notes TEXT,
  birth_date TEXT,
  join_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_voice_part ON users(voice_part);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('REHEARSAL', 'SERVICE', 'CONCERT', 'OFFICER_MEETING', 'GENERAL_MEETING', 'SPECIAL')),
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT NOT NULL,
  description TEXT,
  organizer_id TEXT REFERENCES users(id),
  rsvp_deadline TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('ATTENDING', 'NOT_ATTENDING', 'MAYBE')),
  apology_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE')),
  notes TEXT,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);

CREATE TABLE IF NOT EXISTS financial_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('INCOME', 'EXPENSE')),
  receipt_number TEXT UNIQUE,
  category_id TEXT NOT NULL REFERENCES financial_categories(id),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  date TEXT NOT NULL,
  member_id TEXT REFERENCES users(id),
  dues_period TEXT,
  payee_or_source TEXT NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHECK', 'CARD', 'OTHER')),
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK(status IN ('POSTED', 'VOIDED', 'CORRECTED')),
  reference_note TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  reversal_of_id TEXT REFERENCES financial_transactions(id),
  reversal_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_fin_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fin_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fin_member ON financial_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_fin_category ON financial_transactions(category_id);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'ALL' CHECK(target_audience IN ('ALL', 'OFFICERS', 'SOPRANO', 'ALTO', 'TENOR', 'BASS')),
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  publish_at TEXT NOT NULL,
  expires_at TEXT,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_announcements_publish ON announcements(publish_at);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(target_audience);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK(meeting_type IN ('OFFICER_MEETING', 'GENERAL_MEETING', 'SECTIONAL')),
  date TEXT NOT NULL,
  location TEXT,
  minutes TEXT NOT NULL,
  is_confidential INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  meeting_id TEXT REFERENCES meetings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT NOT NULL REFERENCES users(id),
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);

CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer_or_arranger TEXT,
  voicing TEXT CHECK(voicing IN ('SATB', 'SSA', 'TTBB', 'UNISON', 'SOLO_CHOIR', 'OTHER')),
  category TEXT CHECK(category IN ('HYMN', 'ANTHEM', 'PRAISE', 'WORSHIP', 'CHRISTMAS', 'EASTER', 'SPIRITUAL', 'CONTEMPORARY', 'OTHER')),
  key_signature TEXT,
  tempo TEXT,
  lyrics_or_scripture TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);
CREATE INDEX IF NOT EXISTS idx_songs_voicing ON songs(voicing);

CREATE TABLE IF NOT EXISTS song_resources (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('SHEET_MUSIC_LINK', 'AUDIO_REHEARSAL_LINK', 'VIDEO_PERFORMANCE_LINK', 'DOC_LINK')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  voice_part TEXT CHECK(voice_part IN ('ALL', 'SOPRANO', 'ALTO', 'TENOR', 'BASS')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_song_resources_song ON song_resources(song_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
`;

export function runMigrations(db: Database.Database): void {
  // Execute base schema inside transaction
  db.exec(SCHEMA_SQL);

  const now = new Date().toISOString();

  // Seed default choir settings if empty
  const countRow = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
  if (countRow.count === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    const defaultSettings: [string, string][] = [
      ['choir_name', 'Family Vine Choir'],
      ['motto', 'United in Harmony, Rooted in Grace'],
      ['timezone', 'UTC'],
      ['currency_code', 'USD'],
      ['currency_symbol', '$'],
      ['contact_email', 'contact@familyvinechoir.org'],
      ['contact_phone', '+1 555-0199'],
      ['standard_monthly_dues_cents', '2500'],
      ['allow_member_birthday_view', 'true'],
    ];

    db.transaction(() => {
      for (const [key, val] of defaultSettings) {
        insertSetting.run(key, val, now);
      }
    })();
  }

  // Seed default categories if empty
  const catCount = db.prepare('SELECT count(*) as count FROM financial_categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare(`
      INSERT OR IGNORE INTO financial_categories (id, name, type, description, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    const defaultCategories: [string, string, 'INCOME' | 'EXPENSE', string][] = [
      ['cat_inc_dues', 'Monthly Member Dues', 'INCOME', 'Regular recurring monthly dues paid by choir members'],
      ['cat_inc_donations', 'General Donations', 'INCOME', 'Freewill donations from members and patrons'],
      ['cat_inc_fundraising', 'Fundraising & Concert Tickets', 'INCOME', 'Special fundraising initiatives and performance ticket proceeds'],
      ['cat_inc_special', 'Thanksgiving & Harvest Offerings', 'INCOME', 'Special thanksgiving collections and harvest offerings'],
      ['cat_inc_music', 'Sheet Music & Regalia Contribution', 'INCOME', 'Member contributions toward scores and robes'],
      ['cat_exp_scores', 'Music Scores & Printing', 'EXPENSE', 'Purchased sheet music, licensing, and printing costs'],
      ['cat_exp_audio', 'Sound & Audio Equipment', 'EXPENSE', 'Audio accessories, cables, microphones, and equipment maintenance'],
      ['cat_exp_uniforms', 'Robes & Uniforms', 'EXPENSE', 'Choir robes, stoles, and performance uniform maintenance'],
      ['cat_exp_refresh', 'Rehearsal Refreshments', 'EXPENSE', 'Water and refreshments for rehearsals and long services'],
      ['cat_exp_honoraria', 'Director & Guest Honoraria', 'EXPENSE', 'Honoraria for music directors, organists, and guest musicians'],
      ['cat_exp_venue', 'Venue Rental & Transport', 'EXPENSE', 'Rehearsal space rentals and choir group transportation'],
      ['cat_exp_admin', 'Administrative & Software', 'EXPENSE', 'Office stationery, bank charges, and web software costs'],
      ['cat_exp_welfare', 'Member Welfare & Benevolence', 'EXPENSE', 'Bereavement, wedding, and member welfare support'],
    ];

    db.transaction(() => {
      for (const [id, name, type, desc] of defaultCategories) {
        insertCat.run(id, name, type, desc, now);
      }
    })();
  }
}

