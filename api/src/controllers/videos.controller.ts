import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import type { Video, VideosRepository } from '../repositories/videos.repository.js';
import type { EmbedCheck } from '../services/youtube.service.js';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
});

const idParamSchema = z.object({ id: z.string().trim().min(1).max(64) });

// Só os erros do IFrame Player que significam "não toca aqui".
export const reportBodySchema = z.object({
  code: z.union([z.literal(100), z.literal(101), z.literal(150)]),
});

export type ReportDeps = {
  /** Confirmação no YouTube (oEmbed). */
  checkEmbed: (youtubeId: string) => Promise<EmbedCheck>;
  /** Chave do HMAC que transforma o IP em um identificador anônimo. */
  hashKey: string;
};

/** Identificador anônimo do visitante: HMAC-SHA256 do IP. O IP nunca é gravado. */
export const reporterHash = (ip: string, key: string) =>
  createHmac('sha256', key).update(`playback-report:${ip}`).digest('hex');

// Leitura pública e dados que mudam no máximo 1x por dia: cache curto na CDN.
const PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

const toListItem = (video: Video) => ({
  id: video.id,
  youtubeId: video.youtubeId,
  title: video.title,
  thumbnailUrl: video.thumbnailUrl,
  channelTitle: video.channelTitle,
  position: video.position,
  publishedAt: video.publishedAt,
});

export const embedUrl = (youtubeId: string) =>
  `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1`;

export function createVideosController(repository: VideosRepository, reportDeps: ReportDeps) {
  async function findOr404(id: string) {
    const video = await repository.findVisible(id);
    if (!video) throw AppError.notFound('Vídeo não encontrado');
    return video;
  }

  const list: RequestHandler = async (req, res) => {
    const { page, limit, search } = listQuerySchema.parse(req.query);
    const { videos, total } = await repository.listVisible({ page, limit, search });

    res.set('Cache-Control', PUBLIC_CACHE).json({
      data: videos.map(toListItem),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  };

  const show: RequestHandler = async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const video = await findOr404(id);
    res.set('Cache-Control', PUBLIC_CACHE).json({ data: video });
  };

  const embed: RequestHandler = async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const video = await findOr404(id);
    res
      .set('Cache-Control', PUBLIC_CACHE)
      .json({ data: { youtubeId: video.youtubeId, embedUrl: embedUrl(video.youtubeId) } });
  };

  /**
   * O player relata que o vídeo não tocou. Esconde na hora se o oEmbed confirmar; senão,
   * só depois de vários visitantes distintos relatarem (decidido no banco).
   * Relato repetido do mesmo visitante não reconsulta o YouTube.
   */
  const report: RequestHandler = async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { code } = reportBodySchema.parse(req.body ?? {});
    const video = await findOr404(id);

    const hash = reporterHash(req.ip ?? 'unknown', reportDeps.hashKey);
    const result = await repository.recordPlaybackReport(video.youtubeId, hash, code);
    let hidden = result.hidden;

    if (!hidden && result.isNew && (await reportDeps.checkEmbed(video.youtubeId)) === 'blocked') {
      await repository.markUnplayable(video.youtubeId);
      hidden = true;
    }

    if (hidden) {
      console.info(
        JSON.stringify({
          level: 'info',
          source: 'playback-report',
          youtubeId: video.youtubeId,
          code,
        }),
      );
    }

    res.status(202).set('Cache-Control', 'no-store').json({ data: { hidden } });
  };

  return { list, show, embed, report };
}
