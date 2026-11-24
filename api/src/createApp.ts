import cors from 'cors';
import express from 'express';
import { helmet } from './lib/helmet.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { createVideosRepository } from './repositories/videos.repository.js';
import { createRoutes, type RoutesDeps } from './routes/index.js';
import { runSync } from './services/sync.service.js';
import { checkEmbeddable } from './services/youtube.service.js';

export function createApp(deps: Partial<RoutesDeps> = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, methods: ['GET', 'POST'] }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'ViewNow API', docs: '/api/health' });
  });

  app.use(
    '/api',
    createRoutes({
      repository: deps.repository ?? createVideosRepository(),
      runSync: deps.runSync ?? ((trigger) => runSync(trigger)),
      cronSecret: deps.cronSecret ?? env.CRON_SECRET,
      checkEmbed: deps.checkEmbed ?? ((youtubeId) => checkEmbeddable(youtubeId)),
    }),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
