import type { RequestHandler } from 'express';
import type { SyncTrigger } from '../repositories/videos.repository.js';
import type { SyncResult } from '../services/sync.service.js';

export type RunSync = (trigger: SyncTrigger) => Promise<SyncResult>;

export function createSyncController(runSync: RunSync) {
  const handle =
    (trigger: SyncTrigger): RequestHandler =>
    async (_req, res) => {
      const result = await runSync(trigger);
      res.set('Cache-Control', 'no-store').json({ data: result });
    };

  return { manual: handle('manual'), cron: handle('cron') };
}
