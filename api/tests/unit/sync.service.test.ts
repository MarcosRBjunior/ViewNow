import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors/AppError.js';
import type { VideosRepository } from '../../src/repositories/videos.repository.js';
import { runSync } from '../../src/services/sync.service.js';
import type { PlaylistVideo } from '../../src/services/youtube.types.js';

const video = (youtubeId: string, position: number): PlaylistVideo => ({
  youtubeId,
  playlistId: 'PLtest',
  title: `Vídeo ${position}`,
  description: '',
  thumbnailUrl: null,
  channelTitle: null,
  position,
  publishedAt: null,
});

function fakeRepository() {
  return {
    listVisible: vi.fn(),
    findVisible: vi.fn(),
    upsertMany: vi.fn().mockResolvedValue(undefined),
    removeMissing: vi.fn().mockResolvedValue(1),
    logSyncRun: vi.fn().mockResolvedValue(undefined),
    recordPlaybackReport: vi.fn(),
    markUnplayable: vi.fn(),
    clearStaleUnplayable: vi.fn().mockResolvedValue(0),
    ping: vi.fn(),
  } satisfies VideosRepository;
}

describe('runSync', () => {
  let repository: ReturnType<typeof fakeRepository>;

  beforeEach(() => {
    repository = fakeRepository();
  });

  const sync = (fetchVideos: () => Promise<PlaylistVideo[]>) =>
    runSync('manual', { repository, fetchVideos, playlistId: 'PLtest', maxVideos: 20 });

  it('grava, remove os que saíram e registra sucesso', async () => {
    const videos = [video('video000001', 0), video('video000003', 2)];
    const result = await sync(async () => videos);

    expect(result).toMatchObject({ status: 'success', videosFetched: 2, removed: 1 });
    expect(repository.upsertMany).toHaveBeenCalledWith(videos);
    expect(repository.clearStaleUnplayable).toHaveBeenCalledOnce();
    expect(repository.removeMissing).toHaveBeenCalledWith('PLtest', ['video000001', 'video000003']);
    expect(repository.logSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        trigger: 'manual',
        videosFetched: 2,
        videosRemoved: 1,
      }),
    );
  });

  it('não altera o banco quando o YouTube devolve 0 vídeos', async () => {
    const error = await sync(async () => []).catch((e: unknown) => e);

    expect(error).toMatchObject({ code: 'SYNC_EMPTY_RESULT' });
    expect(repository.upsertMany).not.toHaveBeenCalled();
    expect(repository.removeMissing).not.toHaveBeenCalled();
    expect(repository.logSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error: expect.stringContaining('SYNC_EMPTY_RESULT'),
      }),
    );
  });

  it('registra o erro do YouTube e repassa a exceção', async () => {
    const quota = new AppError(503, 'YOUTUBE_QUOTA', 'Cota excedida');
    await expect(
      sync(async () => {
        throw quota;
      }),
    ).rejects.toBe(quota);

    expect(repository.upsertMany).not.toHaveBeenCalled();
    expect(repository.logSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', error: 'YOUTUBE_QUOTA: Cota excedida' }),
    );
  });

  it('rejeita uma segunda sync enquanto a primeira roda', async () => {
    let release!: (videos: PlaylistVideo[]) => void;
    const first = sync(() => new Promise((resolve) => (release = resolve)));

    await expect(sync(async () => [video('video000001', 0)])).rejects.toMatchObject({
      code: 'SYNC_IN_PROGRESS',
    });

    release([video('video000001', 0)]);
    await expect(first).resolves.toMatchObject({ status: 'success' });

    // depois de terminar, libera uma nova execução
    await expect(sync(async () => [video('video000001', 0)])).resolves.toMatchObject({
      status: 'success',
    });
  });
});
