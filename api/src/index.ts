import type { Express } from 'express';
import { createApp } from './createApp.js';
import { env } from './config/env.js';

// Entrypoint da Vercel: o preset Express procura um arquivo que importe `express`
// e tenha `export default` do app (por isso a fábrica fica em createApp.ts, não app.ts).
const app: Express = createApp();

// Na Vercel o Express roda como função (export default); localmente sobe o servidor.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`ViewNow API em http://localhost:${env.PORT}/api`);
  });
}

export default app;
