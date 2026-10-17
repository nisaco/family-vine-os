import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importMembersAction, updateMemberAction } from '@/lib/actions/members';

const state = vi.hoisted(() => ({
  insertedUsers: [] as Record<string, unknown>[],
  targetUser: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/db', () => ({
  deleteDocuments: vi.fn(),
  findOne: vi.fn(async (_collection: string, filter: Record<string, unknown>) =>
    'id' in filter ? state.targetUser : null
  ),
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
    state.targetUser = null;
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
      expectedGraduationYear: '2028',
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
      membership_status: 'CURRENT',
      expected_graduation_year: 2028,
    });
  });

  it('skips imported rows with an invalid expected graduation year', async () => {
    const result = await importMembersAction([{
      fullName: 'Ama Mensah',
      preferredName: '',
      email: '',
      phone: '',
      wing: '',
      wingRole: '',
      birthDate: '',
      expectedGraduationYear: 'twenty28',
      joinDate: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      officerNotes: '',
      resolution: 'import',
    }]);

    expect(result).toMatchObject({ created: 0, updated: 0, skipped: 1 });
    expect(state.insertedUsers).toHaveLength(0);
  });

  it('marks graduating members as alumni, disables sign-in, and preserves the record', async () => {
    state.targetUser = {
      role: 'MEMBER',
      password_hash: 'existing-hash',
      status: 'ACTIVE',
      membership_status: 'CURRENT',
    };
    const formData = new FormData();
    formData.set('memberId', 'member-1');
    formData.set('fullName', 'Kojo Mensah');
    formData.set('email', 'kojo@example.org');
    formData.set('role', 'MEMBER');
    formData.set('expectedGraduationYear', '2028');
    formData.set('membershipStatus', 'ALUMNI');

    const { updateDocument, deleteDocuments } = await import('@/lib/db');
    const result = await updateMemberAction(null, formData);

    expect(result).toMatchObject({ success: 'Member information updated successfully.' });
    expect(updateDocument).toHaveBeenCalledWith('users', { id: 'member-1' }, {
      $set: expect.objectContaining({
        membership_status: 'ALUMNI',
        expected_graduation_year: 2028,
        status: 'INACTIVE',
      }),
    });
    expect(deleteDocuments).toHaveBeenCalledWith('sessions', { user_id: 'member-1' });
  });
});
