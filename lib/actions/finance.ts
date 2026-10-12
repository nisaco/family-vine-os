'use server';

import { revalidatePath } from 'next/cache';
import { findMany, findOne, getCollection, insertDocument, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import { parseCurrencyToCents, validatePositiveCents } from '@/lib/utils/currency';
import type { PaymentMethod } from '@/lib/types';

async function generateReceiptNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `REC-${currentYear}-`;
  const counterId = `receipt-${currentYear}`;
  const counters = await getCollection('counters');
  const counter = await counters.findOne<{ value: number }>({ id: counterId });

  if (!counter) {
    const existingReceipts = await findMany<{ receipt_number: string }>(
      'financial_transactions',
      { receipt_number: { $regex: `^${prefix}` } },
      { receipt_number: -1 },
      1
    );
    const latestSequence = existingReceipts[0]?.receipt_number.split('-')[2];
    const initialValue = latestSequence ? parseInt(latestSequence, 10) || 0 : 0;
    try {
      await counters.insertOne({ id: counterId, value: initialValue });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    }
  }

  const updatedCounter = await counters.findOneAndUpdate(
    { id: counterId },
    { $inc: { value: 1 } },
    { returnDocument: 'after' }
  );
  if (!updatedCounter || typeof updatedCounter.value !== 'number') {
    throw new Error('Unable to allocate a unique financial receipt number.');
  }
  return `${prefix}${updatedCounter.value.toString().padStart(4, '0')}`;
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

  const receiptNumber = await generateReceiptNumber();
  const id = `tx_${Date.now()}`;
  const now = new Date().toISOString();

  await insertDocument('financial_transactions', {
    id, transaction_type: 'INCOME', receipt_number: receiptNumber, category_id: categoryId,
    amount_cents: amountCents, date, member_id: memberId, dues_period: duesPeriod,
    payee_or_source: payeeOrSource, description, payment_method: paymentMethod,
    status: 'POSTED', reference_note: referenceNote, created_by: actor.id,
    reviewed_by: null, reviewed_at: null, reversal_of_id: null, reversal_reason: null,
    created_at: now, updated_at: now,
  });

  await logAudit({
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

  const id = `tx_${Date.now()}`;
  const now = new Date().toISOString();

  await insertDocument('financial_transactions', {
    id, transaction_type: 'EXPENSE', receipt_number: null, category_id: categoryId,
    amount_cents: amountCents, date, member_id: null, dues_period: null,
    payee_or_source: payeeOrSource, description, payment_method: paymentMethod,
    status: 'POSTED', reference_note: referenceNote, created_by: actor.id,
    reviewed_by: null, reviewed_at: null, reversal_of_id: null, reversal_reason: null,
    created_at: now, updated_at: now,
  });

  await logAudit({
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

  const existing = await findOne<{
    status: string;
    receipt_number: string;
    amount_cents: number;
    description: string;
  }>('financial_transactions', { id: transactionId });

  if (!existing) {
    return { error: 'Transaction not found.' };
  }

  if (existing.status !== 'POSTED') {
    return { error: 'Only posted transactions can be voided or corrected.' };
  }

  const now = new Date().toISOString();
  await updateDocument('financial_transactions', { id: transactionId }, {
    $set: { status: 'VOIDED', reversal_reason: reason, updated_at: now },
  });

  await logAudit({
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

  const existing = await findOne<{
    created_by: string;
    reviewed_by: string;
  }>('financial_transactions', { id: transactionId });

  if (!existing) {
    return { error: 'Transaction not found.' };
  }

  // Separation of duties rule: A user cannot approve their own entry if they created it!
  if (existing.created_by === actor.id && actor.role !== 'ADMIN') {
    return { error: 'Separation of duties policy: You cannot approve your own submitted entry. Another officer must review it.' };
  }

  const now = new Date().toISOString();
  await updateDocument('financial_transactions', { id: transactionId }, {
    $set: { reviewed_by: actor.id, reviewed_at: now, updated_at: now },
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'REVIEW_FINANCIAL_TRANSACTION',
    entityType: 'FINANCIAL_TRANSACTION',
    entityId: transactionId,
  });

  revalidatePath('/finance');
  return { success: 'Entry reviewed and marked as verified.' };
}
