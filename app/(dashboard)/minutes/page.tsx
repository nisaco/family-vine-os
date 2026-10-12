import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getMeetings, getActionItems, getAllMembers, getChoirSettings } from '@/lib/data';
import { MinutesClient } from '@/components/minutes/MinutesClient';

export const dynamic = 'force-dynamic';

export default async function MinutesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settings = await getChoirSettings();

  const isOfficer =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'GENERAL_SECRETARY' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER';

  const [meetings, actionItems, members] = await Promise.all([
    getMeetings(isOfficer),
    getActionItems(),
    getAllMembers(user.role, user.id),
  ]);

  return (
    <MinutesClient
      meetings={meetings}
      actionItems={actionItems}
      members={members}
      currentUserRole={user.role}
      currentUserId={user.id}
      timezone={settings.timezone}
    />
  );
}
