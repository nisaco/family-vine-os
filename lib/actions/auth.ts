'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { deleteDocuments, findOne, insertDocument, updateDocument } from '@/lib/db';
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

  try {
    const user = await findOne<User>(
      'users',
      { email },
      { collation: { locale: 'en', strength: 2 } }
    );

    if (!user) {
      return { error: 'Invalid email or password.' };
    }

    if (user.status !== 'ACTIVE') {
      return { error: 'This account has been deactivated. Please contact your choir administrator.' };
    }

    const isMatch = user.password_hash ? await verifyPassword(password, user.password_hash) : false;
    if (!isMatch) {
      return { error: 'Invalid email or password.' };
    }

    // Create session
    const { token, session } = await createSession(user.id);
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expires_at),
    });

    await logAudit({
      actorId: user.id,
      actorName: user.full_name,
      action: 'USER_SIGN_IN',
      entityType: 'SESSION',
      entityId: session.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Database error';
    return { error: `Authentication service unavailable: ${msg}` };
  }

  redirect('/dashboard');
}

export async function signOutAction() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const user = await getCurrentUser();
    await deleteDocuments('sessions', { token });
    cookieStore.delete(SESSION_COOKIE_NAME);

    if (user) {
      await logAudit({
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

  try {
    if (!(await isFirstAdminNeeded())) {
      return { error: 'Administrator already exists. Initial setup is locked.' };
    }

    const id = `usr_admin_${Date.now()}`;
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);

    await insertDocument('users', {
      id,
      email,
      password_hash: passwordHash,
      full_name: fullName,
      preferred_name: fullName.split(' ')[0],
      phone: null,
      voice_part: 'Director',
      role: 'ADMIN',
      status: 'ACTIVE',
      join_date: now.slice(0, 10),
      created_at: now,
      updated_at: now,
      is_initial_admin: true,
    });

    await logAudit({
      actorId: id,
      actorName: fullName,
      action: 'INITIALIZE_FIRST_ADMIN',
      entityType: 'USER',
      entityId: id,
      details: { email, role: 'ADMIN' },
    });

    const { token, session } = await createSession(id);
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expires_at),
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return { error: 'Administrator already exists. Initial setup is locked.' };
    }
    const msg = error instanceof Error ? error.message : 'Database error';
    return { error: `Setup failed: ${msg}` };
  }

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

  const now = new Date().toISOString();
  await updateDocument('users', { id: user.id }, {
    $set: {
      preferred_name: preferredName,
      phone,
      address,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      birth_date: birthDate,
      updated_at: now,
    },
  });

  await logAudit({
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

  const isMatch = user.password_hash
    ? await verifyPassword(currentPassword, user.password_hash)
    : false;
  if (!isMatch) {
    return { error: 'Current password is incorrect.' };
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await updateDocument('users', { id: user.id }, {
    $set: { password_hash: passwordHash, updated_at: now },
  });

  await logAudit({
    actorId: user.id,
    actorName: user.full_name,
    action: 'CHANGE_PASSWORD',
    entityType: 'USER',
    entityId: user.id,
  });

  revalidatePath('/profile');
  return { success: 'Password changed successfully.' };
}
