import { Router } from 'express';
import { createSyncController, type RunSync } from '../controllers/sync.controller.js';
import { createVideosController } from '../controllers/videos.controller.js';
import { requireCronSecret } from '../middlewares/requireCronSecret.js';
import type { VideosRepository } from '../repositories/videos.repository.js';

export type RoutesDeps = {
  repository: VideosRepository;
  runSync: RunSync;
  cronSecret: string;
};

export function createRoutes({ repository, runSync, cronSecret }: RoutesDeps) {
  const routes = Router();
  const videos = createVideosController(repository);
  const sync = createSyncController(runSync);
  const auth = requireCronSecret(cronSecret);

  routes.get('/health', async (_req, res) => {
    const dbOk = await repository.ping();
    res
      .status(dbOk ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json({
        status: dbOk ? 'ok' : 'degraded',
        db: dbOk ? 'ok' : 'error',
        time: new Date().toISOString(),
      });
  });

  routes.get('/videos', videos.list);
  routes.get('/videos/:id', videos.show);
  routes.get('/videos/:id/embed', videos.embed);

  routes.post('/sync', auth, sync.manual);
  routes.get('/cron/sync', auth, sync.cron);

  return routes;
}
