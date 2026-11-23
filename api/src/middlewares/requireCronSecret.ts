import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Exige `Authorization: Bearer <CRON_SECRET>` (formato que a Vercel Cron envia).
 * Compara os hashes em tempo constante para não vazar o segredo por tempo de resposta.
 */
export function requireCronSecret(secret: string): RequestHandler {
  const expected = digest(`Bearer ${secret}`);

  return (req, _res, next) => {
    const header = req.get('authorization') ?? '';
    if (!timingSafeEqual(digest(header), expected)) {
      next(AppError.unauthorized('Envie Authorization: Bearer <CRON_SECRET>'));
      return;
    }
    next();
  };
}
