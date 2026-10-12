import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runMigrations } from '@/lib/db/migrate';
import { isFirstAdminNeeded } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import { getDatabasePath, getDb } from '@/lib/db';

describe('Database Schema, Constraints and Business Rules', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it('runs migrations and initializes default settings and categories', () => {
    const settings = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
    expect(settings.count).toBeGreaterThan(0);

    const choirName = db.prepare("SELECT value FROM settings WHERE key = 'choir_name'").get() as { value: string };
    expect(choirName.value).toBe('Family Vine Choir');

    const categories = db.prepare('SELECT count(*) as count FROM financial_categories').get() as { count: number };
    expect(categories.count).toBeGreaterThan(5);
  });

  it('accurately reports first admin needed when users table is empty', () => {
    expect(isFirstAdminNeeded(db)).toBe(true);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u1', 'admin@choir.org', 'hash', 'Admin User', 'ADMIN', 'ACTIVE', '2026-01-01', now, now);

    expect(isFirstAdminNeeded(db)).toBe(false);
  });

  it('requires an explicit database path in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDatabasePath = process.env.DATABASE_PATH;

    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_PATH;

    try {
      expect(() => getDatabasePath()).toThrow(/DATABASE_PATH.*persistent storage/);

      process.env.DATABASE_PATH = ':memory:';
      expect(() => getDatabasePath()).toThrow(/in-memory databases are not supported/);

      process.env.DATABASE_PATH = './data/family_vine.db';
      expect(getDatabasePath()).toBe(path.resolve(process.cwd(), 'data/family_vine.db'));
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;

      if (originalDatabasePath === undefined) delete process.env.DATABASE_PATH;
      else process.env.DATABASE_PATH = originalDatabasePath;
    }
  });

  it('does not create a missing database directory in production', () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'family-vine-db-'));
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDatabasePath = process.env.DATABASE_PATH;
    const databaseDirectory = path.join(tempDirectory, 'mounted-disk');

    process.env.NODE_ENV = 'production';
    process.env.DATABASE_PATH = path.join(databaseDirectory, 'family_vine.db');

    try {
      expect(() => getDb()).toThrow(/Mount persistent storage/);
      expect(fs.existsSync(databaseDirectory)).toBe(false);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;

      if (originalDatabasePath === undefined) delete process.env.DATABASE_PATH;
      else process.env.DATABASE_PATH = originalDatabasePath;

      fs.rmdirSync(tempDirectory);
    }
  });

  it('strictly enforces duplicate attendance prevention at database constraint level', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u1', 'member1@choir.org', 'hash', 'Member One', 'MEMBER', 'ACTIVE', '2026-01-01', now, now);

    db.prepare(`
      INSERT INTO events (id, title, event_type, start_time, location, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('e1', 'Weekly Rehearsal', 'REHEARSAL', now, 'Hall A', 'SCHEDULED', now, now);

    // Record attendance first time
    db.prepare(`
      INSERT INTO attendance_records (id, event_id, user_id, status, recorded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('att_1', 'e1', 'u1', 'PRESENT', 'u1', now, now);

    // Attempt duplicate attendance record for the same event and user must fail
    expect(() => {
      db.prepare(`
        INSERT INTO attendance_records (id, event_id, user_id, status, recorded_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('att_2', 'e1', 'u1', 'LATE', 'u1', now, now);
    }).toThrow(/UNIQUE constraint failed/);
  });

  it('enforces unique RSVP per user and event', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u1', 'member1@choir.org', 'hash', 'Member One', 'MEMBER', 'ACTIVE', '2026-01-01', now, now);

    db.prepare(`
      INSERT INTO events (id, title, event_type, start_time, location, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('e1', 'Weekly Rehearsal', 'REHEARSAL', now, 'Hall A', 'SCHEDULED', now, now);

    // First RSVP
    db.prepare(`
      INSERT INTO event_rsvps (id, event_id, user_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r1', 'e1', 'u1', 'ATTENDING', now, now);

    // Duplicate insert without replace throws
    expect(() => {
      db.prepare(`
        INSERT INTO event_rsvps (id, event_id, user_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('r2', 'e1', 'u1', 'NOT_ATTENDING', now, now);
    }).toThrow(/UNIQUE constraint failed/);

    // Updating existing RSVP succeeds
    db.prepare(`
      UPDATE event_rsvps SET status = ?, apology_reason = ?, updated_at = ?
      WHERE event_id = ? AND user_id = ?
    `).run('NOT_ATTENDING', 'Doctor appointment', now, 'e1', 'u1');

    const updated = db.prepare('SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?').get('e1', 'u1') as {
      status: string;
      apology_reason: string;
    };
    expect(updated.status).toBe('NOT_ATTENDING');
    expect(updated.apology_reason).toBe('Doctor appointment');
  });

  it('computes exact financial ledger sums without floating point rounding error', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u1', 'treasurer@choir.org', 'hash', 'Treasurer', 'TREASURER', 'ACTIVE', '2026-01-01', now, now);

    // Add three transactions with cents: 25.10, 10.20, and an expense of 15.15
    db.prepare(`
      INSERT INTO financial_transactions (
        id, transaction_type, category_id, amount_cents, date, payee_or_source, description,
        payment_method, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx1', 'INCOME', 'cat_inc_dues', 2510, '2026-10-01', 'Member A', 'Dues', 'CASH', 'POSTED', 'u1', now, now);

    db.prepare(`
      INSERT INTO financial_transactions (
        id, transaction_type, category_id, amount_cents, date, payee_or_source, description,
        payment_method, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx2', 'INCOME', 'cat_inc_donations', 1020, '2026-10-02', 'Member B', 'Donation', 'CASH', 'POSTED', 'u1', now, now);

    db.prepare(`
      INSERT INTO financial_transactions (
        id, transaction_type, category_id, amount_cents, date, payee_or_source, description,
        payment_method, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx3', 'EXPENSE', 'cat_exp_refresh', 1515, '2026-10-03', 'Store', 'Water', 'CASH', 'POSTED', 'u1', now, now);

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' AND status = 'POSTED' THEN amount_cents ELSE 0 END), 0) as total_income_cents,
        COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' AND status = 'POSTED' THEN amount_cents ELSE 0 END), 0) as total_expense_cents
      FROM financial_transactions
    `).get() as { total_income_cents: number; total_expense_cents: number };

    expect(totals.total_income_cents).toBe(3530); // 2510 + 1020 = 3530 ($35.30)
    expect(totals.total_expense_cents).toBe(1515); // $15.15
    const netBalance = totals.total_income_cents - totals.total_expense_cents;
    expect(netBalance).toBe(2015); // $20.15
  });

  it('records audit logs with full details', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_test', 'treasurer_test@choir.org', 'hash', 'Treasurer Test', 'TREASURER', 'ACTIVE', '2026-01-01', now, now);

    logAudit(
      {
        actorId: 'u_test',
        actorName: 'Treasurer Test',
        action: 'TRANSACTION_POSTED',
        entityType: 'FINANCIAL_TRANSACTION',
        entityId: 'tx_99',
        details: { amount_cents: 5000, receipt: 'REC-2026-0001' },
      },
      db
    );

    const logs = db.prepare('SELECT * FROM audit_logs WHERE entity_id = ?').all('tx_99') as Array<{
      actor_name: string;
      action: string;
      details: string;
    }>;

    expect(logs.length).toBe(1);
    expect(logs[0].actor_name).toBe('Treasurer Test');
    expect(logs[0].action).toBe('TRANSACTION_POSTED');
    expect(JSON.parse(logs[0].details).receipt).toBe('REC-2026-0001');
  });

  it('supports WELFARE_OFFICER role and event call_time/attire_notes fields', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, birth_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_welfare', 'welfare@choir.org', 'hash', 'Sister Beatrice', 'WELFARE_OFFICER', 'ACTIVE', '2026-01-01', '1992-06-18', now, now);

    const user = db.prepare('SELECT role, birth_date FROM users WHERE id = ?').get('u_welfare') as { role: string; birth_date: string };
    expect(user.role).toBe('WELFARE_OFFICER');
    expect(user.birth_date).toBe('1992-06-18');

    db.prepare(`
      INSERT INTO events (id, title, event_type, start_time, call_time, location, attire_notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('e_attire', 'Lord of All Retreat', 'CONCERT', now, '05:45 AM', 'Auditorium', 'Family of Praise: White choir robes with gold stoles', 'SCHEDULED', now, now);

    const event = db.prepare('SELECT call_time, attire_notes FROM events WHERE id = ?').get('e_attire') as { call_time: string; attire_notes: string };
    expect(event.call_time).toBe('05:45 AM');
    expect(event.attire_notes).toContain('White choir robes');
  });
});
