import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getEvents, getChoirSettings, getEventRsvps, getUserRsvpForEvent } from '@/lib/data';
import { EventsClient } from '@/components/events/EventsClient';
import type { EventRsvp } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settings = getChoirSettings();
  const events = getEvents(true);

  const userRsvps: Record<string, EventRsvp> = {};
  const allRsvpsByEvent: Record<string, EventRsvp[]> = {};

  for (const event of events) {
    const rsvp = getUserRsvpForEvent(event.id, user.id);
    if (rsvp) {
      userRsvps[event.id] = rsvp;
    }
    allRsvpsByEvent[event.id] = getEventRsvps(event.id);
  }

  return (
    <EventsClient
      events={events}
      userRsvps={userRsvps}
      allRsvpsByEvent={allRsvpsByEvent}
      currentUserRole={user.role}
      timezone={settings.timezone}
    />
  );
}

