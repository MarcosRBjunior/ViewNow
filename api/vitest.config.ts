import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      VERCEL: '1',
      NODE_ENV: 'test',
      YOUTUBE_API_KEY: 'test-key',
      YOUTUBE_PLAYLIST_ID: 'PLtest',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
      CRON_SECRET: 'test-cron-secret-with-at-least-32-chars',
    },
  },
});
