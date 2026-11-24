import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { excerpt, formatDate } from '@/lib/format';
import type { VideoDetail } from '@/types/video';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './Hero.module.css';

type HeroProps = {
  video: VideoDetail;
  keyArtUrl: string | null;
};

export function Hero({ video, keyArtUrl }: HeroProps) {
  const description = excerpt(video.description);
  const published = formatDate(video.publishedAt);

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      {keyArtUrl && (
        <Image
          src={keyArtUrl}
          alt=""
          fill
          priority
          sizes="(min-width: 1756px) 1596px, 100vw"
          className={styles.keyArt}
        />
      )}
      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.eyebrow}>Em destaque</p>
        <h1 id="hero-title" className={styles.title}>
          {video.title}
        </h1>
        {description && <p className={styles.description}>{description}</p>}
        {(video.channelTitle || published) && (
          <p className={styles.meta}>
            {[video.channelTitle, published].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className={styles.actions}>
          <Link
            href={`/video/${video.youtubeId}`}
            className={`${buttonStyles.button} ${buttonStyles.primary}`}
          >
            <Icon name="play" size={20} />
            Assistir agora
          </Link>
          <Link href="/playlist" className={`${buttonStyles.button} ${buttonStyles.secondary}`}>
            <Icon name="list" size={20} />
            Ver playlist
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section
      className={`${styles.hero} ${styles.skeleton}`}
      aria-busy="true"
      aria-label="Carregando destaque"
    >
      <div className={styles.content}>
        <Skeleton className={styles.skeletonTitle} />
        <Skeleton className={styles.skeletonText} />
        <Skeleton className={styles.skeletonButton} />
      </div>
    </section>
  );
}
