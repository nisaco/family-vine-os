'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/db/audit';
import type { Voicing, SongCategory, ResourceType } from '@/lib/types';

export async function createSongAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_SONGS')) {
    return { error: 'Unauthorized: You do not have permission to add choir repertoire.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const composer = (formData.get('composer') as string)?.trim() || null;
  const voicing = (formData.get('voicing') as Voicing) || 'SATB';
  const category = (formData.get('category') as SongCategory) || 'HYMN';
  const keySignature = (formData.get('keySignature') as string)?.trim() || null;
  const tempo = (formData.get('tempo') as string)?.trim() || null;
  const lyricsOrScripture = (formData.get('lyricsOrScripture') as string)?.trim() || null;
  const notes = (formData.get('notes') as string)?.trim() || null;

  if (!title) {
    return { error: 'Song title is required.' };
  }

  const db = getDb();
  const id = `sng_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO songs (
      id, title, composer_or_arranger, voicing, category, key_signature,
      tempo, lyrics_or_scripture, notes, is_archived, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(id, title, composer, voicing, category, keySignature, tempo, lyricsOrScripture, notes, actor.id, now, now);

  logAudit({
    actorId: actor.id,
    actorName: actor.full_name,
    action: 'CREATE_SONG',
    entityType: 'SONG',
    entityId: id,
    details: { title, voicing, category },
  });

  revalidatePath('/songs');
  return { success: `"${title}" added to choir library.` };
}

export async function addSongResourceAction(prevState: unknown, formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor.role, 'MANAGE_SONGS')) {
    return { error: 'Unauthorized: You do not have permission to attach resources.' };
  }

  const songId = formData.get('songId') as string;
  const resourceType = formData.get('resourceType') as ResourceType;
  const title = (formData.get('title') as string)?.trim();
  const url = (formData.get('url') as string)?.trim();
  const voicePart = (formData.get('voicePart') as string) || 'ALL';

  if (!songId || !title || !url) {
    return { error: 'Song ID, resource label, and URL link are required.' };
  }

  // URL basic validation
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { error: 'Resource URL must be a valid link starting with http:// or https://' };
  }

  const db = getDb();
  const id = `res_${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO song_resources (id, song_id, resource_type, title, url, voice_part, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, songId, resourceType, title, url, voicePart, now);

  revalidatePath('/songs');
  return { success: 'Resource link attached successfully.' };
}

