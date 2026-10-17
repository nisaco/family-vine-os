import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { countDocuments, deleteDocuments, findOne, insertDocument } from '@/lib/db';
import type { User, SafeUser, UserRole, Session } from '@/lib/types';

export const SESSION_COOKIE_NAME = 'family_vine_session';
const SESSION_DURATION_DAYS = 7;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function isFirstAdminNeeded(): Promise<boolean> {
  return (await countDocuments('users')) === 0;
}

export async function createSession(userId: string): Promise<{ session: Session; token: string }> {
  const id = `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const session = {
    id,
    user_id: userId,
    token,
    expires_at: expires.toISOString(),
    created_at: now.toISOString(),
  };
  await insertDocument('sessions', session);

  return {
    session,
    token,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await deleteDocuments('sessions', { token });
}

export async function getUserByToken(token: string): Promise<User | null> {
  if (!token) return null;
  const now = new Date().toISOString();

  const session = await findOne<Session>('sessions', {
    token,
    expires_at: { $gt: now },
  });
  if (!session) return null;
  const user = await findOne<User>('users', { id: session.user_id });

  if (!user) return null;
  if (user.status !== 'ACTIVE') return null; // Deactivated accounts cannot use active sessions

  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserByToken(token);
}

export function sanitizeUser(user: User, requesterRole?: UserRole, isSelf = false): SafeUser {
  const isOfficerOrAdmin =
    requesterRole === 'ADMIN' ||
    requesterRole === 'PRESIDENT' ||
    requesterRole === 'GENERAL_SECRETARY' ||
    requesterRole === 'WELFARE_OFFICER';

  const safe: SafeUser = {
    id: user.id,
    email: user.email,
    has_login_credentials: Boolean(user.email && user.password_hash),
    full_name: user.full_name,
    preferred_name: user.preferred_name,
    phone: user.phone,
    wing: user.wing || (user.voice_part === 'Musician' ? 'Asaphites' : 'Family of Praise'),
    wing_role: user.wing_role || user.voice_part || 'Chorister',
    voice_part: user.voice_part,
    role: user.role,
    status: user.status,
    membership_status: user.membership_status === 'ALUMNI' ? 'ALUMNI' : 'CURRENT',
    expected_graduation_year: user.expected_graduation_year ?? null,
    birth_date: user.birth_date,
    join_date: user.join_date,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  // Only include private details if requester is self or authorized officer/admin
  if (isSelf || isOfficerOrAdmin) {
    safe.address = user.address;
    safe.emergency_contact_name = user.emergency_contact_name;
    safe.emergency_contact_phone = user.emergency_contact_phone;
  }

  // Officer notes are only visible to officers and admins, NEVER to the member themselves unless an officer
  if (isOfficerOrAdmin) {
    safe.officer_notes = user.officer_notes;
  }

  return safe;
}

/**
 * Permission check matrix
 */
export function hasPermission(
  userRole: UserRole,
  action:
    | 'MANAGE_SETTINGS'
    | 'MANAGE_USERS'
    | 'VIEW_AUDIT_LOG'
    | 'VIEW_ALL_FINANCE'
    | 'CREATE_FINANCE_INCOME'
    | 'CREATE_FINANCE_EXPENSE'
    | 'REVERSE_FINANCE'
    | 'TAKE_ATTENDANCE'
    | 'MANAGE_EVENTS'
    | 'MANAGE_ANNOUNCEMENTS'
    | 'MANAGE_MINUTES'
    | 'VIEW_CONFIDENTIAL_MINUTES'
    | 'MANAGE_SONGS'
    | 'VIEW_ALL_MEMBERS_FULL_DETAILS'
): boolean {
  switch (action) {
    case 'MANAGE_SETTINGS':
    case 'MANAGE_USERS':
    case 'VIEW_AUDIT_LOG':
      return userRole === 'ADMIN';

    case 'VIEW_ALL_FINANCE':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'FINANCIAL_SECRETARY' ||
        userRole === 'TREASURER'
      );

    case 'CREATE_FINANCE_INCOME':
      return (
        userRole === 'ADMIN' ||
        userRole === 'FINANCIAL_SECRETARY' ||
        userRole === 'TREASURER'
      );

    case 'CREATE_FINANCE_EXPENSE':
      return (
        userRole === 'ADMIN' ||
        userRole === 'TREASURER'
      );

    case 'REVERSE_FINANCE':
      // Treasurer, Financial Secretary, Admin can correct with audit logging
      return (
        userRole === 'ADMIN' ||
        userRole === 'TREASURER' ||
        userRole === 'FINANCIAL_SECRETARY'
      );

    case 'TAKE_ATTENDANCE':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'GENERAL_SECRETARY'
      );

    case 'MANAGE_EVENTS':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'GENERAL_SECRETARY' ||
        userRole === 'WELFARE_OFFICER'
      );

    case 'MANAGE_ANNOUNCEMENTS':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'GENERAL_SECRETARY' ||
        userRole === 'WELFARE_OFFICER'
      );

    case 'MANAGE_MINUTES':
      return (
        userRole === 'ADMIN' ||
        userRole === 'GENERAL_SECRETARY'
      );

    case 'VIEW_CONFIDENTIAL_MINUTES':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'GENERAL_SECRETARY' ||
        userRole === 'FINANCIAL_SECRETARY' ||
        userRole === 'TREASURER'
      );

    case 'MANAGE_SONGS':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'GENERAL_SECRETARY'
      );

    case 'VIEW_ALL_MEMBERS_FULL_DETAILS':
      return (
        userRole === 'ADMIN' ||
        userRole === 'PRESIDENT' ||
        userRole === 'GENERAL_SECRETARY' ||
        userRole === 'WELFARE_OFFICER'
      );

    default:
      return false;
  }
}
