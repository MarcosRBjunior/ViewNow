import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { InfoCard, TextCard } from '@/components/InfoCard/InfoCard';
import { Icon } from '@/components/ui/Icon';
import { VideoList } from '@/components/VideoList/VideoList';
import { VideoPlayer } from '@/components/VideoPlayer/VideoPlayer';
import { excerpt, formatDate, formatOrder } from '@/lib/format';
import { isYoutubeId, watchUrl } from '@/lib/youtube';
import { getVideo, getVideos } from '@/services/api';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from '@/components/WatchLayout/WatchLayout.module.css';
import { WatchSkeleton } from '@/components/WatchLayout/WatchSkeleton';

// A seleção tem no máximo 50 vídeos (limite da API e de YOUTUBE_MAX_VIDEOS).
const SELECTION_LIMIT = 50;

async function loadVideo(youtubeId: string) {
  if (!isYoutubeId(youtubeId)) return null;
  return getVideo(youtubeId);
}

export async function generateMetadata({
  params,
}: PageProps<'/video/[youtubeId]'>): Promise<Metadata> {
  const { youtubeId } = await params;
  const video = await loadVideo(youtubeId);
  if (!video) return { title: 'Vídeo não encontrado' };

  return {
    title: video.title,
    description: excerpt(video.description, 160) || undefined,
    openGraph: {
      title: video.title,
      type: 'video.other',
      images: video.thumbnailUrl ? [{ url: video.thumbnailUrl }] : undefined,
    },
  };
}

export default function VideoPage({ params }: PageProps<'/video/[youtubeId]'>) {
  return (
    <Suspense fallback={<WatchSkeleton />}>
      <Watch params={params} />
    </Suspense>
  );
}

async function Watch({ params }: Pick<PageProps<'/video/[youtubeId]'>, 'params'>) {
  const { youtubeId } = await params;
  const [video, { data: selection }] = await Promise.all([
    loadVideo(youtubeId),
    getVideos({ page: 1, limit: SELECTION_LIMIT }),
  ]);
  if (!video) notFound();

  const index = selection.findIndex((item) => item.youtubeId === video.youtubeId);
  const next = index >= 0 ? (selection[index + 1] ?? null) : null;
  const nextHref = next ? `/video/${next.youtubeId}` : null;
  const published = formatDate(video.publishedAt);
  const order = index >= 0 ? `${formatOrder(index + 1)} de ${formatOrder(selection.length)}` : null;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.main}>
        <div className={styles.stage}>
          {video.thumbnailUrl && (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1200px) 70vw, 100vw"
              className={styles.poster}
            />
          )}
          <VideoPlayer
            key={video.youtubeId}
            youtubeId={video.youtubeId}
            title={video.title}
            nextHref={nextHref}
          />
        </div>

        <header className={styles.heading}>
          {order && <p className={styles.eyebrow}>Vídeo {order}</p>}
          <h1 className={styles.title}>{video.title}</h1>
          <div className={styles.actions}>
            {next && nextHref && (
              <Link href={nextHref} className={`${buttonStyles.button} ${buttonStyles.secondary}`}>
                <Icon name="next" size={20} />
                <span className={styles.nextLabel}>A seguir: {next.title}</span>
              </Link>
            )}
            <a
              href={watchUrl(video.youtubeId)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonStyles.button} ${buttonStyles.secondary}`}
            >
              <Icon name="external" size={20} />
              Abrir no YouTube
            </a>
          </div>
        </header>

        <div className={styles.details}>
          <TextCard label="Descrição">
            {video.description.trim() || 'Este vídeo não tem descrição.'}
          </TextCard>
          <InfoCard
            title="Informações do vídeo"
            items={[
              ...(published && video.publishedAt
                ? [
                    {
                      icon: 'calendar' as const,
                      label: 'Publicado em',
                      value: <time dateTime={video.publishedAt}>{published}</time>,
                    },
                  ]
                : []),
              ...(video.channelTitle
                ? [{ icon: 'user' as const, label: 'Canal', value: video.channelTitle }]
                : []),
              ...(order
                ? [{ icon: 'hash' as const, label: 'Posição na playlist', value: order }]
                : []),
            ]}
          />
        </div>
      </div>

      <aside className={styles.aside} aria-labelledby="selection-title">
        <div className={styles.asideHeader}>
          <h2 id="selection-title" className={styles.asideTitle}>
            Na playlist
          </h2>
          <span className={styles.asideCount}>{selection.length} vídeos</span>
        </div>
        <VideoList videos={selection} currentId={video.youtubeId} label="Vídeos da playlist" />
      </aside>
    </div>
  );
}
