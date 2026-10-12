'use server';

import { revalidatePath } from 'next/cache';
import { findOne, insertDocument, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { MeetingType, ActionItemStatus } from '@/lib/types';

export async function createMeetingAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_MINUTES')) {
    return { error: 'Unauthorized: Only the General Secretary or Administrator can record meeting minutes.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const meetingType = (formData.get('meetingType') as MeetingType) || 'OFFICER_MEETING';
  const date = formData.get('date') as string;
  const location = (formData.get('location') as string)?.trim() || null;
  const minutes = (formData.get('minutes') as string)?.trim();
  const isConfidential = formData.get('isConfidential') === 'on' ? 1 : 0;

  if (!title || !date || !minutes) {
    return { error: 'Meeting title, date, and minutes are required.' };
  }

  const id = `mtg_${Date.now()}`;
  const now = new Date().toISOString();

  await insertDocument('meetings', {
    id, title, meeting_type: meetingType, date, location, minutes,
    is_confidential: isConfidential, created_by: actor.id, created_at: now, updated_at: now,
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_MEETING_MINUTES',
    entityType: 'MEETING',
    entityId: id,
    details: { title, meetingType, date, isConfidential },
  });

  revalidatePath('/minutes');
  return { success: 'Meeting minutes saved successfully.' };
}

export async function createActionItemAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_MINUTES')) {
    return { error: 'Unauthorized: You do not have permission to assign action items.' };
  }

  const meetingId = (formData.get('meetingId') as string) || null;
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const assignedTo = formData.get('assignedTo') as string;
  const dueDate = (formData.get('dueDate') as string) || null;

  if (!title || !assignedTo) {
    return { error: 'Action item title and assignee are required.' };
  }

  const id = `act_${Date.now()}`;
  const now = new Date().toISOString();

  await insertDocument('action_items', {
    id, meeting_id: meetingId, title, description, assigned_to: assignedTo, due_date: dueDate,
    status: 'PENDING', created_by: actor.id, created_at: now, updated_at: now,
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_ACTION_ITEM',
    entityType: 'ACTION_ITEM',
    entityId: id,
    details: { title, assignedTo, dueDate },
  });

  revalidatePath('/minutes');
  revalidatePath('/dashboard');
  return { success: 'Action item assigned successfully.' };
}

export async function updateActionItemStatusAction(id: string, newStatus: ActionItemStatus) {
  const actor = await getCurrentUser();
  if (!actor) {
    return { error: 'Authentication required.' };
  }

  const existing = await findOne<{
    assigned_to: string;
    created_by: string;
  }>('action_items', { id });

  if (!existing) {
    return { error: 'Action item not found.' };
  }

  // Assignee, Secretary, or Admin can update status
  const canUpdate =
    actor.id === existing.assigned_to ||
    actor.id === existing.created_by ||
    hasPermission(actor.role, 'MANAGE_MINUTES');

  if (!canUpdate) {
    return { error: 'Unauthorized: You can only update action items assigned to you.' };
  }

  const now = new Date().toISOString();
  await updateDocument('action_items', { id }, { $set: { status: newStatus, updated_at: now } });

  revalidatePath('/minutes');
  revalidatePath('/dashboard');
  return { success: 'Status updated.' };
}
