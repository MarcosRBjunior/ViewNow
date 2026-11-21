import Link from 'next/link';
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
          ViewNow
        </Link>

        <nav aria-label="Principal">
          <ul className={styles.menu}>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.menuItem}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
