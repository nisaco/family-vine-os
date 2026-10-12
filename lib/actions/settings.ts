'use server';

import { revalidatePath } from 'next/cache';
import { getCollection } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import { parseCurrencyToCents } from '@/lib/utils/currency';

export async function updateSettingsAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_SETTINGS')) {
    return { error: 'Unauthorized: Only administrators can modify choir configuration settings.' };
  }

  const choirName = (formData.get('choirName') as string)?.trim();
  const motto = (formData.get('motto') as string)?.trim();
  const timezone = (formData.get('timezone') as string)?.trim() || 'UTC';
  const currencyCode = (formData.get('currencyCode') as string)?.trim().toUpperCase() || 'USD';
  const currencySymbol = (formData.get('currencySymbol') as string)?.trim() || '$';
  const contactEmail = (formData.get('contactEmail') as string)?.trim();
  const contactPhone = (formData.get('contactPhone') as string)?.trim();
  const duesStr = formData.get('standardMonthlyDues') as string;
  const allowBirthdays = formData.get('allowMemberBirthdayView') === 'on' ? 'true' : 'false';

  if (!choirName || !currencyCode || !currencySymbol) {
    return { error: 'Choir name, currency code, and currency symbol are required.' };
  }

  let duesCents = 2500;
  if (duesStr) {
    try {
      duesCents = parseCurrencyToCents(duesStr);
    } catch {
      return { error: 'Invalid standard monthly dues amount.' };
    }
  }

  const now = new Date().toISOString();

  const updates: [string, string][] = [
    ['choir_name', choirName],
    ['motto', motto || ''],
    ['timezone', timezone],
    ['currency_code', currencyCode],
    ['currency_symbol', currencySymbol],
    ['contact_email', contactEmail || ''],
    ['contact_phone', contactPhone || ''],
    ['standard_monthly_dues_cents', duesCents.toString()],
    ['allow_member_birthday_view', allowBirthdays],
  ];

  const settings = await getCollection('settings');
  await settings.bulkWrite(updates.map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { $set: { key, value, updated_at: now } },
      upsert: true,
    },
  })));

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'UPDATE_SETTINGS',
    entityType: 'SETTINGS',
    details: { choirName, timezone, currencyCode, currencySymbol, duesCents },
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: 'Choir settings updated successfully.' };
}
