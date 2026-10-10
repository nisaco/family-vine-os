import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, isFirstAdminNeeded } from '@/lib/auth';
import { getChoirSettings } from '@/lib/data';
import { Navigation } from '@/components/layout/Navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isFirstAdminNeeded()) {
    redirect('/setup');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settings = getChoirSettings();

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      <Navigation user={user} choirName={settings.choir_name} />
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

