// Mostra no terminal os vídeos que a sync gravaria, sem tocar no banco.
// Uso: npm run youtube:preview [-- <limite>]
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { fetchPlaylistVideos } from '../services/youtube.service.js';

const limit = Number(process.argv[2]) || env.YOUTUBE_MAX_VIDEOS;

try {
  const started = performance.now();
  const videos = await fetchPlaylistVideos(env.YOUTUBE_PLAYLIST_ID, limit);
  const ms = Math.round(performance.now() - started);

  console.table(
    videos.map((video) => ({
      pos: video.position,
      youtubeId: video.youtubeId,
      title: video.title.slice(0, 60),
      canal: video.channelTitle ?? '-',
    })),
  );
  console.log(
    `${videos.length} vídeo(s) públicos, incorporáveis e disponíveis em ${env.YOUTUBE_REGION ?? 'qualquer país'} (limite ${limit}) em ${ms} ms · playlist ${env.YOUTUBE_PLAYLIST_ID}`,
  );
} catch (error) {
  const message = error instanceof AppError ? `${error.code}: ${error.message}` : String(error);
  console.error(`Falha ao consultar o YouTube → ${message}`);
  process.exitCode = 1;
}
