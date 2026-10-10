'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
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

  const db = getDb();
  const now = new Date().toISOString();
  const id = `att_${eventId}_${userId}`;

  db.prepare(`
    INSERT INTO attendance_records (id, event_id, user_id, status, notes, recorded_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, user_id) DO UPDATE SET
      status = excluded.status,
      notes = excluded.notes,
      recorded_by = excluded.recorded_by,
      updated_at = excluded.updated_at
  `).run(id, eventId, userId, status, notes || null, actor.id, now, now);

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

  const db = getDb();
  const existing = db.prepare(`
    SELECT a.*, u.full_name as user_name
    FROM attendance_records a
    JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `).get(recordId) as { status: string; user_name: string; event_id: string } | undefined;

  if (!existing) {
    return { error: 'Attendance record not found.' };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE attendance_records SET
      status = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `).run(newStatus, `Corrected by ${actor.full_name}: ${reason}`, now, recordId);

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'ATTENDANCE_CORRECTED',
    entityType: 'ATTENDANCE_RECORD',
    entityId: recordId,
    details: {
      member: existing.user_name,
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

