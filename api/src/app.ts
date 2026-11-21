import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { routes } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, methods: ['GET', 'POST'] }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'ViewNow API', docs: '/api/health' });
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
