import crypto from 'crypto';
import { insertDocument } from './index';

export interface AuditParams {
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const details = params.details
    ? typeof params.details === 'string'
      ? params.details
      : JSON.stringify(params.details)
    : null;

  await insertDocument('audit_logs', {
    id,
    actor_id: params.actorId || null,
    actor_name: params.actorName,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    details,
    ip_address: params.ipAddress || null,
    created_at: new Date().toISOString(),
  });
}
