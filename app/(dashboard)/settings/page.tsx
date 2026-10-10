import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getChoirSettings, getAuditLogs } from '@/lib/data';
import { SettingsClient } from '@/components/settings/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Strict role check: Settings & System Audit log is restricted to ADMIN
  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const settings = getChoirSettings();
  const auditLogs = getAuditLogs(100, 0);

  return (
    <SettingsClient
      settings={settings}
      auditLogs={auditLogs}
      currentUserRole={user.role}
    />
  );
}

