import { cacheLife } from 'next/cache';
import type { Embed, VideoDetail, VideosPage } from '@/types/video';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? `Falha ao chamar ${path}`,
    );
  }

  return body as T;
}

// Os dados mudam no máximo 1x por dia (sync diária): cache de 5 min no servidor do Next.
const FIVE_MINUTES = { stale: 300, revalidate: 300, expire: 3600 } as const;

export type GetVideosParams = { page?: number; limit?: number; search?: string };

export async function getVideos({ page = 1, limit = 12, search }: GetVideosParams = {}) {
  'use cache';
  cacheLife(FIVE_MINUTES);

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return apiFetch<VideosPage>(`/videos?${params}`);
}

/** Um vídeo por uuid ou `youtubeId`; `null` quando a API responde 404. */
export async function getVideo(id: string): Promise<VideoDetail | null> {
  'use cache';
  cacheLife(FIVE_MINUTES);

  try {
    const { data } = await apiFetch<{ data: VideoDetail }>(`/videos/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getEmbed(id: string): Promise<Embed> {
  'use cache';
  cacheLife(FIVE_MINUTES);

  const { data } = await apiFetch<{ data: Embed }>(`/videos/${encodeURIComponent(id)}/embed`);
  return data;
}

/**
 * Key art do hero: a miniatura `maxresdefault` (1280×720) quando o vídeo tem uma,
 * senão a miniatura salva no banco. Só consulta o CDN de imagens (i.ytimg.com),
 * nunca a YouTube Data API.
 */
export async function getKeyArtUrl(youtubeId: string, fallback: string | null) {
  'use cache';
  cacheLife('days');

  const maxres = `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/maxresdefault.jpg`;
  try {
    const res = await fetch(maxres, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (res.ok) return maxres;
  } catch {
    // Sem rede ou timeout: usa a miniatura do banco.
  }
  return fallback;
}
