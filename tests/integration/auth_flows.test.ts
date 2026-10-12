import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSession,
  deleteSession,
  getUserByToken,
  hashPassword,
  isFirstAdminNeeded,
  verifyPassword,
} from '@/lib/auth';
import type { User } from '@/lib/types';

const state = vi.hoisted(() => ({
  users: [] as Record<string, unknown>[],
  sessions: [] as Record<string, unknown>[],
}));

vi.mock('@/lib/db', () => ({
  countDocuments: async (name: string) => (name === 'users' ? state.users.length : state.sessions.length),
  deleteDocuments: async (name: string, filter: Record<string, unknown>) => {
    const collection = name === 'users' ? state.users : state.sessions;
    const remaining = collection.filter((document) =>
      !Object.entries(filter).every(([key, value]) => document[key] === value)
    );
    collection.splice(0, collection.length, ...remaining);
  },
  findOne: async (name: string, filter: Record<string, unknown>) => {
    const collection = name === 'users' ? state.users : state.sessions;
    return collection.find((document) =>
      Object.entries(filter).every(([key, value]) => {
        if (value && typeof value === 'object' && '$gt' in value) {
          return String(document[key]) > String((value as { $gt: unknown }).$gt);
        }
        return document[key] === value;
      })
    ) || null;
  },
  insertDocument: async (name: string, document: Record<string, unknown>) => {
    (name === 'users' ? state.users : state.sessions).push(document);
  },
  updateDocument: vi.fn(),
}));

describe('Authentication, Sessions, and Account Status', () => {
  beforeEach(() => {
    state.users.length = 0;
    state.sessions.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function addUser(status: User['status'] = 'ACTIVE'): User {
    const user: User = {
      id: 'u_active',
      email: 'active@choir.org',
      password_hash: 'hash',
      full_name: 'Choir Member',
      preferred_name: null,
      phone: null,
      wing: null,
      wing_role: null,
      voice_part: null,
      role: 'MEMBER',
      status,
      address: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      officer_notes: null,
      birth_date: null,
      join_date: '2026-01-01',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    state.users.push(user);
    return user;
  }

  it('correctly hashes and verifies secure passwords', async () => {
    const raw = 'SecureChoirPassword2026!';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword('WrongPassword', hash)).toBe(false);
  });

  it('requires initial setup only when the user collection is empty', async () => {
    expect(await isFirstAdminNeeded()).toBe(true);
    addUser();
    expect(await isFirstAdminNeeded()).toBe(false);
  });

  it('creates a session and retrieves its active user', async () => {
    addUser();
    const { token } = await createSession('u_active');
    const user = await getUserByToken(token);

    expect(user?.email).toBe('active@choir.org');
    expect(user?.id).toBe('u_active');
  });

  it('rejects sessions for inactive accounts and expired sessions', async () => {
    addUser('INACTIVE');
    const inactive = await createSession('u_active');
    expect(await getUserByToken(inactive.token)).toBeNull();

    state.users[0].status = 'ACTIVE';
    state.sessions.push({
      id: 'expired',
      user_id: 'u_active',
      token: 'expired-token',
      expires_at: '2000-01-01T00:00:00.000Z',
      created_at: '2000-01-01T00:00:00.000Z',
    });
    expect(await getUserByToken('expired-token')).toBeNull();
  });

  it('deletes a session on sign out', async () => {
    addUser();
    const { token } = await createSession('u_active');
    expect(await getUserByToken(token)).not.toBeNull();

    await deleteSession(token);
    expect(await getUserByToken(token)).toBeNull();
  });
});
