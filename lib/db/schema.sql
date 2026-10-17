-- Family Vine Choir Relational Database Schema (SQLite)

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
  wing TEXT, -- 'Family of Praise' (Choir), 'Asaphites' (Instrumentalists), 'Vimmies' (Dancers), 'General Leadership'
  wing_role TEXT, -- Voice part, Instrument, or Dance specialty
  voice_part TEXT, -- Legacy voice part compatibility
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
  target_wing TEXT, -- 'Family of Praise', 'Asaphites', 'Vimmies', or NULL for All
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
  target_wing TEXT, -- 'Family of Praise', 'Asaphites', 'Vimmies', 'ALL'
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

CREATE INDEX IF NOT EXISTS idx_users_wing ON users(wing);
CREATE INDEX IF NOT EXISTS idx_events_wing ON events(target_wing);
CREATE INDEX IF NOT EXISTS idx_song_resources_target_wing ON song_resources(target_wing);
