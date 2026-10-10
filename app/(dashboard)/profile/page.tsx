import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileClient } from '@/components/profile/ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <ProfileClient user={user} />;
}

