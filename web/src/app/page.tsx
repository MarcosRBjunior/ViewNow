import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Hero, HeroSkeleton } from '@/components/Hero/Hero';
import { VideoGallery, VideoGallerySkeleton } from '@/components/VideoGallery/VideoGallery';
import { PAGE_SIZE, parseGalleryQuery } from '@/lib/searchParams';
import { getKeyArtUrl, getVideo, getVideos } from '@/services/api';
import styles from './page.module.css';

export async function generateMetadata({ searchParams }: PageProps<'/'>): Promise<Metadata> {
  const { search } = parseGalleryQuery(await searchParams);
  return search ? { title: `Busca: ${search}` } : {};
}

export default function HomePage({ searchParams }: PageProps<'/'>) {
  return (
    <div className={`container ${styles.home}`}>
      <Suspense fallback={<HeroSkeleton />}>
        <FeaturedVideo searchParams={searchParams} />
      </Suspense>

      <section className={styles.section} aria-labelledby="gallery-label" id="galeria">
        <span id="gallery-label" className={styles.sectionLabel}>
          Vídeos
        </span>
        <Suspense fallback={<VideoGallerySkeleton cards={PAGE_SIZE} />}>
          <Gallery searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}

/** Hero: o primeiro vídeo da seleção. Só na primeira página sem busca, para os resultados ficarem no topo. */
async function FeaturedVideo({ searchParams }: Pick<PageProps<'/'>, 'searchParams'>) {
  const { page, search } = parseGalleryQuery(await searchParams);
  if (search || page > 1) return null;
  const { data } = await getVideos({ page: 1, limit: 1 });
  const first = data[0];
  if (!first) return null;

  const [video, keyArtUrl] = await Promise.all([
    getVideo(first.youtubeId),
    getKeyArtUrl(first.youtubeId, first.thumbnailUrl),
  ]);
  if (!video) return null;

  return <Hero video={video} keyArtUrl={keyArtUrl} />;
}

async function Gallery({ searchParams }: Pick<PageProps<'/'>, 'searchParams'>) {
  const { page, search } = parseGalleryQuery(await searchParams);
  const { data, meta } = await getVideos({ page, limit: PAGE_SIZE, search });
  return <VideoGallery videos={data} meta={meta} search={search} />;
}
