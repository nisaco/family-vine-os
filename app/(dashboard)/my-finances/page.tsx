import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserPaymentSummary, getChoirSettings } from '@/lib/data';
import { MyFinancesClient } from '@/components/finance/MyFinancesClient';

export const dynamic = 'force-dynamic';

export default async function MyFinancesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [settings, summary] = await Promise.all([
    getChoirSettings(),
    getUserPaymentSummary(user.id),
  ]);

  return (
    <MyFinancesClient
      payments={summary.payments}
      totalPaidCents={summary.totalPaidCents}
      currencySymbol={settings.currency_symbol}
      currencyCode={settings.currency_code}
      timezone={settings.timezone}
      userName={user.full_name}
      choirName={settings.choir_name}
    />
  );
}
