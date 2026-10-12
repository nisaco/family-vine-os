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

  const [settings, events] = await Promise.all([getChoirSettings(), getEvents(true)]);

  const rsvpData = await Promise.all(events.map(async (event) => ({
    eventId: event.id,
    userRsvp: await getUserRsvpForEvent(event.id, user.id),
    allRsvps: await getEventRsvps(event.id),
  })));
  const userRsvps = Object.fromEntries(
    rsvpData.flatMap(({ eventId, userRsvp }) => userRsvp ? [[eventId, userRsvp]] : [])
  ) as Record<string, EventRsvp>;
  const allRsvpsByEvent = Object.fromEntries(rsvpData.map(({ eventId, allRsvps }) => [eventId, allRsvps]));

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
