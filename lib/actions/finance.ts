'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import { parseCurrencyToCents, validatePositiveCents } from '@/lib/utils/currency';
import type { PaymentMethod } from '@/lib/types';

function generateReceiptNumber(db: ReturnType<typeof getDb>): string {
  const currentYear = new Date().getFullYear();
  const prefix = `REC-${currentYear}-`;
  const latest = db.prepare(`
    SELECT receipt_number FROM financial_transactions
    WHERE receipt_number LIKE ?
    ORDER BY receipt_number DESC
    LIMIT 1
  `).get(`${prefix}%`) as { receipt_number: string } | undefined;

  let nextSequence = 1;
  if (latest?.receipt_number) {
    const parts = latest.receipt_number.split('-');
    const seq = parseInt(parts[2], 10);
    if (!isNaN(seq)) {
      nextSequence = seq + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(4, '0')}`;
}

export async function createIncomeTransactionAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'CREATE_FINANCE_INCOME')) {
    return { error: 'Unauthorized: You do not have permission to record choir income or dues.' };
  }

  const amountStr = formData.get('amount') as string;
  const categoryId = formData.get('categoryId') as string;
  const date = formData.get('date') as string;
  const memberId = (formData.get('memberId') as string) || null;
  const duesPeriod = (formData.get('duesPeriod') as string)?.trim() || null;
  const payeeOrSource = (formData.get('payeeOrSource') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const paymentMethod = (formData.get('paymentMethod') as PaymentMethod) || 'CASH';
  const referenceNote = (formData.get('referenceNote') as string)?.trim() || null;

  if (!amountStr || !categoryId || !date || !payeeOrSource || !description) {
    return { error: 'Amount, category, date, payer/source, and description are required.' };
  }

  let amountCents: number;
  try {
    amountCents = parseCurrencyToCents(amountStr);
  } catch (err) {
    return { error: (err as Error).message };
  }

  const check = validatePositiveCents(amountCents);
  if (!check.valid) {
    return { error: check.error };
  }

  const db = getDb();
  const receiptNumber = generateReceiptNumber(db);
  const id = `tx_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO financial_transactions (
      id, transaction_type, receipt_number, category_id, amount_cents, date,
      member_id, dues_period, payee_or_source, description, payment_method,
      status, reference_note, created_by, created_at, updated_at
    ) VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?)
  `).run(
    id,
    receiptNumber,
    categoryId,
    amountCents,
    date,
    memberId,
    duesPeriod,
    payeeOrSource,
    description,
    paymentMethod,
    referenceNote,
    actor.id,
    now,
    now
  );

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'RECORD_FINANCIAL_INCOME',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: id,
    details: { receiptNumber, amountCents, date, payeeOrSource, memberId },
  });

  revalidatePath('/finance');
  revalidatePath('/my-finances');
  revalidatePath('/dashboard');
  return { success: `Receipt ${receiptNumber} generated and payment recorded successfully.` };
}

export async function createExpenseTransactionAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'CREATE_FINANCE_EXPENSE')) {
    return { error: 'Unauthorized: Only the Treasurer and Administrator can record expenditures.' };
  }

  const amountStr = formData.get('amount') as string;
  const categoryId = formData.get('categoryId') as string;
  const date = formData.get('date') as string;
  const payeeOrSource = (formData.get('payeeOrSource') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const paymentMethod = (formData.get('paymentMethod') as PaymentMethod) || 'CASH';
  const referenceNote = (formData.get('referenceNote') as string)?.trim() || null;

  if (!amountStr || !categoryId || !date || !payeeOrSource || !description) {
    return { error: 'Amount, category, date, payee/vendor, and description are required.' };
  }

  let amountCents: number;
  try {
    amountCents = parseCurrencyToCents(amountStr);
  } catch (err) {
    return { error: (err as Error).message };
  }

  const check = validatePositiveCents(amountCents);
  if (!check.valid) {
    return { error: check.error };
  }

  const db = getDb();
  const id = `tx_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO financial_transactions (
      id, transaction_type, receipt_number, category_id, amount_cents, date,
      member_id, dues_period, payee_or_source, description, payment_method,
      status, reference_note, created_by, created_at, updated_at
    ) VALUES (?, 'EXPENSE', NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, 'POSTED', ?, ?, ?, ?)
  `).run(
    id,
    categoryId,
    amountCents,
    date,
    payeeOrSource,
    description,
    paymentMethod,
    referenceNote,
    actor.id,
    now,
    now
  );

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'RECORD_FINANCIAL_EXPENSE',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: id,
    details: { amountCents, date, payeeOrSource, description },
  });

  revalidatePath('/finance');
  revalidatePath('/dashboard');
  return { success: 'Expense disbursement recorded successfully.' };
}

export async function voidOrReverseTransactionAction(
  transactionId: string,
  reason: string
) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'REVERSE_FINANCE')) {
    return { error: 'Unauthorized: You do not have permission to void or reverse ledger entries.' };
  }

  if (!reason || reason.trim().length < 5) {
    return { error: 'A detailed reversal reason is mandatory for financial integrity and auditing.' };
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(transactionId) as {
    status: string;
    receipt_number: string;
    amount_cents: number;
    description: string;
  } | undefined;

  if (!existing) {
    return { error: 'Transaction not found.' };
  }

  if (existing.status !== 'POSTED') {
    return { error: 'Only posted transactions can be voided or corrected.' };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE financial_transactions SET
      status = 'VOIDED',
      reversal_reason = ?,
      updated_at = ?
    WHERE id = ?
  `).run(reason, now, transactionId);

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'VOID_FINANCIAL_TRANSACTION',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: transactionId,
    details: {
      receiptNumber: existing.receipt_number,
      amountCents: existing.amount_cents,
      reason,
    },
  });

  revalidatePath('/finance');
  revalidatePath('/my-finances');
  revalidatePath('/dashboard');
  return { success: 'Transaction marked as VOIDED with audit explanation logged.' };
}

export async function reviewTransactionAction(transactionId: string) {
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== 'TREASURER' && actor.role !== 'FINANCIAL_SECRETARY' && actor.role !== 'ADMIN')) {
    return { error: 'Unauthorized: Only financial officers can review ledger entries.' };
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(transactionId) as {
    created_by: string;
    reviewed_by: string;
  } | undefined;

  if (!existing) {
    return { error: 'Transaction not found.' };
  }

  // Separation of duties rule: A user cannot approve their own entry if they created it!
  if (existing.created_by === actor.id && actor.role !== 'ADMIN') {
    return { error: 'Separation of duties policy: You cannot approve your own submitted entry. Another officer must review it.' };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE financial_transactions SET
      reviewed_by = ?,
      reviewed_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(actor.id, now, now, transactionId);

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'REVIEW_FINANCIAL_TRANSACTION',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: transactionId,
  });

  revalidatePath('/finance');
  return { success: 'Entry reviewed and marked as verified.' };
}
