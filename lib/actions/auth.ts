'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import {
  SESSION_COOKIE_NAME,
  createSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  isFirstAdminNeeded,
} from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { User } from '@/lib/types';

export async function signInAction(prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both your email address and password.' };
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (!user) {
    return { error: 'Invalid email or password.' };
  }

  if (user.status !== 'ACTIVE') {
    return { error: 'This account has been deactivated. Please contact your choir administrator.' };
  }

  const isMatch = await verifyPassword(password, user.password_hash);
  if (!isMatch) {
    return { error: 'Invalid email or password.' };
  }

  // Create session
  const { token, session } = createSession(user.id, db);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expires_at),
  });

  logAudit({
    actorId: user.id,
    actorName: user.full_name,
    action: 'USER_SIGN_IN',
    entityType: 'SESSION',
    entityId: session.id,
  });

  redirect('/dashboard');
}

export async function signOutAction() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const user = await getCurrentUser();
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    cookieStore.delete(SESSION_COOKIE_NAME);

    if (user) {
      logAudit({
        actorId: user.id,
        actorName: user.full_name,
        action: 'USER_SIGN_OUT',
        entityType: 'SESSION',
      });
    }
  }

  redirect('/login');
}

export async function setupFirstAdminAction(prevState: unknown, formData: FormData) {
  const db = getDb();
  if (!isFirstAdminNeeded(db)) {
    return { error: 'Administrator already exists. Initial setup is locked.' };
  }

  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!fullName || !email || !password) {
    return { error: 'All fields are required.' };
  }

  if (!email.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const id = `usr_admin_${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, full_name, preferred_name, phone, voice_part,
      role, status, join_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email,
    passwordHash,
    fullName,
    fullName.split(' ')[0],
    null,
    'Director',
    'ADMIN',
    'ACTIVE',
    now.slice(0, 10),
    now,
    now
  );

  logAudit({
    actorId: id,
    actorName: fullName,
    action: 'INITIALIZE_FIRST_ADMIN',
    entityType: 'USER',
    entityId: id,
    details: { email, role: 'ADMIN' },
  });

  const { token, session } = createSession(id, db);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expires_at),
  });

  redirect('/dashboard');
}

export async function updateProfileAction(prevState: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Authentication required.' };
  }

  const preferredName = (formData.get('preferredName') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const emergencyName = (formData.get('emergencyContactName') as string)?.trim() || null;
  const emergencyPhone = (formData.get('emergencyContactPhone') as string)?.trim() || null;
  const birthDate = (formData.get('birthDate') as string)?.trim() || null;

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET
      preferred_name = ?,
      phone = ?,
      address = ?,
      emergency_contact_name = ?,
      emergency_contact_phone = ?,
      birth_date = ?,
      updated_at = ?
    WHERE id = ?
  `).run(preferredName, phone, address, emergencyName, emergencyPhone, birthDate, now, user.id);

  logAudit({
    actorId: user.id,
    actorName: user.full_name,
    action: 'UPDATE_OWN_PROFILE',
    entityType: 'USER',
    entityId: user.id,
  });

  revalidatePath('/profile');
  return { success: 'Profile updated successfully.' };
}

export async function changePasswordAction(prevState: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Authentication required.' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword) {
    return { error: 'Please fill in all password fields.' };
  }

  if (newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters long.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match.' };
  }

  const isMatch = await verifyPassword(currentPassword, user.password_hash);
  if (!isMatch) {
    return { error: 'Current password is incorrect.' };
  }

  const db = getDb();
  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
  `).run(passwordHash, now, user.id);

  logAudit({
    actorId: user.id,
    actorName: user.full_name,
    action: 'CHANGE_PASSWORD',
    entityType: 'USER',
    entityId: user.id,
  });

  revalidatePath('/profile');
  return { success: 'Password changed successfully.' };
}
