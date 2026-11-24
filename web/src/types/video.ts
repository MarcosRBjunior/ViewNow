/** Item da listagem (`GET /api/videos`). */
export type Video = {
  id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  position: number;
  publishedAt: string | null;
};

/** Detalhe (`GET /api/videos/:id`): o item da lista + descrição. */
export type VideoDetail = Video & {
  playlistId: string;
  description: string;
};

export type VideosMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type VideosPage = { data: Video[]; meta: VideosMeta };

export type Embed = { youtubeId: string; embedUrl: string };
