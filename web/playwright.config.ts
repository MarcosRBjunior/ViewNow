import { defineConfig, devices } from '@playwright/test';
import { MOCK_API_URL, MOCK_API_PORT, WEB_PORT } from './e2e/ports';

// E2E da galeria contra o build de produção do Next e uma API mock (e2e/mock-api.mjs),
// então nada depende do Supabase nem da chave do YouTube.
export default defineConfig({
  testDir: './e2e',
  // Um teste desliga a API mock: rodar em série evita interferência entre eles.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-api.mjs',
      url: `${MOCK_API_URL}/api/health`,
      env: { E2E_API_PORT: String(MOCK_API_PORT) },
      reuseExistingServer: false,
    },
    {
      // NEXT_PUBLIC_API_URL entra no build, por isso o build é feito aqui apontando para o mock.
      command: `npm run build && npx next start -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      env: { NEXT_PUBLIC_API_URL: `${MOCK_API_URL}/api`, NEXT_TELEMETRY_DISABLED: '1' },
      timeout: 240_000,
      reuseExistingServer: false,
    },
  ],
});
