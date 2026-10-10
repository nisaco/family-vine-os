import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAllMembers } from '@/lib/data';
import { DirectoryClient } from '@/components/members/DirectoryClient';

export const dynamic = 'force-dynamic';

export default async function DirectoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const members = getAllMembers(user.role, user.id);

  return (
    <DirectoryClient
      members={members}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  );
}
