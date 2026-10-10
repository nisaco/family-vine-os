import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSongs } from '@/lib/data';
import { SongsClient } from '@/components/songs/SongsClient';

export const dynamic = 'force-dynamic';

export default async function SongsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const songs = getSongs();

  return <SongsClient songs={songs} currentUserRole={user.role} />;
}

