import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrations } from '@/lib/db/migrate';

describe('member lifecycle database migration', () => {
  let db: Database.Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it('preserves existing members and sessions while enabling alumni and name-only records', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE users (
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
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES ('existing', 'member@example.org', 'hash', 'Existing Member', 'MEMBER', 'ACTIVE', '2024-01-01', '2024-01-01', '2024-01-01');
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES ('session', 'existing', 'token', '2030-01-01', '2024-01-01');
    `);

    runMigrations(db);

    const existingMember = db.prepare('SELECT * FROM users WHERE id = ?').get('existing') as {
      full_name: string;
      membership_status: string;
      expected_graduation_year: number | null;
    };
    expect(existingMember).toMatchObject({
      full_name: 'Existing Member',
      membership_status: 'CURRENT',
      expected_graduation_year: null,
    });
    expect(db.prepare('SELECT count(*) as count FROM sessions WHERE user_id = ?').get('existing'))
      .toMatchObject({ count: 1 });

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, membership_status, expected_graduation_year, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('alumni', null, null, 'Alumni Member', 'MUSIC_DIRECTOR', 'INACTIVE', 'ALUMNI', 2025, '2021-01-01', '2021-01-01', '2025-01-01');

    expect(db.prepare('SELECT membership_status, expected_graduation_year FROM users WHERE id = ?').get('alumni'))
      .toMatchObject({ membership_status: 'ALUMNI', expected_graduation_year: 2025 });
    expect(db.pragma('foreign_key_check')).toEqual([]);

    expect(() => runMigrations(db!)).not.toThrow();
    expect(db.prepare('SELECT full_name FROM users WHERE id = ?').get('existing'))
      .toMatchObject({ full_name: 'Existing Member' });
  });
});
