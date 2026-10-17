'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { deleteDocuments, findOne, insertDocument, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { MembershipStatus, UserRole, VoicePart, UserStatus, MinistryWing } from '@/lib/types';
import { normalizeMemberWing, type ImportedMember } from '@/lib/utils/member-import';

type MemberImportResolution = 'import' | 'update' | 'skip';

interface MemberImportRow extends ImportedMember {
  resolution: MemberImportResolution;
}

interface MemberImportRowResult {
  status: 'created' | 'updated' | 'skipped';
  message: string;
}

export async function createMemberAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || (!hasPermission(actor.role, 'MANAGE_USERS') && actor.role !== 'GENERAL_SECRETARY')) {
    return { error: 'Unauthorized: You do not have permission to add new members.' };
  }

  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const wing = (formData.get('wing') as MinistryWing) || 'Family of Praise';
  const wingRole = (formData.get('wingRole') as string)?.trim() || (formData.get('voicePart') as string) || 'Member';
  const voicePart = (formData.get('voicePart') as VoicePart) || (wing === 'Family of Praise' ? (wingRole as VoicePart) : null);
  const role = (formData.get('role') as UserRole) || 'MEMBER';
  const temporaryPassword = (formData.get('temporaryPassword') as string) || 'Choir2026!';
  const officerNotes = (formData.get('officerNotes') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const emergencyName = (formData.get('emergencyContactName') as string)?.trim() || null;
  const emergencyPhone = (formData.get('emergencyContactPhone') as string)?.trim() || null;
  const birthDate = (formData.get('birthDate') as string)?.trim() || null;
  const expectedGraduationYear = parseExpectedGraduationYear(formData.get('expectedGraduationYear'));

  if (!fullName || !email) {
    return { error: 'Member full name and email are required.' };
  }
  if (expectedGraduationYear === undefined) {
    return { error: 'Enter a valid four-digit expected graduation year.' };
  }

  // Only ADMIN can assign officer or admin roles
  if (role !== 'MEMBER' && actor.role !== 'ADMIN') {
    return { error: 'Only administrators can assign leadership roles.' };
  }

  const existing = await findOne<{ id: string }>(
    'users',
    { email },
    { collation: { locale: 'en', strength: 2 } }
  );
  if (existing) {
    return { error: 'A member with this email address already exists.' };
  }

  const id = `usr_${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    await insertDocument('users', {
      id, email, password_hash: passwordHash, full_name: fullName,
      preferred_name: fullName.split(' ')[0], phone, wing, wing_role: wingRole,
      voice_part: voicePart, role, status: 'ACTIVE', address,
      membership_status: 'CURRENT',
      expected_graduation_year: expectedGraduationYear,
      emergency_contact_name: emergencyName, emergency_contact_phone: emergencyPhone,
      officer_notes: officerNotes, birth_date: birthDate, join_date: now.slice(0, 10),
      created_at: now, updated_at: now,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return { error: 'A member with this email address already exists.' };
    }
    throw error;
  }

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_MEMBER',
    entityType: 'USER',
    entityId: id,
    details: { fullName, email, role, wing, wingRole },
  });

  revalidatePath('/directory');
  return { success: `Member ${fullName} created successfully.` };
}

export async function updateMemberAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || (!hasPermission(actor.role, 'MANAGE_USERS') && actor.role !== 'GENERAL_SECRETARY')) {
    return { error: 'Unauthorized: You do not have permission to edit member records.' };
  }

  const memberId = formData.get('memberId') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string) || '';
  const phone = (formData.get('phone') as string)?.trim() || null;
  const wing = (formData.get('wing') as MinistryWing) || 'Family of Praise';
  const wingRole = (formData.get('wingRole') as string)?.trim() || (formData.get('voicePart') as string) || 'Member';
  const voicePart = (formData.get('voicePart') as VoicePart) || (wing === 'Family of Praise' ? (wingRole as VoicePart) : null);
  const role = formData.get('role') as UserRole;
  const officerNotes = (formData.get('officerNotes') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const emergencyName = (formData.get('emergencyContactName') as string)?.trim() || null;
  const emergencyPhone = (formData.get('emergencyContactPhone') as string)?.trim() || null;
  const birthDate = (formData.get('birthDate') as string)?.trim() || null;
  const expectedGraduationYear = parseExpectedGraduationYear(formData.get('expectedGraduationYear'));
  const rawMembershipStatus = formData.get('membershipStatus');
  const membershipStatus = rawMembershipStatus === 'CURRENT' || rawMembershipStatus === 'ALUMNI'
    ? rawMembershipStatus as MembershipStatus
    : undefined;

  if (!memberId || !fullName) {
    return { error: 'Member ID and name are required.' };
  }
  if (expectedGraduationYear === undefined) {
    return { error: 'Enter a valid four-digit expected graduation year.' };
  }
  if (rawMembershipStatus && !membershipStatus) {
    return { error: 'Choose a valid membership status.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (password && (password.length < 8 || password.length > 72)) {
    return { error: 'Password must be between 8 and 72 characters.' };
  }

  const targetUser = await findOne<{
    role: UserRole;
    password_hash: string | null;
    status: UserStatus;
    membership_status?: MembershipStatus;
  }>('users', { id: memberId });
  if (!targetUser) {
    return { error: 'Member not found.' };
  }
  if (!email && targetUser.password_hash) {
    return { error: 'An email address is required for an account with login credentials.' };
  }
  if (password && !email) {
    return { error: 'An email address is required before setting a password.' };
  }

  // Prevent non-admin from changing roles or editing admins
  let updatedRole = targetUser.role;
  if (role && role !== targetUser.role) {
    if (actor.role !== 'ADMIN') {
      return { error: 'Only administrators can change member roles.' };
    }
    updatedRole = role;
  }
  if (membershipStatus && membershipStatus !== (targetUser.membership_status || 'CURRENT') && actor.role !== 'ADMIN') {
    return { error: 'Only administrators can change membership status.' };
  }
  if (actor.id === memberId && membershipStatus === 'ALUMNI') {
    return { error: 'Cannot mark your own administrator account as alumni.' };
  }

  const now = new Date().toISOString();
  const passwordHash = password ? await hashPassword(password) : undefined;
  const isGraduating = membershipStatus === 'ALUMNI' && targetUser.membership_status !== 'ALUMNI';
  try {
    await updateDocument('users', { id: memberId }, {
      $set: {
        full_name: fullName,
        email: email || null,
        phone,
        wing,
        wing_role: wingRole,
        voice_part: voicePart,
        role: updatedRole,
        officer_notes: officerNotes,
        birth_date: birthDate,
        expected_graduation_year: expectedGraduationYear,
        ...(membershipStatus ? { membership_status: membershipStatus } : {}),
        ...(membershipStatus === 'ALUMNI' ? { status: 'INACTIVE' } : {}),
        address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        ...(passwordHash ? { password_hash: passwordHash } : {}),
        ...(
          targetUser.status === 'INACTIVE' &&
          !targetUser.password_hash &&
          passwordHash &&
          membershipStatus !== 'ALUMNI'
            ? { status: 'ACTIVE' }
            : {}
        ),
        updated_at: now,
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return { error: 'A member with this email address already exists.' };
    }
    throw error;
  }

  if (isGraduating || membershipStatus === 'ALUMNI') {
    await deleteDocuments('sessions', { user_id: memberId });
  }

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'UPDATE_MEMBER',
    entityType: 'USER',
    entityId: memberId,
    details: {
      fullName,
      email,
      role: updatedRole,
      wing,
      wingRole,
      ...(membershipStatus ? { membershipStatus } : {}),
      ...(expectedGraduationYear !== null ? { expectedGraduationYear } : {}),
    },
  });

  revalidatePath('/directory');
  revalidatePath('/dashboard');
  revalidatePath('/attendance');
  return { success: 'Member information updated successfully.' };
}

export async function toggleMemberStatusAction(memberId: string, newStatus: UserStatus) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only administrators can change member account status.' };
  }

  if (actor.id === memberId && newStatus !== 'ACTIVE') {
    return { error: 'Cannot deactivate your own administrator account.' };
  }
  if (newStatus === 'ACTIVE') {
    const targetUser = await findOne<{ membership_status?: MembershipStatus }>('users', { id: memberId });
    if (targetUser?.membership_status === 'ALUMNI') {
      return { error: 'Change this member back to Current Member before restoring login access.' };
    }
  }

  const now = new Date().toISOString();

  // If deactivating, invalidate any active sessions
  if (newStatus !== 'ACTIVE') {
    await deleteDocuments('sessions', { user_id: memberId });
  }

  await updateDocument('users', { id: memberId }, { $set: { status: newStatus, updated_at: now } });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: newStatus === 'ACTIVE' ? 'RESTORE_MEMBER' : 'DEACTIVATE_MEMBER',
    entityType: 'USER',
    entityId: memberId,
    details: { newStatus },
  });

  revalidatePath('/directory');
  revalidatePath('/dashboard');
  revalidatePath('/attendance');
  return { success: `Member account status changed to ${newStatus}.` };
}

export async function importMembersAction(rows: MemberImportRow[]) {
  const actor = await getCurrentUser();
  if (!actor || (!hasPermission(actor.role, 'MANAGE_USERS') && actor.role !== 'GENERAL_SECRETARY')) {
    return { error: 'Unauthorized: You do not have permission to import members.' };
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 250) {
    return { error: 'Choose a file containing between 1 and 250 member rows.' };
  }
  const results: MemberImportRowResult[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const input = rows[index];
    if (!input || typeof input !== 'object') {
      results.push({ status: 'skipped', message: 'Invalid row; skipped.' });
      continue;
    }

    const value = (field: keyof ImportedMember, limit: number) => {
      const item = input[field];
      return typeof item === 'string' ? item.trim().slice(0, limit) : '';
    };
    const resolution = input.resolution;
    if (resolution !== 'import' && resolution !== 'update' && resolution !== 'skip') {
      results.push({ status: 'skipped', message: 'Invalid import choice; skipped.' });
      continue;
    }
    if (resolution === 'skip') {
      results.push({ status: 'skipped', message: 'Skipped by choice.' });
      continue;
    }

    const fullName = value('fullName', 200);
    const email = value('email', 254).toLowerCase();
    if (!fullName || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      results.push({ status: 'skipped', message: 'A valid name is required; enter a valid email if provided.' });
      continue;
    }

    const existing = email
      ? await findOne<{ id: string; role: UserRole; wing: MinistryWing | null }>(
          'users',
          { email },
          { collation: { locale: 'en', strength: 2 } }
        )
      : null;
    if (existing) {
      if (resolution !== 'update') {
        results.push({ status: 'skipped', message: 'Email already exists; choose Update or Skip.' });
        continue;
      }

      const rawWing = value('wing', 80);
      const wing = normalizeMemberWing(rawWing);
      if (rawWing && !wing) {
        results.push({ status: 'skipped', message: 'Unrecognized ministry wing; choose a supported wing and try again.' });
        continue;
      }
      const wingRole = value('wingRole', 100);
      const effectiveWing = wing || existing.wing;
      const updates: Record<string, unknown> = {};
      const optionalValues: Array<[keyof ImportedMember, string, number]> = [
        ['preferredName', 'preferred_name', 100],
        ['phone', 'phone', 60],
        ['birthDate', 'birth_date', 30],
        ['joinDate', 'join_date', 30],
        ['address', 'address', 500],
        ['emergencyContactName', 'emergency_contact_name', 200],
        ['emergencyContactPhone', 'emergency_contact_phone', 60],
        ['officerNotes', 'officer_notes', 2000],
      ];
      updates.full_name = fullName;
      for (const [field, column, limit] of optionalValues) {
        const optional = value(field, limit);
        if (optional) updates[column] = optional;
      }
      const expectedGraduationYear = parseExpectedGraduationYear(value('expectedGraduationYear', 10));
      if (expectedGraduationYear === undefined) {
        results.push({ status: 'skipped', message: 'Expected graduation year must be a valid four-digit year.' });
        continue;
      }
      if (expectedGraduationYear !== null) {
        updates.expected_graduation_year = expectedGraduationYear;
      }
      if (wing) updates.wing = wing;
      if (wingRole) updates.wing_role = wingRole;
      if (wingRole && effectiveWing === 'Family of Praise') {
        updates.voice_part = asVoicePart(wingRole);
      } else if (wing && wing !== 'Family of Praise') {
        updates.voice_part = null;
      }
      updates.updated_at = new Date().toISOString();

      await updateDocument('users', { id: existing.id }, { $set: updates });
      await logAudit({
        actorId: actor.id,
        actorName: actor.full_name,
        action: 'UPDATE_MEMBER',
        entityType: 'USER',
        entityId: existing.id,
        details: { source: 'member_import', row: index + 1 },
      });
      results.push({ status: 'updated', message: 'Matched member updated.' });
      continue;
    }

    if (resolution === 'update') {
      results.push({ status: 'skipped', message: 'No matching member was found to update.' });
      continue;
    }

    const rawWing = value('wing', 80);
    const wing = normalizeMemberWing(rawWing);
    if (rawWing && !wing) {
      results.push({ status: 'skipped', message: 'Unrecognized ministry wing; choose a supported wing and try again.' });
      continue;
    }
    const wingRole = value('wingRole', 100) || 'Member';
    const expectedGraduationYear = parseExpectedGraduationYear(value('expectedGraduationYear', 10));
    if (expectedGraduationYear === undefined) {
      results.push({ status: 'skipped', message: 'Expected graduation year must be a valid four-digit year.' });
      continue;
    }
    const now = new Date().toISOString();
    const id = `usr_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;

    try {
      await insertDocument('users', {
        id,
        email: email || null,
        password_hash: null,
        full_name: fullName,
        preferred_name: value('preferredName', 100) || fullName.split(/\s+/)[0],
        phone: value('phone', 60) || null,
        wing: wing || 'Family of Praise',
        wing_role: wingRole,
        voice_part: (wing || 'Family of Praise') === 'Family of Praise' ? asVoicePart(wingRole) : null,
        role: 'MEMBER',
        status: 'ACTIVE',
        membership_status: 'CURRENT',
        expected_graduation_year: expectedGraduationYear,
        address: value('address', 500) || null,
        emergency_contact_name: value('emergencyContactName', 200) || null,
        emergency_contact_phone: value('emergencyContactPhone', 60) || null,
        officer_notes: value('officerNotes', 2000) || null,
        birth_date: value('birthDate', 30) || null,
        join_date: value('joinDate', 30) || now.slice(0, 10),
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        results.push({ status: 'skipped', message: 'Email already exists; review the duplicate and try again.' });
        continue;
      }
      throw error;
    }

    await logAudit({
      actorId: actor.id,
      actorName: actor.full_name,
      action: 'CREATE_MEMBER',
      entityType: 'USER',
      entityId: id,
      details: { source: 'member_import', row: index + 1 },
    });
    results.push({ status: 'created', message: 'Member added.' });
  }

  revalidatePath('/directory');
  return {
    rows: results,
    created: results.filter((row) => row.status === 'created').length,
    updated: results.filter((row) => row.status === 'updated').length,
    skipped: results.filter((row) => row.status === 'skipped').length,
  };
}

function parseExpectedGraduationYear(value: FormDataEntryValue | null): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const rawYear = value.trim();
  if (!rawYear) return null;
  if (!/^\d{4}$/.test(rawYear)) return undefined;
  const year = Number(rawYear);
  return year >= 1900 && year <= 2200 ? year : undefined;
}

function asVoicePart(value: string): VoicePart | null {
  const validParts: VoicePart[] = [
    'Soprano',
    'Alto',
    'Tenor',
    'Bass',
    'Choir Director',
    'Musician',
    'General',
  ];
  return validParts.find((part) => part.toLowerCase() === value.toLowerCase()) || null;
}
