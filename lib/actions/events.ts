'use server';

import { revalidatePath } from 'next/cache';
import { findOne, insertDocument, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { EventType, RsvpStatus } from '@/lib/types';

export async function createEventAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_EVENTS')) {
    return { error: 'Unauthorized: You do not have permission to schedule choir events.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const eventType = formData.get('eventType') as EventType;
  const startTime = formData.get('startTime') as string;
  const endTime = (formData.get('endTime') as string) || null;
  const callTime = (formData.get('callTime') as string)?.trim() || null;
  const attireNotes = (formData.get('attireNotes') as string)?.trim() || null;
  const location = (formData.get('location') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const targetWing = (formData.get('targetWing') as string)?.trim() || null;
  const rsvpDeadline = (formData.get('rsvpDeadline') as string) || null;

  if (!title || !eventType || !startTime || !location) {
    return { error: 'Title, event type, date/time, and location are required.' };
  }

  const id = `evt_${Date.now()}`;
  const now = new Date().toISOString();

  await insertDocument('events', {
    id, title, event_type: eventType, target_wing: targetWing === 'ALL' ? null : targetWing,
    start_time: startTime, end_time: endTime, call_time: callTime, attire_notes: attireNotes,
    location, description, organizer_id: actor.id, rsvp_deadline: rsvpDeadline,
    status: 'SCHEDULED', created_at: now, updated_at: now,
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_EVENT',
    entityType: 'EVENT',
    entityId: id,
    details: { title, eventType, targetWing, startTime, callTime, attireNotes, location },
  });

  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: `Event "${title}" scheduled successfully.` };
}

export async function updateEventAttireAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_EVENTS')) {
    return { error: 'Unauthorized: You do not have permission to update program attire.' };
  }

  const eventId = formData.get('eventId') as string;
  const attireNotes = (formData.get('attireNotes') as string)?.trim() || null;
  const callTime = (formData.get('callTime') as string)?.trim() || null;

  if (!eventId) {
    return { error: 'Event identifier is required.' };
  }

  const now = new Date().toISOString();

  await updateDocument('events', { id: eventId }, { $set: { attire_notes: attireNotes, call_time: callTime, updated_at: now } });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'UPDATE_EVENT_ATTIRE',
    entityType: 'EVENT',
    entityId: eventId,
    details: { attireNotes, callTime },
  });

  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: 'Program uniform & call time updated successfully.' };
}

export async function cancelEventAction(eventId: string) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_EVENTS')) {
    return { error: 'Unauthorized: You do not have permission to cancel events.' };
  }

  const now = new Date().toISOString();

  await updateDocument('events', { id: eventId }, { $set: { status: 'CANCELLED', updated_at: now } });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CANCEL_EVENT',
    entityType: 'EVENT',
    entityId: eventId,
  });

  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: 'Event has been cancelled.' };
}

export async function submitRsvpAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor) {
    return { error: 'You must be signed in to submit an RSVP.' };
  }

  const eventId = formData.get('eventId') as string;
  const status = formData.get('status') as RsvpStatus;
  const apologyReason = (formData.get('apologyReason') as string)?.trim() || null;

  if (!eventId || !status) {
    return { error: 'Event and RSVP response are required.' };
  }

  const event = await findOne<{ status: string }>('events', { id: eventId });
  if (!event || event.status === 'CANCELLED') {
    return { error: 'Cannot RSVP to a cancelled or non-existent event.' };
  }

  const now = new Date().toISOString();
  const id = `rsvp_${eventId}_${actor.id}`;

  await updateDocument('event_rsvps', { event_id: eventId, user_id: actor.id }, {
    $set: { status, apology_reason: apologyReason, updated_at: now },
    $setOnInsert: { id, event_id: eventId, user_id: actor.id, created_at: now },
  });

  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: 'Your RSVP has been recorded.' };
}
