// Formatos (parciais) das respostas da YouTube Data API v3 usados pelo ViewNow.

export type YoutubeThumbnail = { url: string; width?: number; height?: number };

export type YoutubeThumbnails = Partial<
  Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', YoutubeThumbnail>
>;

export type PlaylistItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    position?: number;
    thumbnails?: YoutubeThumbnails;
    videoOwnerChannelTitle?: string;
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
  status?: {
    privacyStatus?: 'public' | 'unlisted' | 'private' | 'privacyStatusUnspecified';
  };
};

export type PlaylistItemsResponse = {
  nextPageToken?: string;
  items?: PlaylistItem[];
};

export type VideoStatusItem = {
  id: string;
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
};

export type VideosResponse = {
  items?: VideoStatusItem[];
};

export type YoutubeErrorBody = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
    details?: Array<{ reason?: string }>;
  };
};

/** Vídeo já no formato do banco (camelCase; o repositório converte para snake_case). */
export type PlaylistVideo = {
  youtubeId: string;
  playlistId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  position: number;
  publishedAt: string | null;
};
