import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import type { Database } from './database.types.js';

// Cliente com a secret key (papel service_role): uso exclusivo do back-end.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type SupabaseClient = typeof supabase;
