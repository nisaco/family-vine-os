import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import {
  getFinancialTransactions,
  getFinancialCategories,
  getFinancialSummary,
  getChoirSettings,
  getAllMembers,
} from '@/lib/data';
import { FinanceClient } from '@/components/finance/FinanceClient';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Server-side permission check: Unauthorized users are strictly redirected
  if (!hasPermission(user.role, 'VIEW_ALL_FINANCE')) {
    redirect('/my-finances');
  }

  const settings = getChoirSettings();
  const transactions = getFinancialTransactions();
  const categories = getFinancialCategories();
  const summary = getFinancialSummary();
  const members = getAllMembers(user.role, user.id);

  return (
    <FinanceClient
      transactions={transactions}
      categories={categories}
      members={members}
      currencySymbol={settings.currency_symbol}
      currencyCode={settings.currency_code}
      timezone={settings.timezone}
      currentUserRole={user.role}
      currentUserId={user.id}
      summary={summary}
    />
  );
}

