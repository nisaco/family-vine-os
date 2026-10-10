'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
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

  const db = getDb();
  const id = `ann_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO announcements (
      id, title, content, target_audience, is_pinned, is_archived,
      publish_at, expires_at, author_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(id, title, content, targetAudience, isPinned, now, expiresAt, actor.id, now, now);

  logAudit({
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

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE announcements SET is_archived = 1, updated_at = ? WHERE id = ?').run(now, id);

  revalidatePath('/announcements');
  revalidatePath('/dashboard');
  return { success: 'Announcement archived.' };
}

