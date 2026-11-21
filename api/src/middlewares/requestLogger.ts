import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Log estruturado por requisição (visível nos logs da Vercel), com x-request-id na resposta. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = req.get('x-vercel-id') ?? randomUUID();
  const started = performance.now();
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') return;
    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : 'info',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
  });

  next();
};
