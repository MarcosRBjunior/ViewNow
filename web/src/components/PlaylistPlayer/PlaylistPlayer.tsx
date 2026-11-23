import { playlistEmbedUrl } from '@/lib/youtube';
import styles from './PlaylistPlayer.module.css';

/**
 * Nível 2: a seleção inteira no player do YouTube, via iframe puro
 * (`embed/{primeiro}?playlist={demais}`), na ordem da playlist (RF-25).
 */
export function PlaylistPlayer({ youtubeIds }: { youtubeIds: string[] }) {
  const src = playlistEmbedUrl(youtubeIds);
  if (!src) return null;

  return (
    <iframe
      src={src}
      title="Player do YouTube: seleção da playlist"
      className={styles.iframe}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}
