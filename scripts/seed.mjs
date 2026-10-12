#!/usr/bin/env node
/**
 * Family Vine Choir - Demo Seed Script
 * FOR LOCAL DEVELOPMENT AND TESTING ONLY.
 * NEVER RUN IN PRODUCTION.
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'node:child_process';

const dbPath = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'data', 'family_vine.db');
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required. Set it in your shell or environment; do not put it in source code.');
  process.exit(1);
}

if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// If database tables already exist from an earlier version, safely add new columns first
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (tableCheck) {
    const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!userCols.includes('wing')) db.exec('ALTER TABLE users ADD COLUMN wing TEXT');
    if (!userCols.includes('wing_role')) db.exec('ALTER TABLE users ADD COLUMN wing_role TEXT');

    const usersSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
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

    const eventCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
    if (eventCheck) {
      const eventCols = db.prepare('PRAGMA table_info(events)').all().map(c => c.name);
      if (!eventCols.includes('target_wing')) db.exec('ALTER TABLE events ADD COLUMN target_wing TEXT');
      if (!eventCols.includes('call_time')) db.exec('ALTER TABLE events ADD COLUMN call_time TEXT');
      if (!eventCols.includes('attire_notes')) db.exec('ALTER TABLE events ADD COLUMN attire_notes TEXT');

      const eventsSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'").get();
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
      const annSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='announcements'").get();
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
    }

    const resCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='song_resources'").get();
    if (resCheck) {
      const resCols = db.prepare('PRAGMA table_info(song_resources)').all().map(c => c.name);
      if (!resCols.includes('target_wing')) db.exec('ALTER TABLE song_resources ADD COLUMN target_wing TEXT');

      const resSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='song_resources'").get();
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
    }
  }
} catch (e) {
  // Columns may already exist or table not created yet
}

// Initialize schema if not already present
const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf-8');
db.exec(schemaSql);

const now = new Date();
const nowIso = now.toISOString();
const todayStr = nowIso.slice(0, 10);

console.log('=== Seeding Family Vine Choir Demo Data ===');
console.log('Notice: These accounts and records are for local evaluation and automated testing only.\n');

async function seed() {
  const demoPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  // Default Choir Settings
  const settings = [
    ['choir_name', 'Family Vine Choir'],
    ['motto', 'United in Harmony, Rooted in Grace'],
    ['timezone', 'Africa/Accra'],
    ['currency_code', 'USD'],
    ['currency_symbol', '$'],
    ['contact_email', 'executive@familyvinechoir.org'],
    ['contact_phone', '+1 (555) 019-2834'],
    ['standard_monthly_dues_cents', '2500'],
    ['allow_member_birthday_view', 'true'],
  ];

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  for (const [k, v] of settings) {
    insertSetting.run(k, v, nowIso);
  }

  // Users: Admin, President, General Secretary, Financial Secretary, Treasurer, Members
  const demoUsers = [
    {
      id: 'usr_admin_root',
      email: 'admin@familyvinechoir.org',
      full_name: 'System Administrator',
      preferred_name: 'SysAdmin',
      phone: '+1 555-0100',
      wing: 'General Leadership',
      wing_role: 'System Administrator',
      voice_part: 'Director',
      role: 'ADMIN',
      status: 'ACTIVE',
      address: '100 Choir Lane, Music City',
      emergency_contact_name: 'Admin Backup',
      emergency_contact_phone: '+1 555-0101',
      officer_notes: 'Root system administrator account for choir platform management.',
      join_date: '2023-01-01',
    },
    {
      id: 'usr_pres_emmanuel',
      email: 'president@familyvinechoir.org',
      full_name: 'Rev. Emmanuel Mensah',
      preferred_name: 'Rev. Emmanuel',
      phone: '+1 555-0111',
      wing: 'General Leadership',
      wing_role: 'President / Patron',
      voice_part: 'Tenor',
      role: 'PRESIDENT',
      status: 'ACTIVE',
      address: '12 Grace Avenue, Accra',
      emergency_contact_name: 'Mercy Mensah',
      emergency_contact_phone: '+1 555-0112',
      officer_notes: 'Choir President since 2024. Oversees general operations and chaplaincy.',
      join_date: '2023-03-15',
    },
    {
      id: 'usr_sec_grace',
      email: 'secretary@familyvinechoir.org',
      full_name: 'Grace Osei',
      preferred_name: 'Grace',
      phone: '+1 555-0122',
      wing: 'Family of Praise',
      wing_role: 'Alto Section Lead / Secretary',
      voice_part: 'Alto',
      role: 'GENERAL_SECRETARY',
      status: 'ACTIVE',
      address: '45 Palm Grove, Accra',
      emergency_contact_name: 'Kofi Osei',
      emergency_contact_phone: '+1 555-0123',
      officer_notes: 'General Secretary. Manages member registers, event logs, and minutes.',
      join_date: '2023-04-10',
    },
    {
      id: 'usr_fin_david',
      email: 'finsec@familyvinechoir.org',
      full_name: 'David Addo',
      preferred_name: 'David',
      phone: '+1 555-0133',
      wing: 'Family of Praise',
      wing_role: 'Bass Chorister / Financial Secretary',
      voice_part: 'Bass',
      role: 'FINANCIAL_SECRETARY',
      status: 'ACTIVE',
      address: '88 Cedar Court, Accra',
      emergency_contact_name: 'Akosua Addo',
      emergency_contact_phone: '+1 555-0134',
      officer_notes: 'Financial Secretary. Receives member dues, donations, and issues official receipts.',
      join_date: '2023-05-01',
    },
    {
      id: 'usr_tre_abena',
      email: 'treasurer@familyvinechoir.org',
      full_name: 'Abena Boateng',
      preferred_name: 'Abena',
      phone: '+1 555-0144',
      wing: 'Family of Praise',
      wing_role: 'Soprano Chorister / Treasurer',
      voice_part: 'Soprano',
      role: 'TREASURER',
      status: 'ACTIVE',
      address: '7 Sunflower Way, Accra',
      emergency_contact_name: 'Kwaku Boateng',
      emergency_contact_phone: '+1 555-0145',
      officer_notes: 'Choir Treasurer. Manages disbursements, ledger reconciliation, and budget reporting.',
      join_date: '2023-05-15',
      birth_date: '1992-04-18',
    },
    {
      id: 'usr_welfare_beatrice',
      email: 'welfare@familyvinechoir.org',
      full_name: 'Beatrice Osei',
      preferred_name: 'Beatrice',
      phone: '+1 555-0150',
      wing: 'General Leadership',
      wing_role: 'Welfare & Wardrobe Officer',
      voice_part: 'Alto',
      role: 'WELFARE_OFFICER',
      status: 'ACTIVE',
      address: '22 Blossom Crescent, Accra',
      emergency_contact_name: 'Samuel Osei',
      emergency_contact_phone: '+1 555-0151',
      officer_notes: 'Welfare & Wardrobe Officer. Coordinates attire directives, member care, and birthday celebrations.',
      join_date: '2023-06-01',
      birth_date: '1991-11-14',
    },
    {
      id: 'usr_mem_kofi',
      email: 'kofi.ansah@familyvinechoir.org',
      full_name: 'Kofi Ansah',
      preferred_name: 'Kofi',
      phone: '+1 555-0155',
      wing: 'Family of Praise',
      wing_role: 'Tenor Chorister',
      voice_part: 'Tenor',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '22 Blossom Street',
      emergency_contact_name: 'Esi Ansah',
      emergency_contact_phone: '+1 555-0156',
      officer_notes: null,
      join_date: '2024-01-12',
      birth_date: `1995-${todayStr.slice(5, 10)}`, // Set to today's date for immediate verification
    },
    {
      id: 'usr_mem_akua',
      email: 'akua.serwaa@familyvinechoir.org',
      full_name: 'Akua Serwaa',
      preferred_name: 'Akua',
      phone: '+1 555-0166',
      wing: 'Family of Praise',
      wing_role: 'Soprano Chorister',
      voice_part: 'Soprano',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '39 Vine Road',
      emergency_contact_name: 'Nana Serwaa',
      emergency_contact_phone: '+1 555-0167',
      officer_notes: null,
      join_date: '2024-02-01',
    },
    {
      id: 'usr_mem_kwame',
      email: 'kwame.appiah@familyvinechoir.org',
      full_name: 'Kwame Appiah',
      preferred_name: 'Kwame',
      phone: '+1 555-0177',
      wing: 'Family of Praise',
      wing_role: 'Bass Chorister',
      voice_part: 'Bass',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '15 Harmony Lane',
      emergency_contact_name: 'Yaw Appiah',
      emergency_contact_phone: '+1 555-0178',
      officer_notes: null,
      join_date: '2024-03-01',
    },
    {
      id: 'usr_mem_ama',
      email: 'ama.darko@familyvinechoir.org',
      full_name: 'Ama Darko',
      preferred_name: 'Ama',
      phone: '+1 555-0188',
      wing: 'Family of Praise',
      wing_role: 'Alto Chorister',
      voice_part: 'Alto',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '56 Cantata Close',
      emergency_contact_name: 'Fred Darko',
      emergency_contact_phone: '+1 555-0189',
      officer_notes: null,
      join_date: '2024-04-15',
    },
    // Asaphites (Instrumentalists)
    {
      id: 'usr_mem_yaw',
      email: 'yaw.bio@familyvinechoir.org',
      full_name: 'Yaw Bio',
      preferred_name: 'Yaw',
      phone: '+1 555-0199',
      wing: 'Asaphites',
      wing_role: 'Principal Keyboardist / Organist',
      voice_part: 'Musician',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '73 Melody Place',
      emergency_contact_name: 'Sarah Bio',
      emergency_contact_phone: '+1 555-0198',
      officer_notes: 'Principal keyboardist and rehearsal accompanist for Asaphites.',
      join_date: '2024-01-05',
    },
    {
      id: 'usr_asaph_drum',
      email: 'selorm.quaye@familyvinechoir.org',
      full_name: 'Selorm Quaye',
      preferred_name: 'Selorm',
      phone: '+1 555-0211',
      wing: 'Asaphites',
      wing_role: 'Drummer / Percussionist',
      voice_part: 'Musician',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '18 Beat Street',
      emergency_contact_name: 'Dora Quaye',
      emergency_contact_phone: '+1 555-0212',
      officer_notes: 'Main drummer for Sunday services and praise ministrations.',
      join_date: '2024-02-15',
    },
    {
      id: 'usr_asaph_bass',
      email: 'elias.tetteh@familyvinechoir.org',
      full_name: 'Elias Tetteh',
      preferred_name: 'Elias',
      phone: '+1 555-0222',
      wing: 'Asaphites',
      wing_role: 'Bass Guitarist',
      voice_part: 'Musician',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '92 Low End Crescent',
      emergency_contact_name: 'Paul Tetteh',
      emergency_contact_phone: '+1 555-0223',
      officer_notes: 'Experienced bass guitarist supporting both hymns and contemporary gospel.',
      join_date: '2024-03-10',
    },
    // Vimmies (Dancers)
    {
      id: 'usr_vim_lead',
      email: 'charlene.mensah@familyvinechoir.org',
      full_name: 'Charlene Mensah',
      preferred_name: 'Charlene',
      phone: '+1 555-0233',
      wing: 'Vimmies',
      wing_role: 'Choreographer & Dance Lead',
      voice_part: 'General',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '33 Rhythm Boulevard',
      emergency_contact_name: 'Stephen Mensah',
      emergency_contact_phone: '+1 555-0234',
      officer_notes: 'Leads choreography and costume coordination for Vimmies dance wing.',
      join_date: '2024-01-20',
    },
    {
      id: 'usr_vim_dancer',
      email: 'esther.boakye@familyvinechoir.org',
      full_name: 'Esther Boakye',
      preferred_name: 'Esther',
      phone: '+1 555-0244',
      wing: 'Vimmies',
      wing_role: 'Flags & Props Liturgical Dancer',
      voice_part: 'General',
      role: 'MEMBER',
      status: 'ACTIVE',
      address: '14 Grace Court',
      emergency_contact_name: 'Mary Boakye',
      emergency_contact_phone: '+1 555-0245',
      officer_notes: 'Specializes in liturgical flag ministrations and celebratory praise dance.',
      join_date: '2024-02-28',
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, password_hash, full_name, preferred_name, phone, wing, wing_role, voice_part,
      role, status, address, emergency_contact_name, emergency_contact_phone,
      officer_notes, birth_date, join_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of demoUsers) {
    insertUser.run(
      u.id,
      u.email,
      passwordHash,
      u.full_name,
      u.preferred_name,
      u.phone,
      u.wing,
      u.wing_role,
      u.voice_part,
      u.role,
      u.status,
      u.address,
      u.emergency_contact_name,
      u.emergency_contact_phone,
      u.officer_notes,
      u.birth_date || null,
      u.join_date,
      nowIso,
      nowIso
    );
  }

  // Categories
  const categories = [
    ['cat_inc_dues', 'Monthly Member Dues', 'INCOME', 'Regular monthly dues from choir members'],
    ['cat_inc_donations', 'General Donations', 'INCOME', 'Freewill donations from members and patrons'],
    ['cat_inc_fundraising', 'Fundraising & Concert Tickets', 'INCOME', 'Ticket proceeds from concerts and fundraising events'],
    ['cat_inc_special', 'Thanksgiving & Harvest Offerings', 'INCOME', 'Special thanksgiving collections'],
    ['cat_exp_scores', 'Music Scores & Printing', 'EXPENSE', 'Purchased sheet music, licensing, and printing costs'],
    ['cat_exp_audio', 'Sound & Audio Equipment', 'EXPENSE', 'Audio accessories, cables, microphones, and equipment maintenance'],
    ['cat_exp_uniforms', 'Robes & Uniforms', 'EXPENSE', 'Choir robes, stoles, and performance uniform maintenance'],
    ['cat_exp_refresh', 'Rehearsal Refreshments', 'EXPENSE', 'Water and refreshments for rehearsals and long services'],
    ['cat_exp_honoraria', 'Director & Guest Honoraria', 'EXPENSE', 'Honoraria for music directors and guest instrumentalists'],
  ];

  const insertCategory = db.prepare(`
    INSERT OR REPLACE INTO financial_categories (id, name, type, description, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `);
  for (const [id, name, type, desc] of categories) {
    insertCategory.run(id, name, type, desc, nowIso);
  }

  // Events: past and upcoming
  const events = [
    {
      id: 'evt_past_reh1',
      title: 'Family of Praise Midweek Vocal Blend',
      event_type: 'CHOIR_REHEARSAL',
      target_wing: 'Family of Praise',
      start_time: '2026-10-07T18:30:00Z',
      end_time: '2026-10-07T20:30:00Z',
      location: 'Main Sanctuary Rehearsal Hall',
      description: 'Reviewing anthem dynamics, breath control, and tenor-bass blend for Sunday.',
      organizer_id: 'usr_sec_grace',
      rsvp_deadline: '2026-10-07T12:00:00Z',
      status: 'COMPLETED',
    },
    {
      id: 'evt_up_service',
      title: 'Sunday Morning Worship & Anthem Ministration',
      event_type: 'SERVICE',
      target_wing: 'ALL',
      start_time: '2026-10-18T07:30:00Z',
      end_time: '2026-10-18T10:30:00Z',
      call_time: '6:30 AM (Sound check & vocal blend)',
      attire_notes: 'Family of Praise: Robes with Gold & Purple Stole | Asaphites: Formal Black Long-sleeve | Vimmies: Royal Purple Liturgical Tunics with Gold Sash',
      location: 'Central Sanctuary',
      description: 'Combined ministration featuring Family of Praise, Asaphites, and Vimmies. Official call time: 6:30 AM sharp.',
      organizer_id: 'usr_pres_emmanuel',
      rsvp_deadline: '2026-10-17T20:00:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 'evt_up_band',
      title: 'Asaphites Band Practice & Sound Optimization',
      event_type: 'BAND_PRACTICE',
      target_wing: 'Asaphites',
      start_time: '2026-10-21T18:00:00Z',
      end_time: '2026-10-21T20:30:00Z',
      call_time: '5:30 PM (Patching & cable checks)',
      attire_notes: 'Comfortable band practice casual.',
      location: 'Sanctuary Instrumental Wing',
      description: 'Keyboard voicings, drum tempo synchronization, and monitor mix balancing.',
      organizer_id: 'usr_mem_yaw',
      rsvp_deadline: '2026-10-21T12:00:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 'evt_up_dance',
      title: 'Vimmies Choreography & Prop Mastery Drill',
      event_type: 'DANCE_PRACTICE',
      target_wing: 'Vimmies',
      start_time: '2026-10-22T17:30:00Z',
      end_time: '2026-10-22T19:30:00Z',
      call_time: '5:00 PM (Stretching & prop allocation)',
      attire_notes: 'All-black rehearsal leotards / jazz pants with dance sneakers.',
      location: 'Youth Hall Dance Studio',
      description: 'Flag coordination, liturgical entrance formations, and praise routine polish.',
      organizer_id: 'usr_vim_lead',
      rsvp_deadline: '2026-10-22T10:00:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 'evt_up_reh2',
      title: 'Full Ministry Combined Intensive Rehearsal',
      event_type: 'REHEARSAL',
      target_wing: 'ALL',
      start_time: '2026-10-24T15:00:00Z',
      end_time: '2026-10-24T18:00:00Z',
      call_time: '2:30 PM (Sound system calibration)',
      attire_notes: 'All Wings: Ministry Rehearsal Polo / T-shirt with dark trousers.',
      location: 'Main Sanctuary',
      description: 'Full joint ministration run-through with Choir, Instrumentalists, and Dancers.',
      organizer_id: 'usr_sec_grace',
      rsvp_deadline: '2026-10-23T23:59:00Z',
      status: 'SCHEDULED',
    },
    {
      id: 'evt_up_exec',
      title: 'Monthly Executive Officers Planning Meeting',
      event_type: 'OFFICER_MEETING',
      target_wing: 'General Leadership',
      start_time: '2026-10-25T17:00:00Z',
      end_time: '2026-10-25T19:00:00Z',
      call_time: null,
      attire_notes: 'Smart casual / official leadership attire.',
      location: 'Conference Room B',
      description: 'Quarterly financial review, instruments and dance props procurement, and concert dates.',
      organizer_id: 'usr_pres_emmanuel',
      rsvp_deadline: '2026-10-24T12:00:00Z',
      status: 'SCHEDULED',
    },
  ];

  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO events (
      id, title, event_type, target_wing, start_time, end_time, call_time, attire_notes, location, description,
      organizer_id, rsvp_deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const e of events) {
    insertEvent.run(
      e.id,
      e.title,
      e.event_type,
      e.target_wing,
      e.start_time,
      e.end_time,
      e.call_time || null,
      e.attire_notes || null,
      e.location,
      e.description,
      e.organizer_id,
      e.rsvp_deadline,
      e.status,
      nowIso,
      nowIso
    );
  }

  // RSVPs for upcoming service
  const rsvps = [
    { event_id: 'evt_up_service', user_id: 'usr_pres_emmanuel', status: 'ATTENDING', reason: null },
    { event_id: 'evt_up_service', user_id: 'usr_sec_grace', status: 'ATTENDING', reason: null },
    { event_id: 'evt_up_service', user_id: 'usr_fin_david', status: 'ATTENDING', reason: null },
    { event_id: 'evt_up_service', user_id: 'usr_tre_abena', status: 'ATTENDING', reason: null },
    { event_id: 'evt_up_service', user_id: 'usr_mem_kofi', status: 'ATTENDING', reason: null },
    { event_id: 'evt_up_service', user_id: 'usr_mem_akua', status: 'ATTENDING', reason: null },
    { event_id: 'evt_up_service', user_id: 'usr_mem_kwame', status: 'NOT_ATTENDING', reason: 'Traveling for official family engagement' },
    { event_id: 'evt_up_service', user_id: 'usr_mem_ama', status: 'MAYBE', reason: 'Awaiting work shift roster confirmation' },
  ];

  const insertRsvp = db.prepare(`
    INSERT OR REPLACE INTO event_rsvps (id, event_id, user_id, status, apology_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of rsvps) {
    insertRsvp.run(`rsvp_${r.event_id}_${r.user_id}`, r.event_id, r.user_id, r.status, r.reason, nowIso, nowIso);
  }

  // Attendance for past rehearsal
  const attendance = [
    { event_id: 'evt_past_reh1', user_id: 'usr_pres_emmanuel', status: 'PRESENT', notes: null },
    { event_id: 'evt_past_reh1', user_id: 'usr_sec_grace', status: 'PRESENT', notes: null },
    { event_id: 'evt_past_reh1', user_id: 'usr_fin_david', status: 'PRESENT', notes: null },
    { event_id: 'evt_past_reh1', user_id: 'usr_tre_abena', status: 'PRESENT', notes: null },
    { event_id: 'evt_past_reh1', user_id: 'usr_mem_kofi', status: 'PRESENT', notes: null },
    { event_id: 'evt_past_reh1', user_id: 'usr_mem_akua', status: 'LATE', notes: 'Arrived at 18:50 due to traffic' },
    { event_id: 'evt_past_reh1', user_id: 'usr_mem_kwame', status: 'EXCUSED', notes: 'Submitted advance apology' },
    { event_id: 'evt_past_reh1', user_id: 'usr_mem_ama', status: 'ABSENT', notes: null },
    { event_id: 'evt_past_reh1', user_id: 'usr_mem_yaw', status: 'PRESENT', notes: 'Accompanist on keyboard' },
  ];

  const insertAttendance = db.prepare(`
    INSERT OR REPLACE INTO attendance_records (
      id, event_id, user_id, status, notes, recorded_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const a of attendance) {
    insertAttendance.run(
      `att_${a.event_id}_${a.user_id}`,
      a.event_id,
      a.user_id,
      a.status,
      a.notes,
      'usr_sec_grace',
      nowIso,
      nowIso
    );
  }

  // Financial transactions
  const transactions = [
    {
      id: 'tx_001',
      transaction_type: 'INCOME',
      receipt_number: 'REC-2026-0001',
      category_id: 'cat_inc_dues',
      amount_cents: 2500, // $25.00
      date: '2026-10-01',
      member_id: 'usr_mem_kofi',
      dues_period: '2026-10',
      payee_or_source: 'Kofi Ansah',
      description: 'October 2026 monthly dues',
      payment_method: 'MOBILE_MONEY',
      status: 'POSTED',
      created_by: 'usr_fin_david',
      reviewed_by: 'usr_tre_abena',
      reviewed_at: '2026-10-02T10:00:00Z',
    },
    {
      id: 'tx_002',
      transaction_type: 'INCOME',
      receipt_number: 'REC-2026-0002',
      category_id: 'cat_inc_dues',
      amount_cents: 2500, // $25.00
      date: '2026-10-02',
      member_id: 'usr_mem_akua',
      dues_period: '2026-10',
      payee_or_source: 'Akua Serwaa',
      description: 'October 2026 monthly dues',
      payment_method: 'BANK_TRANSFER',
      status: 'POSTED',
      created_by: 'usr_fin_david',
      reviewed_by: 'usr_tre_abena',
      reviewed_at: '2026-10-02T11:00:00Z',
    },
    {
      id: 'tx_003',
      transaction_type: 'INCOME',
      receipt_number: 'REC-2026-0003',
      category_id: 'cat_inc_donations',
      amount_cents: 15000, // $150.00
      date: '2026-10-03',
      member_id: 'usr_pres_emmanuel',
      dues_period: null,
      payee_or_source: 'Rev. Emmanuel Mensah',
      description: 'Patron seed donation toward audio monitoring headsets',
      payment_method: 'CHECK',
      status: 'POSTED',
      created_by: 'usr_fin_david',
      reviewed_by: 'usr_tre_abena',
      reviewed_at: '2026-10-04T09:00:00Z',
    },
    {
      id: 'tx_004',
      transaction_type: 'EXPENSE',
      receipt_number: null,
      category_id: 'cat_exp_refresh',
      amount_cents: 3500, // $35.00
      date: '2026-10-07',
      member_id: null,
      dues_period: null,
      payee_or_source: 'Grace Osei (Reimbursement)',
      description: 'Bottled water and fruit refreshments for Wednesday rehearsal',
      payment_method: 'CASH',
      status: 'POSTED',
      created_by: 'usr_tre_abena',
      reviewed_by: 'usr_fin_david',
      reviewed_at: '2026-10-07T21:00:00Z',
    },
    {
      id: 'tx_005',
      transaction_type: 'EXPENSE',
      receipt_number: null,
      category_id: 'cat_exp_scores',
      amount_cents: 4800, // $48.00
      date: '2026-10-05',
      member_id: null,
      dues_period: null,
      payee_or_source: 'Oxford Choral Music Store',
      description: 'Licensed SATB score sheet booklets (40 copies) for Easter cantata',
      payment_method: 'CARD',
      status: 'POSTED',
      created_by: 'usr_tre_abena',
      reviewed_by: null,
      reviewed_at: null,
    },
  ];

  const insertTx = db.prepare(`
    INSERT OR REPLACE INTO financial_transactions (
      id, transaction_type, receipt_number, category_id, amount_cents, date,
      member_id, dues_period, payee_or_source, description, payment_method,
      status, created_by, reviewed_by, reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of transactions) {
    insertTx.run(
      t.id,
      t.transaction_type,
      t.receipt_number,
      t.category_id,
      t.amount_cents,
      t.date,
      t.member_id,
      t.dues_period,
      t.payee_or_source,
      t.description,
      t.payment_method,
      t.status,
      t.created_by,
      t.reviewed_by,
      t.reviewed_at,
      nowIso,
      nowIso
    );
  }

  // Announcements
  const announcements = [
    {
      id: 'ann_01',
      title: 'Welcome to the New Ministry Season & Uniforms Update',
      content: 'Beloved Family Vine members, welcome into our new quarter! Please ensure you have fitted your choir robes, band blazers, and dance stoles by this weekend.',
      target_audience: 'ALL',
      is_pinned: 1,
      publish_at: '2026-10-01T08:00:00Z',
      author_id: 'usr_pres_emmanuel',
    },
    {
      id: 'ann_praise',
      title: 'Family of Praise (Choir): Vocal Warmups & Anthems',
      content: 'All choristers are reminded that vocal warmups start promptly at 7:30 AM before Sunday service ministration. Review the Easter cantata scores.',
      target_audience: 'FAMILY_OF_PRAISE',
      is_pinned: 0,
      publish_at: '2026-10-04T08:00:00Z',
      author_id: 'usr_sec_grace',
    },
    {
      id: 'ann_asaph',
      title: 'Asaphites (Band): Soundcheck & IEM Setup',
      content: 'Musicians and instrumentalists please arrive 45 minutes early for in-ear monitor soundcheck and drum shield calibration.',
      target_audience: 'ASAPHITES',
      is_pinned: 0,
      publish_at: '2026-10-05T08:00:00Z',
      author_id: 'usr_mem_yaw',
    },
    {
      id: 'ann_vim',
      title: 'Vimmies (Dancers): Praise Dance Attire & Props',
      content: 'Dancers please inspect flags and ribbons ahead of the joint Thanksgiving celebration praise session.',
      target_audience: 'VIMMIES',
      is_pinned: 0,
      publish_at: '2026-10-06T08:00:00Z',
      author_id: 'usr_vim_lead',
    },
    {
      id: 'ann_02',
      title: 'Tenor Section Extra Practice on Friday',
      content: 'All Tenors are requested to join an online audio review this Friday at 8:00 PM to perfect the fugue entry in bar 42.',
      target_audience: 'TENOR',
      is_pinned: 0,
      publish_at: '2026-10-05T09:00:00Z',
      author_id: 'usr_sec_grace',
    },
    {
      id: 'ann_03',
      title: 'Officers Notice: Q4 Budget Draft & Review',
      content: 'Executive officers are reminded to review the draft expense schedules ahead of our planning meeting on Sunday.',
      target_audience: 'OFFICERS',
      is_pinned: 0,
      publish_at: '2026-10-08T10:00:00Z',
      author_id: 'usr_tre_abena',
    },
  ];

  const insertAnn = db.prepare(`
    INSERT OR REPLACE INTO announcements (
      id, title, content, target_audience, is_pinned, is_archived, publish_at, author_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `);

  for (const a of announcements) {
    insertAnn.run(a.id, a.title, a.content, a.target_audience, a.is_pinned, a.publish_at, a.author_id, nowIso, nowIso);
  }

  // Meetings and Action Items
  const meetings = [
    {
      id: 'mtg_01',
      title: 'Q4 Executive Leadership Strategy Meeting',
      meeting_type: 'OFFICER_MEETING',
      date: '2026-10-04',
      location: 'Conference Room B',
      minutes: '1. Review of annual concert logistics. 2. Treasurer presented preliminary audio equipment quotes. 3. General Secretary reported 88% average choir attendance over the last quarter. Agreed to institute proactive attendance follow-up calls.',
      is_confidential: 1,
      created_by: 'usr_sec_grace',
    },
  ];

  const insertMtg = db.prepare(`
    INSERT OR REPLACE INTO meetings (
      id, title, meeting_type, date, location, minutes, is_confidential, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of meetings) {
    insertMtg.run(m.id, m.title, m.meeting_type, m.date, m.location, m.minutes, m.is_confidential, m.created_by, nowIso, nowIso);
  }

  const actionItems = [
    {
      id: 'act_01',
      meeting_id: 'mtg_01',
      title: 'Procure 4 wireless clip microphones',
      description: 'Compare warranty prices between Yamaha and Shure authorized dealers.',
      assigned_to: 'usr_tre_abena',
      due_date: '2026-10-25',
      status: 'IN_PROGRESS',
      created_by: 'usr_sec_grace',
    },
    {
      id: 'act_02',
      meeting_id: 'mtg_01',
      title: 'Distribute Easter cantata rehearsal tracks',
      description: 'Upload audio stems for Soprano, Alto, Tenor, and Bass to the song resources portal.',
      assigned_to: 'usr_mem_yaw',
      due_date: '2026-10-20',
      status: 'PENDING',
      created_by: 'usr_sec_grace',
    },
  ];

  const insertAct = db.prepare(`
    INSERT OR REPLACE INTO action_items (
      id, meeting_id, title, description, assigned_to, due_date, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const a of actionItems) {
    insertAct.run(a.id, a.meeting_id, a.title, a.description, a.assigned_to, a.due_date, a.status, a.created_by, nowIso, nowIso);
  }

  // Songs & Song Resources
  const songs = [
    {
      id: 'sng_01',
      title: 'Hallelujah Chorus (from Messiah)',
      composer_or_arranger: 'G.F. Handel',
      voicing: 'SATB',
      category: 'ANTHEM',
      key_signature: 'D Major',
      tempo: 'Allegro (108 bpm)',
      lyrics_or_scripture: 'Revelation 19:6; 11:15; 19:16',
      notes: 'Ensure crisp consonants on "King of Kings". Sopranos watch the sustained high F#.',
    },
    {
      id: 'sng_02',
      title: 'Great Is Thy Faithfulness',
      composer_or_arranger: 'William M. Runyan / arr. Jack Schrader',
      voicing: 'SATB',
      category: 'HYMN',
      key_signature: 'Eb Major',
      tempo: 'Andante con moto',
      lyrics_or_scripture: 'Lamentations 3:22-23',
      notes: 'Verse 2 features Alto and Tenor unison; full choir harmonizes on verse 3.',
    },
    {
      id: 'sng_03',
      title: 'Praise to the Lord, the Almighty',
      composer_or_arranger: 'Erneuerten Gesangbuch / arr. John Rutter',
      voicing: 'SATB',
      category: 'PRAISE',
      key_signature: 'G Major',
      tempo: 'Maestoso (96 bpm)',
      lyrics_or_scripture: 'Psalm 103:1-6',
      notes: 'Organ accompaniment with trumpet descant on final verse.',
    },
  ];

  const insertSong = db.prepare(`
    INSERT OR REPLACE INTO songs (
      id, title, composer_or_arranger, voicing, category, key_signature, tempo,
      lyrics_or_scripture, notes, is_archived, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `);

  for (const s of songs) {
    insertSong.run(s.id, s.title, s.composer_or_arranger, s.voicing, s.category, s.key_signature, s.tempo, s.lyrics_or_scripture, s.notes, 'usr_sec_grace', nowIso, nowIso);
  }

  const songResources = [
    {
      id: 'res_01',
      song_id: 'sng_01',
      resource_type: 'SHEET_MUSIC_LINK',
      title: 'Handel Messiah Vocal Score PDF (Family of Praise)',
      url: 'https://imslp.org/wiki/Messiah,_HWV_56_(Handel,_George_Frideric)',
      voice_part: 'ALL',
      target_wing: 'Family of Praise',
    },
    {
      id: 'res_02',
      song_id: 'sng_01',
      resource_type: 'AUDIO_REHEARSAL_LINK',
      title: 'Tenor Practice Audio Track',
      url: 'https://www.choraline.com/handel-messiah-tenor',
      voice_part: 'TENOR',
      target_wing: 'Family of Praise',
    },
    {
      id: 'res_03',
      song_id: 'sng_02',
      resource_type: 'CHORD_CHART_LINK',
      title: 'Great Is Thy Faithfulness - Band Chord Chart (Asaphites)',
      url: 'https://hymnary.org/text/great_is_thy_faithfulness_o_god_my_fa',
      voice_part: 'ALL',
      target_wing: 'Asaphites',
    },
    {
      id: 'res_04',
      song_id: 'sng_03',
      resource_type: 'DANCE_CHOREO_LINK',
      title: 'Praise to the Lord - Liturgical Entrance & Flag Routine (Vimmies)',
      url: 'https://youtube.com/watch?v=family_vine_vimmies_praise',
      voice_part: 'ALL',
      target_wing: 'Vimmies',
    },
  ];

  const insertRes = db.prepare(`
    INSERT OR REPLACE INTO song_resources (
      id, song_id, resource_type, title, url, voice_part, target_wing, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of songResources) {
    insertRes.run(r.id, r.song_id, r.resource_type, r.title, r.url, r.voice_part, r.target_wing, nowIso);
  }

  // Seed initial audit log
  const insertAudit = db.prepare(`
    INSERT OR REPLACE INTO audit_logs (id, actor_id, actor_name, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    `aud_seed_01`,
    'usr_admin_root',
    'System Administrator',
    'SEED_DEMO_DATA',
    'SYSTEM',
    'system',
    JSON.stringify({ note: 'Seeded demo users, events, finances, and repertoire for evaluation.' }),
    nowIso
  );

  console.log('[SUCCESS] Database seeded with realistic Family Vine 3-wing demo dataset!\n');
  console.log('Demo Accounts Available (Password for all: Password123!)');
  console.log('--------------------------------------------------------------------------------------');
  console.log('1. Admin:               admin@familyvinechoir.org           (General Leadership)');
  console.log('2. President:           president@familyvinechoir.org       (General Leadership)');
  console.log('3. General Secretary:   secretary@familyvinechoir.org       (Family of Praise)');
  console.log('4. Financial Secretary: finsec@familyvinechoir.org          (Family of Praise)');
  console.log('5. Treasurer:           treasurer@familyvinechoir.org       (Family of Praise)');
  console.log('6. Welfare Officer:     welfare@familyvinechoir.org         (General Leadership)');
  console.log('7. Member (Tenor):      kofi.ansah@familyvinechoir.org      (Family of Praise)');
  console.log('8. Member (Soprano):    akua.serwaa@familyvinechoir.org     (Family of Praise)');
  console.log('9. Keyboardist:         yaw.bio@familyvinechoir.org         (Asaphites Band)');
  console.log('10. Drummer:            selorm.quaye@familyvinechoir.org    (Asaphites Band)');
  console.log('11. Bassist:            elias.tetteh@familyvinechoir.org    (Asaphites Band)');
  console.log('12. Choreographer:      charlene.mensah@familyvinechoir.org (Vimmies Dancers)');
  console.log('13. Liturgical Dancer:  esther.boakye@familyvinechoir.org   (Vimmies Dancers)');
  console.log('--------------------------------------------------------------------------------------');
}

seed().then(() => {
  db.close();
  const migration = spawnSync(
    process.execPath,
    [path.resolve(process.cwd(), 'scripts', 'migrate-sqlite-to-mongodb.mjs')],
    { stdio: 'inherit', env: { ...process.env, SQLITE_PATH: dbPath } }
  );
  if (migration.error) throw migration.error;
  if (migration.status !== 0) throw new Error('Demo data could not be migrated into MongoDB.');
}).catch((err) => {
  console.error('Seed script failed:', err);
  process.exitCode = 1;
});
