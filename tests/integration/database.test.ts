import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCollection } from '@/lib/db';
import { logAudit } from '@/lib/db/audit';

describe('MongoDB configuration and audit logging', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires a MongoDB connection string instead of falling back to local SQLite', async () => {
    vi.stubEnv('MONGODB_URI', '');

    await expect(getCollection('users')).rejects.toThrow(/MONGODB_URI must be configured/);
  });

  it('propagates database errors when an audit record cannot be persisted', async () => {
    vi.stubEnv('MONGODB_URI', '');

    await expect(logAudit({
      actorId: null,
      actorName: 'System',
      action: 'TEST',
      entityType: 'TEST',
    })).rejects.toThrow(/MONGODB_URI must be configured/);
  });
});
