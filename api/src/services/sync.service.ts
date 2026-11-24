import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import {
  createVideosRepository,
  type SyncTrigger,
  type VideosRepository,
} from '../repositories/videos.repository.js';
import { fetchPlaylistVideos } from './youtube.service.js';

export type SyncResult = {
  status: 'success';
  videosFetched: number;
  removed: number;
  durationMs: number;
};

type SyncDeps = {
  repository: VideosRepository;
  fetchVideos: typeof fetchPlaylistVideos;
  playlistId: string;
  maxVideos: number;
};

let running = false;

/**
 * Sincroniza a playlist com o banco: YouTube → upsert → nova chance aos vídeos escondidos
 * pelo player → remoção dos que saíram → log.
 * Só uma execução por instância de cada vez.
 */
export async function runSync(
  trigger: SyncTrigger,
  deps: Partial<SyncDeps> = {},
): Promise<SyncResult> {
  const d: SyncDeps = {
    repository: deps.repository ?? createVideosRepository(),
    fetchVideos: deps.fetchVideos ?? fetchPlaylistVideos,
    playlistId: deps.playlistId ?? env.YOUTUBE_PLAYLIST_ID,
    maxVideos: deps.maxVideos ?? env.YOUTUBE_MAX_VIDEOS,
  };

  if (running)
    throw new AppError(409, 'SYNC_IN_PROGRESS', 'Já existe uma sincronização em andamento');
  running = true;

  const startedAt = new Date();
  let videosFetched = 0;

  try {
    const videos = await d.fetchVideos(d.playlistId, d.maxVideos);
    videosFetched = videos.length;

    // Proteção: resposta vazia (erro transitório, playlist esvaziada por engano) não apaga o banco.
    if (videos.length === 0) {
      throw new AppError(
        502,
        'SYNC_EMPTY_RESULT',
        'O YouTube não devolveu nenhum vídeo válido; nada foi alterado',
      );
    }

    await d.repository.upsertMany(videos);
    // Vídeos escondidos pelo player há mais de 7 dias voltam para uma nova tentativa.
    await d.repository.clearStaleUnplayable();
    const removed = await d.repository.removeMissing(
      d.playlistId,
      videos.map((video) => video.youtubeId),
    );

    await d.repository.logSyncRun({
      status: 'success',
      trigger,
      videosFetched,
      videosRemoved: removed,
      startedAt,
    });

    return {
      status: 'success',
      videosFetched,
      removed,
      durationMs: Date.now() - startedAt.getTime(),
    };
  } catch (error) {
    await d.repository.logSyncRun({
      status: 'error',
      trigger,
      videosFetched,
      videosRemoved: 0,
      startedAt,
      error: error instanceof AppError ? `${error.code}: ${error.message}` : String(error),
    });
    throw error;
  } finally {
    running = false;
  }
}
