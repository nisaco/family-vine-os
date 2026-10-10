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

  const settings = getChoirSettings();
  const events = getEvents(true);
  const members = getAllMembers(user.role, user.id);

  const recordsByEvent: Record<string, AttendanceRecord[]> = {};
  for (const event of events) {
    recordsByEvent[event.id] = getEventAttendance(event.id);
  }

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
