import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAnnouncements, getChoirSettings } from '@/lib/data';
import { AnnouncementsClient } from '@/components/announcements/AnnouncementsClient';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settings = getChoirSettings();
  const announcements = getAnnouncements(user.role, user.voice_part, user.wing);

  return (
    <AnnouncementsClient
      announcements={announcements}
      currentUserRole={user.role}
      timezone={settings.timezone}
    />
  );
}

