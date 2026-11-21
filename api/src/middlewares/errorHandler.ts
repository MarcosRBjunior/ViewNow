import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Rota ${req.method} ${req.path} não existe`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      },
    });
    return;
  }

  console.error(
    JSON.stringify({ level: 'error', message: String(err?.message ?? err), stack: err?.stack }),
  );
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
};
