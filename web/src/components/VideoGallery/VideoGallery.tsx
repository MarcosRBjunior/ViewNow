import Link from 'next/link';
import { Pagination } from '@/components/Pagination/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { VideoCard } from '@/components/VideoCard/VideoCard';
import { pluralVideos } from '@/lib/format';
import type { Video, VideosMeta } from '@/types/video';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './VideoGallery.module.css';

type VideoGalleryProps = {
  videos: Video[];
  meta: VideosMeta;
  search?: string;
};

export function VideoGallery({ videos, meta, search }: VideoGalleryProps) {
  const firstOrder = (meta.page - 1) * meta.limit + 1;

  return (
    <div className={styles.gallery}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            {search ? <>Resultados para “{search}”</> : 'Seleção da playlist'}
          </h2>
          <p className={styles.count} role="status">
            {search
              ? `${pluralVideos(meta.total)} ${meta.total === 1 ? 'encontrado' : 'encontrados'}`
              : pluralVideos(meta.total)}
          </p>
        </div>
        <Pagination page={meta.page} totalPages={meta.totalPages} search={search} />
      </header>

      {videos.length > 0 ? (
        <ul className={styles.grid}>
          {videos.map((video, index) => (
            <li key={video.id}>
              <VideoCard video={video} order={firstOrder + index} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState search={search} outOfRange={meta.total > 0} />
      )}

      {videos.length > 0 && meta.totalPages > 1 && (
        <footer className={styles.footer}>
          <Pagination page={meta.page} totalPages={meta.totalPages} search={search} />
        </footer>
      )}
    </div>
  );
}

function EmptyState({ search, outOfRange }: { search?: string; outOfRange: boolean }) {
  if (outOfRange) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Esta página não existe</p>
        <p>A galeria tem menos páginas do que o endereço pede.</p>
        <Link
          href={search ? `/?search=${encodeURIComponent(search)}` : '/'}
          className={`${buttonStyles.button} ${buttonStyles.secondary}`}
        >
          Voltar para a primeira página
        </Link>
      </div>
    );
  }

  if (search) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Nenhum vídeo encontrado</p>
        <p>Nada na seleção tem “{search}” no título. Tente outro termo.</p>
        <Link href="/" className={`${buttonStyles.button} ${buttonStyles.secondary}`}>
          Limpar busca
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>Nenhum vídeo por aqui ainda</p>
      <p>A playlist ainda não foi sincronizada. Volte mais tarde.</p>
    </div>
  );
}

export function VideoGallerySkeleton({ cards = 12 }: { cards?: number }) {
  return (
    <div className={styles.gallery} aria-busy="true">
      <span className="sr-only" role="status">
        Carregando vídeos…
      </span>
      <header className={styles.header}>
        <div className={styles.skeletonHeading}>
          <Skeleton className={styles.skeletonTitle} />
          <Skeleton className={styles.skeletonCount} />
        </div>
      </header>
      <ul className={styles.grid} aria-hidden="true">
        {Array.from({ length: cards }, (_, i) => (
          <li key={i} className={styles.skeletonCard}>
            <Skeleton className={styles.skeletonThumb} />
            <Skeleton className={styles.skeletonLine} />
            <Skeleton className={styles.skeletonLineShort} />
          </li>
        ))}
      </ul>
    </div>
  );
}
