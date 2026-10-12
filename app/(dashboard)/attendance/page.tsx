import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { getEvents, getAllMembers, getChoirSettings, getEventAttendance } from '@/lib/data';
import { AttendanceTakerClient } from '@/components/attendance/AttendanceTakerClient';
import type { AttendanceRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Strict role-based guard
  if (!hasPermission(user.role, 'TAKE_ATTENDANCE')) {
    redirect('/my-attendance');
  }

  const [settings, events, members] = await Promise.all([
    getChoirSettings(),
    getEvents(true),
    getAllMembers(user.role, user.id),
  ]);

  const eventRecords = await Promise.all(events.map(async (event) => [event.id, await getEventAttendance(event.id)] as const));
  const recordsByEvent = Object.fromEntries(eventRecords) as Record<string, AttendanceRecord[]>;

  const initialEventId = events[0]?.id || '';

  return (
    <AttendanceTakerClient
      events={events}
      members={members}
      recordsByEvent={recordsByEvent}
      initialEventId={initialEventId}
      timezone={settings.timezone}
      currentUserRole={user.role}
    />
  );
}
