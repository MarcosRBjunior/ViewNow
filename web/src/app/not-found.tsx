import Link from 'next/link';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './status.module.css';

export default function NotFound() {
  return (
    <section className={`container ${styles.status}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.text}>O endereço não existe ou o vídeo saiu da seleção.</p>
      <Link href="/" className={`${buttonStyles.button} ${buttonStyles.primary}`}>
        Voltar para a galeria
      </Link>
    </section>
  );
}
