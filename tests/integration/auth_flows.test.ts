import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';
import {
  hashPassword,
  verifyPassword,
  createSession,
  getUserByToken,
  deleteSession,
} from '@/lib/auth';
import type { User } from '@/lib/types';

describe('Authentication, Sessions, and Account Status', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it('correctly hashes and verifies secure passwords', async () => {
    const raw = 'SecureChoirPassword2026!';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword('WrongPassword', hash)).toBe(false);
  });

  it('creates active session and retrieves active user', async () => {
    const now = new Date().toISOString();
    const hash = await hashPassword('Password123!');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_active', 'active@choir.org', hash, 'Active Member', 'MEMBER', 'ACTIVE', '2026-01-01', now, now);

    const { token } = createSession('u_active', db);
    const user = getUserByToken(token, db);

    expect(user).not.toBeNull();
    expect(user?.email).toBe('active@choir.org');
    expect(user?.id).toBe('u_active');
  });

  it('strictly rejects sessions when an account is DEACTIVATED / INACTIVE', async () => {
    const now = new Date().toISOString();
    const hash = await hashPassword('Password123!');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_deact', 'deact@choir.org', hash, 'Former Member', 'MEMBER', 'INACTIVE', '2026-01-01', now, now);

    const { token } = createSession('u_deact', db);
    const user = getUserByToken(token, db);

    // Deactivated user cannot use session!
    expect(user).toBeNull();
  });

  it('destroys session on sign out', async () => {
    const now = new Date().toISOString();
    const hash = await hashPassword('Password123!');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_signout', 'out@choir.org', hash, 'Signout User', 'MEMBER', 'ACTIVE', '2026-01-01', now, now);

    const { token } = createSession('u_signout', db);
    expect(getUserByToken(token, db)).not.toBeNull();

    deleteSession(token, db);
    expect(getUserByToken(token, db)).toBeNull();
  });
});
