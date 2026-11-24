import Link from 'next/link';
import { Suspense } from 'react';
import { SearchInput, SearchInputFallback } from '@/components/SearchInput/SearchInput';
import { NavLink } from './NavLink';
import styles from './Header.module.css';

const links = [
  { href: '/', label: 'Início' },
  { href: '/playlist', label: 'Playlist' },
] as const;

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="ViewNow, página inicial">
          <span className={styles.logoMark} aria-hidden="true" />
          <span className={styles.logoText}>ViewNow</span>
        </Link>

        <nav aria-label="Principal" className={styles.nav}>
          <ul className={styles.menu}>
            {links.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} className={styles.menuItem}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Suspense fallback={<SearchInputFallback />}>
            <SearchInput />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
