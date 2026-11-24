import { Skeleton } from '@/components/ui/Skeleton';
import styles from './WatchLayout.module.css';

/** Esqueleto de /video e /playlist: palco 16:9, título e lista lateral. */
export function WatchSkeleton() {
  return (
    <div className={`container ${styles.page}`} aria-busy="true">
      <span className="sr-only" role="status">
        Carregando vídeo…
      </span>
      <div className={styles.main}>
        <div className={styles.stage} />
        <div className={styles.heading}>
          <Skeleton className={styles.skeletonLine} />
          <Skeleton className={styles.skeletonTitle} />
        </div>
      </div>
      <div className={styles.aside} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className={styles.skeletonItem} />
        ))}
      </div>
    </div>
  );
}
