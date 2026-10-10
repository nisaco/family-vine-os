'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
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
  const location = (formData.get('location') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const rsvpDeadline = (formData.get('rsvpDeadline') as string) || null;

  if (!title || !eventType || !startTime || !location) {
    return { error: 'Title, event type, date/time, and location are required.' };
  }

  const db = getDb();
  const id = `evt_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO events (
      id, title, event_type, start_time, end_time, location, description,
      organizer_id, rsvp_deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
  `).run(id, title, eventType, startTime, endTime, location, description, actor.id, rsvpDeadline, now, now);

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_EVENT',
    entityType: 'EVENT',
    entityId: id,
    details: { title, eventType, startTime, location },
  });

  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: `Event "${title}" scheduled successfully.` };
}

export async function cancelEventAction(eventId: string) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_EVENTS')) {
    return { error: 'Unauthorized: You do not have permission to cancel events.' };
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE events SET status = 'CANCELLED', updated_at = ? WHERE id = ?
  `).run(now, eventId);

  logAudit({
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

  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as { status: string } | undefined;
  if (!event || event.status === 'CANCELLED') {
    return { error: 'Cannot RSVP to a cancelled or non-existent event.' };
  }

  const now = new Date().toISOString();
  const id = `rsvp_${eventId}_${actor.id}`;

  db.prepare(`
    INSERT INTO event_rsvps (id, event_id, user_id, status, apology_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, user_id) DO UPDATE SET
      status = excluded.status,
      apology_reason = excluded.apology_reason,
      updated_at = excluded.updated_at
  `).run(id, eventId, actor.id, status, apologyReason, now, now);

  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: 'Your RSVP has been recorded.' };
}
