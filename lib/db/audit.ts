import { getDb } from './index';
import crypto from 'crypto';

export interface AuditParams {
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export function logAudit(params: AuditParams, customDb?: ReturnType<typeof getDb>): void {
  try {
    const db = customDb || getDb();
    const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const detailsStr = params.details
      ? typeof params.details === 'string'
        ? params.details
        : JSON.stringify(params.details)
      : null;

    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_name, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.actorId || null,
      params.actorName,
      params.action,
      params.entityType,
      params.entityId || null,
      detailsStr,
      params.ipAddress || null,
      now
    );
  } catch (error) {
    // Avoid crashing primary flows if audit write fails, but log error
    console.error('Failed to write audit log:', error);
  }
}
