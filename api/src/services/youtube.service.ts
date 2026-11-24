import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import type {
  PlaylistItem,
  PlaylistItemsResponse,
  PlaylistVideo,
  RegionRestriction,
  VideosResponse,
  YoutubeErrorBody,
  YoutubeThumbnails,
} from './youtube.types.js';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const PAGE_SIZE = 50; // máximo aceito por playlistItems.list e videos.list
const MAX_PAGES = 10; // trava de segurança: no máximo 500 itens lidos (~20 unidades de cota)

export type YoutubeDeps = {
  apiKey: string;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
  /** País do público: vídeos bloqueados nele são descartados. `null` desliga o filtro. */
  region: string | null;
};

const defaultDeps = (): YoutubeDeps => ({
  apiKey: env.YOUTUBE_API_KEY,
  fetch: globalThis.fetch,
  timeoutMs: 10_000,
  region: env.YOUTUBE_REGION,
});

/**
 * Busca até `max` vídeos públicos, incorporáveis e disponíveis na região do público,
 * já no formato do banco.
 * Custo de cota: 2 unidades por página de 50 itens (playlistItems.list + videos.list).
 */
export async function fetchPlaylistVideos(
  playlistId: string,
  max: number,
  deps: Partial<YoutubeDeps> = {},
): Promise<PlaylistVideo[]> {
  const d = { ...defaultDeps(), ...deps };
  const result: PlaylistVideo[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const page = await youtubeGet<PlaylistItemsResponse>(
      'playlistItems',
      {
        part: 'snippet,contentDetails,status',
        playlistId,
        maxResults: String(PAGE_SIZE),
        ...(pageToken ? { pageToken } : {}),
      },
      d,
    );
    pages += 1;

    const candidates = (page.items ?? []).filter(isPublicItem).filter((item) => {
      const id = item.contentDetails!.videoId!;
      if (seen.has(id)) return false; // playlists podem repetir o mesmo vídeo
      seen.add(id);
      return true;
    });

    if (candidates.length > 0) {
      const playable = await fetchPlayableIds(
        candidates.map((item) => item.contentDetails!.videoId!),
        d,
      );

      for (const item of candidates) {
        if (result.length >= max) break;
        if (playable.has(item.contentDetails!.videoId!)) {
          result.push(mapPlaylistItem(item, playlistId));
        }
      }
    }

    pageToken = page.nextPageToken;
  } while (result.length < max && pageToken && pages < MAX_PAGES);

  return result;
}

/** Item público, com id de vídeo. Itens privados ou excluídos chegam com outro privacyStatus. */
export function isPublicItem(item: PlaylistItem): boolean {
  return Boolean(item.contentDetails?.videoId) && item.status?.privacyStatus === 'public';
}

/**
 * Consulta videos.list (part=status,contentDetails; custa 1 unidade como antes) e devolve só
 * os ids incorporáveis e que tocam na região do público.
 */
async function fetchPlayableIds(ids: string[], deps: YoutubeDeps): Promise<Set<string>> {
  const response = await youtubeGet<VideosResponse>(
    'videos',
    { part: 'status,contentDetails', id: ids.join(','), maxResults: String(PAGE_SIZE) },
    deps,
  );

  return new Set(
    (response.items ?? [])
      .filter(
        (video) =>
          video.status?.embeddable === true &&
          video.status.privacyStatus !== 'private' &&
          isAvailableInRegion(video.contentDetails?.regionRestriction, deps.region),
      )
      .map((video) => video.id),
  );
}

/**
 * `allowed` é lista branca (só toca nesses países); `blocked` é lista negra.
 * Sem restrição ou sem região configurada, o vídeo passa.
 */
export function isAvailableInRegion(
  restriction: RegionRestriction | undefined,
  region: string | null,
): boolean {
  if (!region || !restriction) return true;
  if (restriction.allowed) return restriction.allowed.includes(region);
  if (restriction.blocked) return !restriction.blocked.includes(region);
  return true;
}

export function mapPlaylistItem(item: PlaylistItem, playlistId: string): PlaylistVideo {
  const snippet = item.snippet ?? {};

  return {
    youtubeId: item.contentDetails!.videoId!,
    playlistId,
    title: snippet.title?.trim() || 'Sem título',
    description: snippet.description ?? '',
    thumbnailUrl: pickThumbnail(snippet.thumbnails),
    channelTitle: snippet.videoOwnerChannelTitle ?? null,
    position: snippet.position ?? 0,
    publishedAt: item.contentDetails?.videoPublishedAt ?? null,
  };
}

export function pickThumbnail(thumbnails: YoutubeThumbnails | undefined): string | null {
  return thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null;
}

async function youtubeGet<T>(
  resource: 'playlistItems' | 'videos',
  params: Record<string, string>,
  deps: YoutubeDeps,
): Promise<T> {
  const url = new URL(`${YOUTUBE_API}/${resource}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('key', deps.apiKey);

  let response: Response;
  try {
    response = await deps.fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(deps.timeoutMs),
    });
  } catch (error) {
    // Nunca registrar a URL: ela contém a chave da API.
    const reason =
      error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'falha de rede';
    logYoutubeError(resource, 0, reason);
    throw new AppError(502, 'YOUTUBE_UNAVAILABLE', `YouTube indisponível (${reason})`);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as YoutubeErrorBody;
    throw toAppError(resource, response.status, body);
  }

  return (await response.json()) as T;
}

export function toAppError(resource: string, status: number, body: YoutubeErrorBody): AppError {
  // Chave inválida chega como 400 "badRequest", com o motivo real em details (API_KEY_INVALID).
  const detail = body.error?.details?.find((item) => item.reason)?.reason;
  const reason =
    detail === 'API_KEY_INVALID' ? 'keyInvalid' : (body.error?.errors?.[0]?.reason ?? 'unknown');
  logYoutubeError(resource, status, reason);

  if (
    ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded', 'userRateLimitExceeded'].includes(
      reason,
    )
  ) {
    return new AppError(503, 'YOUTUBE_QUOTA', 'Cota diária da YouTube Data API excedida');
  }

  if (
    reason === 'keyInvalid' ||
    reason === 'keyExpired' ||
    reason === 'accessNotConfigured' ||
    reason === 'ipRefererBlocked' ||
    reason === 'forbidden' ||
    status === 401
  ) {
    return new AppError(502, 'YOUTUBE_AUTH', 'Chave da YouTube Data API inválida ou sem permissão');
  }

  if (reason === 'playlistNotFound' || status === 404) {
    return new AppError(502, 'YOUTUBE_PLAYLIST_NOT_FOUND', 'Playlist não encontrada ou privada');
  }

  return new AppError(502, 'YOUTUBE_UNAVAILABLE', `Erro da YouTube Data API (HTTP ${status})`);
}

function logYoutubeError(resource: string, status: number, reason: string) {
  console.error(JSON.stringify({ level: 'error', source: 'youtube', resource, status, reason }));
}
