import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './InfoCard.module.css';

export type InfoItem = { icon: IconName; label: string; value: ReactNode };

/** Caixa de metadados no estilo da lateral do "Movie — Open" do design. */
export function InfoCard({ items, title }: { items: InfoItem[]; title?: string }) {
  return (
    <section className={styles.card} aria-label={title}>
      <dl className={styles.list}>
        {items.map((item) => (
          <div key={item.label} className={styles.item}>
            <dt className={styles.label}>
              <Icon name={item.icon} size={20} />
              {item.label}
            </dt>
            <dd className={styles.value}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Caixa de texto com rótulo, como "Description" no design. */
export function TextCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.card} aria-label={label}>
      <h2 className={styles.label}>{label}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
