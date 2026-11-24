import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { galleryHref } from '@/lib/searchParams';
import styles from './Pagination.module.css';

type PaginationProps = {
  page: number;
  totalPages: number;
  search?: string;
};

export function Pagination({ page, totalPages, search }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const href = (n: number) => galleryHref({ page: n, search });

  return (
    <nav className={styles.pagination} aria-label="Paginação da galeria">
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.arrow} aria-label="Página anterior">
          <Icon name="arrowLeft" />
        </Link>
      ) : (
        <span className={styles.arrow} aria-hidden="true" data-disabled>
          <Icon name="arrowLeft" />
        </span>
      )}

      <ol className={styles.pages}>
        {pages.map((n) => (
          <li key={n}>
            <Link
              href={href(n)}
              className={styles.page}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Página ${n}`}
            >
              {n}
            </Link>
          </li>
        ))}
      </ol>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={styles.arrow} aria-label="Próxima página">
          <Icon name="arrowRight" />
        </Link>
      ) : (
        <span className={styles.arrow} aria-hidden="true" data-disabled>
          <Icon name="arrowRight" />
        </span>
      )}
    </nav>
  );
}
