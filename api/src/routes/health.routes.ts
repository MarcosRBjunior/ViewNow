import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const healthRoutes = Router();

healthRoutes.get('/', async (_req, res) => {
  const { error } = await supabase
    .from('videos')
    .select('id', { head: true, count: 'exact' })
    .limit(1);
  const db = error ? 'error' : 'ok';

  res
    .status(error ? 503 : 200)
    .set('Cache-Control', 'no-store')
    .json({ status: error ? 'degraded' : 'ok', db, time: new Date().toISOString() });
});
