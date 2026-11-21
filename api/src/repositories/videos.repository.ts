import { AppError } from '../errors/AppError.js';
import type { Database } from '../lib/database.types.js';
import { supabase as defaultClient, type SupabaseClient } from '../lib/supabase.js';
import type { PlaylistVideo } from '../services/youtube.types.js';

type VideoRow = Database['public']['Tables']['videos']['Row'];

export type Video = {
  id: string;
  youtubeId: string;
  playlistId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  position: number;
  publishedAt: string | null;
};

export type ListVideosParams = { page: number; limit: number; search?: string };
export type SyncTrigger = 'manual' | 'cron' | 'cli';

const PUBLIC_COLUMNS =
  'id, youtube_id, playlist_id, title, description, thumbnail_url, channel_title, position, published_at';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toVideo(row: Omit<VideoRow, 'visible' | 'created_at' | 'updated_at'>): Video {
  return {
    id: row.id,
    youtubeId: row.youtube_id,
    playlistId: row.playlist_id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    channelTitle: row.channel_title,
    position: row.position,
    publishedAt: row.published_at,
  };
}

/** Escapa curingas do ILIKE para a busca tratar % e _ como texto. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function dbError(operation: string, error: { message: string; code?: string }): AppError {
  console.error(
    JSON.stringify({
      level: 'error',
      source: 'supabase',
      operation,
      code: error.code,
      message: error.message,
    }),
  );
  return new AppError(503, 'DATABASE_ERROR', 'Falha ao acessar o banco de dados');
}

export function createVideosRepository(client: SupabaseClient = defaultClient) {
  return {
    /** Lista paginada só com vídeos visíveis, na ordem da playlist. */
    async listVisible({ page, limit, search }: ListVideosParams) {
      const from = (page - 1) * limit;
      let query = client
        .from('videos')
        .select(PUBLIC_COLUMNS, { count: 'exact' })
        .eq('visible', true)
        .order('position', { ascending: true })
        .range(from, from + limit - 1);

      if (search) query = query.ilike('title', `%${escapeLike(search)}%`);

      const { data, error, count } = await query;
      if (error) throw dbError('listVisible', error);
      return { videos: (data ?? []).map(toVideo), total: count ?? 0 };
    },

    /** Busca um vídeo visível pelo id interno (uuid) ou pelo youtube_id. */
    async findVisible(id: string): Promise<Video | null> {
      const column = UUID.test(id) ? 'id' : YOUTUBE_ID.test(id) ? 'youtube_id' : null;
      if (!column) return null;

      const { data, error } = await client
        .from('videos')
        .select(PUBLIC_COLUMNS)
        .eq(column, id)
        .eq('visible', true)
        .maybeSingle();

      if (error) throw dbError('findVisible', error);
      return data ? toVideo(data) : null;
    },

    /** Upsert por youtube_id. Não envia `visible`, então a curadoria manual nunca é desfeita. */
    async upsertMany(videos: PlaylistVideo[]): Promise<void> {
      if (videos.length === 0) return;

      const rows = videos.map((video) => ({
        youtube_id: video.youtubeId,
        playlist_id: video.playlistId,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnailUrl,
        channel_title: video.channelTitle,
        position: video.position,
        published_at: video.publishedAt,
      }));

      const { error } = await client.from('videos').upsert(rows, { onConflict: 'youtube_id' });
      if (error) throw dbError('upsertMany', error);
    },

    /** Apaga os vídeos da playlist que não estão mais na seleção. Devolve quantos saíram. */
    async removeMissing(playlistId: string, keepYoutubeIds: string[]): Promise<number> {
      const safeIds = keepYoutubeIds.filter((id) => YOUTUBE_ID.test(id));
      let query = client.from('videos').delete({ count: 'exact' }).eq('playlist_id', playlistId);
      if (safeIds.length > 0) query = query.not('youtube_id', 'in', `(${safeIds.join(',')})`);

      const { error, count } = await query;
      if (error) throw dbError('removeMissing', error);
      return count ?? 0;
    },

    /** Registra a execução em internal.sync_runs via função SECURITY DEFINER. */
    async logSyncRun(run: {
      status: 'success' | 'error';
      trigger: SyncTrigger;
      videosFetched: number;
      videosRemoved: number;
      startedAt: Date;
      error?: string;
    }): Promise<void> {
      const { error } = await client.rpc('log_sync_run', {
        p_status: run.status,
        p_trigger: run.trigger,
        p_videos_fetched: run.videosFetched,
        p_videos_removed: run.videosRemoved,
        p_started_at: run.startedAt.toISOString(),
        p_error: run.error,
      });
      // Falha ao registrar o log não deve mascarar o resultado da sync.
      if (error) dbError('logSyncRun', error);
    },

    async ping(): Promise<boolean> {
      const { error } = await client.from('videos').select('id', { head: true }).limit(1);
      return !error;
    },
  };
}

export type VideosRepository = ReturnType<typeof createVideosRepository>;
