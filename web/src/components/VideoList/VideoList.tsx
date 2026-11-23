import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { formatOrder } from '@/lib/format';
import type { Video } from '@/types/video';
import styles from './VideoList.module.css';

type VideoListProps = {
  videos: Video[];
  /** Vídeo tocando agora: fica destacado e marcado com `aria-current`. */
  currentId?: string;
  label: string;
};

/** Lista numerada da seleção, no estilo "episódios" do design (RF-29). */
export function VideoList({ videos, currentId, label }: VideoListProps) {
  return (
    <ol className={styles.list} aria-label={label}>
      {videos.map((video, index) => {
        const current = video.youtubeId === currentId;
        return (
          <li key={video.id}>
            <Link
              href={`/video/${video.youtubeId}`}
              className={styles.item}
              aria-current={current ? 'page' : undefined}
            >
              <span className={styles.order} aria-hidden="true">
                {formatOrder(index + 1)}
              </span>
              <span className={styles.thumb}>
                {video.thumbnailUrl && (
                  <Image
                    src={video.thumbnailUrl}
                    alt=""
                    fill
                    sizes="160px"
                    className={styles.image}
                  />
                )}
                <span className={styles.play} aria-hidden="true">
                  <Icon name="play" size={14} />
                </span>
              </span>
              <span className={styles.text}>
                {current && <span className={styles.now}>Tocando agora</span>}
                <span className={styles.title}>{video.title}</span>
                {video.channelTitle && <span className={styles.channel}>{video.channelTitle}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
