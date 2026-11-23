import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatOrder } from '@/lib/format';
import type { Video } from '@/types/video';
import styles from './VideoCard.module.css';

type VideoCardProps = {
  video: Video;
  /** Número de ordem exibido no badge (1, 2, 3…). */
  order: number;
};

// Colunas do grid: 1 (<560) · 2 · 3 · 4 · 5 (≥1440). Container máximo de 1596 px.
const SIZES =
  '(min-width: 1600px) 300px, (min-width: 1200px) 25vw, (min-width: 900px) 33vw, (min-width: 560px) 50vw, 100vw';

export function VideoCard({ video, order }: VideoCardProps) {
  const published = formatDate(video.publishedAt);

  return (
    <article className={styles.card}>
      <Link href={`/video/${video.youtubeId}`} className={styles.link}>
        <div className={styles.thumb}>
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt={`Miniatura de ${video.title}`}
              fill
              sizes={SIZES}
              className={styles.image}
            />
          ) : (
            <span className={styles.noImage}>Sem miniatura</span>
          )}
          <span className={styles.badge}>
            <span className="sr-only">Posição </span>
            {formatOrder(order)}
          </span>
          <span className={styles.play} aria-hidden="true">
            <Icon name="play" size={22} />
          </span>
        </div>

        <h3 className={styles.title}>{video.title}</h3>
      </Link>

      <ul className={styles.meta}>
        {video.channelTitle && (
          <li className={styles.chip} title={video.channelTitle}>
            <Icon name="user" size={16} />
            <span className={styles.chipText}>{video.channelTitle}</span>
          </li>
        )}
        {published && video.publishedAt && (
          <li className={styles.chip}>
            <Icon name="calendar" size={16} />
            <time dateTime={video.publishedAt}>{published}</time>
          </li>
        )}
      </ul>
    </article>
  );
}
