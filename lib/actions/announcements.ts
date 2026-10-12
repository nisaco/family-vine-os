'use server';

import { revalidatePath } from 'next/cache';
import { insertDocument, updateDocument } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { AnnouncementAudience } from '@/lib/types';

export async function createAnnouncementAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_ANNOUNCEMENTS')) {
    return { error: 'Unauthorized: You do not have permission to publish announcements.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const content = (formData.get('content') as string)?.trim();
  const targetAudience = (formData.get('targetAudience') as AnnouncementAudience) || 'ALL';
  const isPinned = formData.get('isPinned') === 'on' ? 1 : 0;
  const expiresAt = (formData.get('expiresAt') as string) || null;

  if (!title || !content) {
    return { error: 'Title and announcement content are required.' };
  }

  const id = `ann_${Date.now()}`;
  const now = new Date().toISOString();

  await insertDocument('announcements', {
    id,
    title,
    content,
    target_audience: targetAudience,
    is_pinned: isPinned,
    is_archived: 0,
    publish_at: now,
    expires_at: expiresAt,
    author_id: actor.id,
    created_at: now,
    updated_at: now,
  });

  await logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_ANNOUNCEMENT',
    entityType: 'ANNOUNCEMENT',
    entityId: id,
    details: { title, targetAudience, isPinned },
  });

  revalidatePath('/announcements');
  revalidatePath('/dashboard');
  return { success: 'Announcement published successfully.' };
}

export async function archiveAnnouncementAction(id: string) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_ANNOUNCEMENTS')) {
    return { error: 'Unauthorized: You do not have permission to archive announcements.' };
  }

  const now = new Date().toISOString();
  await updateDocument('announcements', { id }, { $set: { is_archived: 1, updated_at: now } });

  revalidatePath('/announcements');
  revalidatePath('/dashboard');
  return { success: 'Announcement archived.' };
}
