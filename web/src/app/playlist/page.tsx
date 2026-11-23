import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { InfoCard, TextCard } from '@/components/InfoCard/InfoCard';
import { PlaylistPlayer } from '@/components/PlaylistPlayer/PlaylistPlayer';
import { Icon } from '@/components/ui/Icon';
import { VideoList } from '@/components/VideoList/VideoList';
import { WatchSkeleton } from '@/components/WatchLayout/WatchSkeleton';
import { pluralVideos } from '@/lib/format';
import { playlistUrl } from '@/lib/youtube';
import { getVideos } from '@/services/api';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from '@/components/WatchLayout/WatchLayout.module.css';

const PLAYLIST_ID = process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID;

export const metadata: Metadata = {
  title: 'Playlist',
  description: 'Toda a seleção de vídeos em sequência, no player do YouTube.',
};

export default function PlaylistPage() {
  return (
    <Suspense fallback={<WatchSkeleton />}>
      <Playlist />
    </Suspense>
  );
}

async function Playlist() {
  // Lê a API só no request (nunca no build); o resultado fica no cache de 5 min.
  await connection();
  const { data: videos } = await getVideos({ page: 1, limit: 50 });
  const channels = new Set(videos.map((video) => video.channelTitle).filter(Boolean)).size;
  const first = videos[0];

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.main}>
        <div className={styles.stage}>
          <PlaylistPlayer youtubeIds={videos.map((video) => video.youtubeId)} />
        </div>

        <header className={styles.heading}>
          <p className={styles.eyebrow}>Playlist</p>
          <h1 className={styles.title}>Seleção completa</h1>
          <div className={styles.actions}>
            {first && (
              <Link
                href={`/video/${first.youtubeId}`}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                <Icon name="play" size={20} />
                Assistir um por um
              </Link>
            )}
            {PLAYLIST_ID && (
              <a
                href={playlistUrl(PLAYLIST_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonStyles.button} ${buttonStyles.secondary}`}
              >
                <Icon name="external" size={20} />
                Abrir no YouTube
              </a>
            )}
          </div>
        </header>

        <div className={styles.details}>
          <TextCard label="Sobre a seleção">
            {videos.length > 0
              ? 'Os vídeos tocam em sequência no player acima, na mesma ordem da playlist do YouTube. Para ver detalhes de um vídeo ou assisti-lo com a lista ao lado, escolha-o na seleção.'
              : 'A playlist ainda não foi sincronizada. Volte mais tarde.'}
          </TextCard>
          <InfoCard
            title="Informações da playlist"
            items={[
              { icon: 'list', label: 'Vídeos', value: pluralVideos(videos.length) },
              { icon: 'user', label: 'Canais', value: channels },
              { icon: 'refresh', label: 'Atualização', value: 'Diária, às 03:00 (Brasília)' },
            ]}
          />
        </div>
      </div>

      <aside className={styles.aside} aria-labelledby="selection-title">
        <div className={styles.asideHeader}>
          <h2 id="selection-title" className={styles.asideTitle}>
            Vídeos
          </h2>
          <span className={styles.asideCount}>{pluralVideos(videos.length)}</span>
        </div>
        <VideoList videos={videos} label="Vídeos da playlist" />
      </aside>
    </div>
  );
}
