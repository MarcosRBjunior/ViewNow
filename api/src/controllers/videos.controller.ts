import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import type { Video, VideosRepository } from '../repositories/videos.repository.js';

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

export function createVideosController(repository: VideosRepository) {
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

  return { list, show, embed };
}
