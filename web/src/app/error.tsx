'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './status.module.css';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={`container ${styles.status}`} role="alert">
      <p className={styles.code}>Ops</p>
      <h1 className={styles.title}>Não foi possível carregar os vídeos</h1>
      <p className={styles.text}>
        O servidor da galeria não respondeu. Pode ser algo passageiro: tente de novo em instantes.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className={`${buttonStyles.button} ${buttonStyles.primary}`}
      >
        <Icon name="refresh" size={20} />
        Tentar de novo
      </button>
    </section>
  );
}
