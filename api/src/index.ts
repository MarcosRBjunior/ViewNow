import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

// Na Vercel o Express roda como função (export default); localmente sobe o servidor.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`ViewNow API em http://localhost:${env.PORT}/api`);
  });
}

export default app;
