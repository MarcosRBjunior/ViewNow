import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
// Etapa 3: routes.use('/videos', videosRoutes); routes.use('/sync', syncRoutes); routes.use('/cron', cronRoutes);
