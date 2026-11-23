import { HeroSkeleton } from '@/components/Hero/Hero';
import { VideoGallerySkeleton } from '@/components/VideoGallery/VideoGallery';
import styles from './page.module.css';

export default function Loading() {
  return (
    <div className={`container ${styles.home}`}>
      <HeroSkeleton />
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Vídeos</span>
        <VideoGallerySkeleton />
      </section>
    </div>
  );
}
