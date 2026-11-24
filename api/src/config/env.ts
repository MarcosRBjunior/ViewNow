import { z } from 'zod';

// Em desenvolvimento lê o api/.env; na Vercel as variáveis vêm do painel do projeto.
if (!process.env.VERCEL) {
  try {
    process.loadEnvFile();
  } catch {
    // sem .env local: segue com as variáveis do ambiente
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  YOUTUBE_API_KEY: z.string().min(1),
  YOUTUBE_PLAYLIST_ID: z.string().min(1),
  YOUTUBE_MAX_VIDEOS: z.coerce.number().int().min(1).max(200).default(20),
  // País do público (ISO 3166-1): a sync descarta vídeos bloqueados nele. Vazio desliga o filtro.
  YOUTUBE_REGION: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/, 'YOUTUBE_REGION deve ser um código de país com 2 letras (ex.: BR)')
    .default('BR')
    .transform((value) => value || null),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(32, 'CRON_SECRET precisa ter pelo menos 32 caracteres'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  console.error(z.prettifyError(parsed.error));
  throw new Error('Configuração de ambiente inválida. Confira api/.env (veja api/.env.example).');
}

export const env = parsed.data;
export type Env = typeof env;
