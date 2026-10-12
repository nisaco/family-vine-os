'use server';

import { revalidatePath } from 'next/cache';
import { findOne, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { AttendanceStatus } from '@/lib/types';

export async function saveSingleAttendanceAction(
  eventId: string,
  userId: string,
  status: AttendanceStatus,
  notes?: string
) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'TAKE_ATTENDANCE')) {
    return { error: 'Unauthorized: You do not have permission to record attendance.' };
  }

  const now = new Date().toISOString();
  const id = `att_${eventId}_${userId}`;

  await updateDocument('attendance_records', { event_id: eventId, user_id: userId }, {
    $set: { status, notes: notes || null, recorded_by: actor.id, updated_at: now },
    $setOnInsert: { id, event_id: eventId, user_id: userId, created_at: now },
  });

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function correctAttendanceAction(
  recordId: string,
  newStatus: AttendanceStatus,
  reason: string
) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'TAKE_ATTENDANCE')) {
    return { error: 'Unauthorized: You do not have permission to correct attendance.' };
  }

  if (!reason || reason.trim().length < 3) {
    return { error: 'A correction reason is required for audit verification.' };
  }

  const existing = await findOne<{ status: string; event_id: string; user_id: string }>(
    'attendance_records',
    { id: recordId }
  );

  if (!existing) {
    return { error: 'Attendance record not found.' };
  }

  const member = await findOne<{ full_name: string }>('users', { id: existing.user_id });
  if (!member) {
    return { error: 'Member for this attendance record was not found.' };
  }

  const now = new Date().toISOString();
  await updateDocument('attendance_records', { id: recordId }, {
    $set: { status: newStatus, notes: `Corrected by ${actor.full_name}: ${reason}`, updated_at: now },
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'ATTENDANCE_CORRECTED',
    entityType: 'ATTENDANCE_RECORD',
    entityId: recordId,
    details: {
      member: member.full_name,
      previousStatus: existing.status,
      newStatus,
      reason,
      eventId: existing.event_id,
    },
  });

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  return { success: 'Attendance corrected and audit log recorded.' };
}
