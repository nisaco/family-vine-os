import { NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { getFinancialTransactions, getChoirSettings } from '@/lib/data';
import { generateSafeCsv } from '@/lib/utils/csv';
import { formatCurrency } from '@/lib/utils/currency';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, 'VIEW_ALL_FINANCE')) {
    return new NextResponse('Unauthorized: Only authorized financial officers can export reports.', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | undefined;
  const status = searchParams.get('status') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const [settings, transactions] = await Promise.all([
    getChoirSettings(),
    getFinancialTransactions({ type, status, startDate, endDate }),
  ]);

  const headers = [
    'Date',
    'Type',
    'Receipt Number',
    'Category',
    'Description',
    'Payer / Payee',
    'Member Name',
    'Dues Period',
    `Amount (${settings.currency_code})`,
    'Payment Method',
    'Status',
    'Recorded By',
    'Reviewed By',
    'Reversal Reason',
  ];

  const rows = transactions.map((t) => [
    t.date,
    t.transaction_type,
    t.receipt_number || '',
    t.category_name || '',
    t.description,
    t.payee_or_source,
    t.member_name || '',
    t.dues_period || '',
    formatCurrency(t.amount_cents, '', settings.currency_code).trim(),
    t.payment_method,
    t.status,
    t.created_by_name || '',
    t.reviewed_by_name || '',
    t.reversal_reason || '',
  ]);

  const csvContent = generateSafeCsv(headers, rows);
  const fileName = `family_vine_financial_report_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
