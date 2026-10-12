'use server';

import { revalidatePath } from 'next/cache';
import { deleteDocuments, findOne, insertDocument, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { UserRole, VoicePart, UserStatus, MinistryWing } from '@/lib/types';

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

  if (!fullName || !email) {
    return { error: 'Member full name and email are required.' };
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

  if (!memberId || !fullName || !email) {
    return { error: 'Member ID, name, and email are required.' };
  }

  const targetUser = await findOne<{ role: UserRole }>('users', { id: memberId });
  if (!targetUser) {
    return { error: 'Member not found.' };
  }

  // Prevent non-admin from changing roles or editing admins
  let updatedRole = targetUser.role;
  if (role && role !== targetUser.role) {
    if (actor.role !== 'ADMIN') {
      return { error: 'Only administrators can change member roles.' };
    }
    updatedRole = role;
  }

  const now = new Date().toISOString();
  try {
    await updateDocument('users', { id: memberId }, {
      $set: {
        full_name: fullName,
        email,
        phone,
        wing,
        wing_role: wingRole,
        voice_part: voicePart,
        role: updatedRole,
        officer_notes: officerNotes,
        birth_date: birthDate,
        address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        updated_at: now,
      },
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
    action: 'UPDATE_MEMBER',
    entityType: 'USER',
    entityId: memberId,
    details: { fullName, email, role: updatedRole, wing, wingRole },
  });

  revalidatePath('/directory');
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
  return { success: `Member account status changed to ${newStatus}.` };
}
