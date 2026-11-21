import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/AppError.js';
import {
  fetchPlaylistVideos,
  isPublicItem,
  mapPlaylistItem,
  pickThumbnail,
} from '../../src/services/youtube.service.js';
import type { PlaylistItem, VideosResponse } from '../../src/services/youtube.types.js';

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf-8')) as T;

const page1 = fixture<{ items: PlaylistItem[]; nextPageToken: string }>('playlistItems.page1');
const page2 = fixture<{ items: PlaylistItem[] }>('playlistItems.page2');
const videosStatus = fixture<VideosResponse>('videos.status');

const PLAYLIST = 'PLtest';
const API_KEY = 'chave-secreta-de-teste';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Simula a YouTube Data API: playlistItems paginado e videos.list filtrando pelos ids pedidos. */
function fakeYoutube() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname.endsWith('/playlistItems')) {
      return json(url.searchParams.get('pageToken') === 'PAGE_2' ? page2 : page1);
    }
    const ids = new Set(url.searchParams.get('id')!.split(','));
    return json({ items: videosStatus.items!.filter((video) => ids.has(video.id)) });
  });
}

const callsTo = (fetchMock: ReturnType<typeof fakeYoutube>, resource: string) =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname.endsWith(`/${resource}`));

describe('fetchPlaylistVideos', () => {
  let fetchMock: ReturnType<typeof fakeYoutube>;

  beforeEach(() => {
    fetchMock = fakeYoutube();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const run = (max: number) =>
    fetchPlaylistVideos(PLAYLIST, max, { apiKey: API_KEY, fetch: fetchMock as typeof fetch });

  it('devolve só vídeos públicos, incorporáveis e sem repetição, na ordem da playlist', async () => {
    const videos = await run(20);
    expect(videos.map((video) => video.youtubeId)).toEqual([
      'video000001',
      'video000003',
      'video000008',
      'video000009',
    ]);
  });

  it('descarta privados, excluídos, não incorporáveis e os que sumiram do videos.list', async () => {
    const ids = (await run(20)).map((video) => video.youtubeId);
    expect(ids).not.toContain('video000002'); // privado
    expect(ids).not.toContain('video000006'); // excluído
    expect(ids).not.toContain('video000004'); // embeddable = false
    expect(ids).not.toContain('video000007'); // ausente no videos.list
  });

  it('para no limite sem buscar a próxima página', async () => {
    const videos = await run(2);
    expect(videos).toHaveLength(2);
    expect(callsTo(fetchMock, 'playlistItems')).toHaveLength(1);
  });

  it('pagina com nextPageToken quando a primeira página não basta', async () => {
    await run(20);
    const pages = callsTo(fetchMock, 'playlistItems');
    expect(pages).toHaveLength(2);
    expect(pages[1]!.searchParams.get('pageToken')).toBe('PAGE_2');
  });

  it('envia os parâmetros corretos e gasta 2 chamadas por página', async () => {
    await run(2);
    const [playlistCall] = callsTo(fetchMock, 'playlistItems');
    expect(playlistCall!.searchParams.get('part')).toBe('snippet,contentDetails,status');
    expect(playlistCall!.searchParams.get('playlistId')).toBe(PLAYLIST);
    expect(playlistCall!.searchParams.get('maxResults')).toBe('50');
    expect(playlistCall!.searchParams.get('key')).toBe(API_KEY);

    const [videosCall] = callsTo(fetchMock, 'videos');
    expect(videosCall!.searchParams.get('part')).toBe('status');
    // 4 candidatos: público + sem repetição (privado, excluído e duplicado não gastam consulta)
    expect(videosCall!.searchParams.get('id')!.split(',')).toEqual([
      'video000001',
      'video000003',
      'video000004',
      'video000007',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('devolve lista vazia para playlist sem itens', async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [] }));
    expect(await run(20)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('erros da YouTube Data API', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const failWith = (body: unknown, status: number) =>
    fetchPlaylistVideos(PLAYLIST, 20, {
      apiKey: API_KEY,
      fetch: vi.fn(async () => json(body, status)) as typeof fetch,
    });

  it.each([
    ['error.quotaExceeded', 403, 503, 'YOUTUBE_QUOTA'],
    ['error.keyInvalid', 400, 502, 'YOUTUBE_AUTH'],
    ['error.playlistNotFound', 404, 502, 'YOUTUBE_PLAYLIST_NOT_FOUND'],
  ])('%s vira %s/%s', async (name, httpStatus, statusCode, code) => {
    const error = await failWith(fixture(name), httpStatus).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode, code });
  });

  it('erro 5xx sem corpo vira YOUTUBE_UNAVAILABLE', async () => {
    const error = await failWith('', 500).catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 502, code: 'YOUTUBE_UNAVAILABLE' });
  });

  it('falha de rede vira YOUTUBE_UNAVAILABLE sem expor a chave', async () => {
    const error = await fetchPlaylistVideos(PLAYLIST, 20, {
      apiKey: API_KEY,
      fetch: vi.fn(async () => {
        throw new TypeError('fetch failed');
      }) as typeof fetch,
    }).catch((e: unknown) => e);

    expect(error).toMatchObject({ code: 'YOUTUBE_UNAVAILABLE' });
    expect((error as Error).message).not.toContain(API_KEY);
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).not.toContain(API_KEY);
  });

  it('timeout vira YOUTUBE_UNAVAILABLE', async () => {
    const error = await fetchPlaylistVideos(PLAYLIST, 20, {
      apiKey: API_KEY,
      timeoutMs: 5,
      fetch: vi.fn(
        (_input: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
          }),
      ) as typeof fetch,
    }).catch((e: unknown) => e);

    expect(error).toMatchObject({
      code: 'YOUTUBE_UNAVAILABLE',
      message: 'YouTube indisponível (timeout)',
    });
  });
});

describe('mapeamento', () => {
  it('mapeia todos os campos do item', () => {
    expect(mapPlaylistItem(page1.items[0]!, PLAYLIST)).toEqual({
      youtubeId: 'video000001',
      playlistId: PLAYLIST,
      title: 'Opening 2 (completo)',
      description: 'Abertura oficial.',
      thumbnailUrl: 'https://i.ytimg.com/vi/video000001/hqdefault.jpg',
      channelTitle: 'Canal Oficial',
      position: 0,
      publishedAt: '2015-10-03T12:00:00Z',
    });
  });

  it('limpa o título e usa valores padrão nos campos ausentes', () => {
    expect(mapPlaylistItem(page1.items[2]!, PLAYLIST)).toMatchObject({
      title: 'Opening 2 (TV size)',
      description: '',
      thumbnailUrl: 'https://i.ytimg.com/vi/video000003/mqdefault.jpg',
    });
    expect(mapPlaylistItem(page1.items[6]!, PLAYLIST)).toMatchObject({
      channelTitle: 'Canal X',
      publishedAt: null,
      thumbnailUrl: 'https://i.ytimg.com/vi/video000007/default.jpg',
    });
  });

  it('escolhe a miniatura high, depois medium, depois default', () => {
    expect(pickThumbnail({ high: { url: 'h' }, medium: { url: 'm' } })).toBe('h');
    expect(pickThumbnail({ medium: { url: 'm' }, default: { url: 'd' } })).toBe('m');
    expect(pickThumbnail({ default: { url: 'd' } })).toBe('d');
    expect(pickThumbnail({})).toBeNull();
    expect(pickThumbnail(undefined)).toBeNull();
  });

  it('isPublicItem aceita só itens públicos com videoId', () => {
    expect(page1.items.map(isPublicItem)).toEqual([true, false, true, true, true, false, true]);
  });
});
