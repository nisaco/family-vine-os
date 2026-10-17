import type Database from 'better-sqlite3';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  phone TEXT,
  wing TEXT,
  wing_role TEXT,
  voice_part TEXT,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'FINANCIAL_SECRETARY', 'TREASURER', 'WELFARE_OFFICER', 'CHIEF_ASAPHITE', 'PRAYER_DIRECTOR', 'MUSIC_DIRECTOR', 'MEMBER')),
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
  event_type TEXT NOT NULL,
  target_wing TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  call_time TEXT,
  attire_notes TEXT,
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
  target_audience TEXT NOT NULL DEFAULT 'ALL',
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
  meeting_type TEXT NOT NULL,
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
  voicing TEXT,
  category TEXT,
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
  resource_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  voice_part TEXT,
  target_wing TEXT,
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

  // Dynamic backward-compatible column upgrades if existing DB
  try {
    const userColumns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
    const userColNames = new Set(userColumns.map((c) => c.name));
    if (!userColNames.has('wing')) {
      db.exec('ALTER TABLE users ADD COLUMN wing TEXT');
    }
    if (!userColNames.has('wing_role')) {
      db.exec('ALTER TABLE users ADD COLUMN wing_role TEXT');
    }

    // Default wing backfill for existing rows
    db.exec(`
      UPDATE users SET wing = 'Family of Praise', wing_role = voice_part
      WHERE wing IS NULL AND voice_part IN ('Soprano', 'Alto', 'Tenor', 'Bass');

      UPDATE users SET wing = 'Asaphites', wing_role = 'Keyboardist / Organist'
      WHERE wing IS NULL AND voice_part = 'Musician';

      UPDATE users SET wing = 'General Leadership', wing_role = 'Director / Executive'
      WHERE wing IS NULL AND role IN ('ADMIN', 'PRESIDENT');
    `);

    // Check if users has legacy CHECK constraint on role excluding WELFARE_OFFICER
    const usersSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string } | undefined;
    if (usersSchemaRow && usersSchemaRow.sql && !usersSchemaRow.sql.includes('WELFARE_OFFICER')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE users_migrated (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          preferred_name TEXT,
          phone TEXT,
          wing TEXT,
          wing_role TEXT,
          voice_part TEXT,
          role TEXT NOT NULL CHECK(role IN ('ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'FINANCIAL_SECRETARY', 'TREASURER', 'WELFARE_OFFICER', 'MEMBER')),
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
        INSERT INTO users_migrated SELECT id, email, password_hash, full_name, preferred_name, phone, wing, wing_role, voice_part, role, status, address, emergency_contact_name, emergency_contact_phone, officer_notes, birth_date, join_date, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_voice_part ON users(voice_part);
        CREATE INDEX IF NOT EXISTS idx_users_wing ON users(wing);
        PRAGMA foreign_keys = ON;
      `);
    }

    const eventColumns = db.prepare('PRAGMA table_info(events)').all() as Array<{ name: string }>;
    const eventColNames = new Set(eventColumns.map((c) => c.name));
    if (!eventColNames.has('target_wing')) {
      db.exec('ALTER TABLE events ADD COLUMN target_wing TEXT');
    }
    if (!eventColNames.has('call_time')) {
      db.exec('ALTER TABLE events ADD COLUMN call_time TEXT');
    }
    if (!eventColNames.has('attire_notes')) {
      db.exec('ALTER TABLE events ADD COLUMN attire_notes TEXT');
    }

    // Check if events has legacy CHECK constraint on event_type
    const eventsSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'").get() as { sql: string } | undefined;
    if (eventsSchemaRow && eventsSchemaRow.sql && eventsSchemaRow.sql.includes("CHECK(event_type IN")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE events_migrated (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          event_type TEXT NOT NULL,
          target_wing TEXT,
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
        INSERT INTO events_migrated SELECT id, title, event_type, target_wing, start_time, end_time, location, description, organizer_id, rsvp_deadline, status, created_at, updated_at FROM events;
        DROP TABLE events;
        ALTER TABLE events_migrated RENAME TO events;
        PRAGMA foreign_keys = ON;
      `);
    }

    // Check if announcements has legacy CHECK constraint on target_audience
    const annSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='announcements'").get() as { sql: string } | undefined;
    if (annSchemaRow && annSchemaRow.sql && annSchemaRow.sql.includes("CHECK(target_audience IN")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE announcements_migrated (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          target_audience TEXT NOT NULL DEFAULT 'ALL',
          is_pinned INTEGER NOT NULL DEFAULT 0,
          is_archived INTEGER NOT NULL DEFAULT 0,
          publish_at TEXT NOT NULL,
          expires_at TEXT,
          author_id TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO announcements_migrated SELECT id, title, content, target_audience, is_pinned, is_archived, publish_at, expires_at, author_id, created_at, updated_at FROM announcements;
        DROP TABLE announcements;
        ALTER TABLE announcements_migrated RENAME TO announcements;
        CREATE INDEX IF NOT EXISTS idx_announcements_publish ON announcements(publish_at);
        CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(target_audience);
        PRAGMA foreign_keys = ON;
      `);
    }

    const resColumns = db.prepare('PRAGMA table_info(song_resources)').all() as Array<{ name: string }>;
    const resColNames = new Set(resColumns.map((c) => c.name));
    if (!resColNames.has('target_wing')) {
      db.exec('ALTER TABLE song_resources ADD COLUMN target_wing TEXT');
    }

    // Check if song_resources has legacy CHECK constraint on resource_type
    const resSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='song_resources'").get() as { sql: string } | undefined;
    if (resSchemaRow && resSchemaRow.sql && resSchemaRow.sql.includes("CHECK(resource_type IN")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE song_resources_migrated (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
          resource_type TEXT NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          voice_part TEXT,
          target_wing TEXT,
          created_at TEXT NOT NULL
        );
        INSERT INTO song_resources_migrated SELECT id, song_id, resource_type, title, url, voice_part, target_wing, created_at FROM song_resources;
        DROP TABLE song_resources;
        ALTER TABLE song_resources_migrated RENAME TO song_resources;
        CREATE INDEX IF NOT EXISTS idx_song_resources_song ON song_resources(song_id);
        PRAGMA foreign_keys = ON;
      `);
    }

    // Create wing-related indexes now that columns are confirmed
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_wing ON users(wing);
      CREATE INDEX IF NOT EXISTS idx_events_wing ON events(target_wing);
      CREATE INDEX IF NOT EXISTS idx_song_resources_target_wing ON song_resources(target_wing);
    `);
  } catch (err) {
    console.error('Migration upgrade notice:', err);
  }

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
      ['cat_inc_dues', 'Monthly Member Dues', 'INCOME', 'Regular recurring monthly dues paid by members across all wings'],
      ['cat_inc_donations', 'General Donations', 'INCOME', 'Freewill donations from members and patrons'],
      ['cat_inc_fundraising', 'Fundraising & Concert Tickets', 'INCOME', 'Special fundraising initiatives and performance ticket proceeds'],
      ['cat_inc_special', 'Thanksgiving & Harvest Offerings', 'INCOME', 'Special thanksgiving collections and harvest offerings'],
      ['cat_inc_music', 'Music & Regalia Contribution', 'INCOME', 'Member contributions toward scores, instruments, and costumes'],
      ['cat_exp_scores', 'Music Scores & Sheet Charts', 'EXPENSE', 'Purchased sheet music, chord charts, and licensing costs'],
      ['cat_exp_audio', 'Instruments & Sound Maintenance', 'EXPENSE', 'Audio accessories, cables, instrument repairs, and microphones'],
      ['cat_exp_uniforms', 'Robes, Uniforms & Dance Attire', 'EXPENSE', 'Choir robes, stoles, and Vimmies dance costumes'],
      ['cat_exp_refresh', 'Rehearsal Refreshments', 'EXPENSE', 'Water and refreshments for rehearsals and long ministrations'],
      ['cat_exp_honoraria', 'Director & Guest Honoraria', 'EXPENSE', 'Honoraria for music directors, guest musicians, and instructors'],
      ['cat_exp_venue', 'Venue Rental & Transport', 'EXPENSE', 'Rehearsal space rentals and ministry bus transportation'],
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
