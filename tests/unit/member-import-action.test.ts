import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importMembersAction } from '@/lib/actions/members';

const state = vi.hoisted(() => ({
  insertedUsers: [] as Record<string, unknown>[],
}));

vi.mock('@/lib/db', () => ({
  deleteDocuments: vi.fn(),
  findOne: vi.fn(async () => null),
  insertDocument: vi.fn(async (_collection: string, document: Record<string, unknown>) => {
    state.insertedUsers.push(document);
  }),
  updateDocument: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 'admin',
    full_name: 'Choir Admin',
    role: 'ADMIN',
  })),
  hasPermission: vi.fn(() => true),
  hashPassword: vi.fn(async () => 'hashed-password'),
}));

vi.mock('@/lib/db/audit', () => ({ logAudit: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('member import action', () => {
  beforeEach(() => {
    state.insertedUsers.length = 0;
  });

  it('stores a name-only import without login credentials', async () => {
    const result = await importMembersAction([{
      fullName: 'Kojo Mensah',
      preferredName: '',
      email: '',
      phone: '',
      wing: '',
      wingRole: '',
      birthDate: '',
      joinDate: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      officerNotes: '',
      resolution: 'import',
    }]);

    expect(result).toMatchObject({ created: 1, updated: 0, skipped: 0 });
    expect(state.insertedUsers).toHaveLength(1);
    expect(state.insertedUsers[0]).toMatchObject({
      email: null,
      password_hash: null,
      full_name: 'Kojo Mensah',
      status: 'ACTIVE',
    });
  });
});
