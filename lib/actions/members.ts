'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { getCurrentUser, hasPermission, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { UserRole, VoicePart, UserStatus } from '@/lib/types';

export async function createMemberAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || (!hasPermission(actor.role, 'MANAGE_USERS') && actor.role !== 'GENERAL_SECRETARY')) {
    return { error: 'Unauthorized: You do not have permission to add new members.' };
  }

  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const voicePart = (formData.get('voicePart') as VoicePart) || 'General';
  const role = (formData.get('role') as UserRole) || 'MEMBER';
  const temporaryPassword = (formData.get('temporaryPassword') as string) || 'Choir2026!';
  const officerNotes = (formData.get('officerNotes') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const emergencyName = (formData.get('emergencyContactName') as string)?.trim() || null;
  const emergencyPhone = (formData.get('emergencyContactPhone') as string)?.trim() || null;

  if (!fullName || !email) {
    return { error: 'Member full name and email are required.' };
  }

  // Only ADMIN can assign officer or admin roles
  if (role !== 'MEMBER' && actor.role !== 'ADMIN') {
    return { error: 'Only administrators can assign leadership roles.' };
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return { error: 'A member with this email address already exists.' };
  }

  const id = `usr_${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(temporaryPassword);

  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, full_name, preferred_name, phone, voice_part,
      role, status, address, emergency_contact_name, emergency_contact_phone,
      officer_notes, join_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email,
    passwordHash,
    fullName,
    fullName.split(' ')[0],
    phone,
    voicePart,
    role,
    'ACTIVE',
    address,
    emergencyName,
    emergencyPhone,
    officerNotes,
    now.slice(0, 10),
    now,
    now
  );

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_MEMBER',
    entityType: 'USER',
    entityId: id,
    details: { fullName, email, role, voicePart },
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
  const voicePart = (formData.get('voicePart') as VoicePart) || null;
  const role = formData.get('role') as UserRole;
  const officerNotes = (formData.get('officerNotes') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const emergencyName = (formData.get('emergencyContactName') as string)?.trim() || null;
  const emergencyPhone = (formData.get('emergencyContactPhone') as string)?.trim() || null;

  if (!memberId || !fullName || !email) {
    return { error: 'Member ID, name, and email are required.' };
  }

  const db = getDb();
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(memberId) as { role: UserRole } | undefined;
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
  db.prepare(`
    UPDATE users SET
      full_name = ?,
      email = ?,
      phone = ?,
      voice_part = ?,
      role = ?,
      officer_notes = ?,
      address = ?,
      emergency_contact_name = ?,
      emergency_contact_phone = ?,
      updated_at = ?
    WHERE id = ?
  `).run(fullName, email, phone, voicePart, updatedRole, officerNotes, address, emergencyName, emergencyPhone, now, memberId);

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'UPDATE_MEMBER',
    entityType: 'USER',
    entityId: memberId,
    details: { fullName, email, role: updatedRole },
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

  const db = getDb();
  const now = new Date().toISOString();

  // If deactivating, invalidate any active sessions
  if (newStatus !== 'ACTIVE') {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(memberId);
  }

  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, memberId);

  logAudit({
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

