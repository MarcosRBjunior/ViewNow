import styles from './page.module.css';

export default function HomePage() {
  return (
    <section className={`container ${styles.hero}`}>
      <h1 className={styles.title}>Assista sem sair do site</h1>
      <p className={styles.text}>
        A galeria do ViewNow reúne os vídeos de uma playlist do YouTube. Em breve: busca, player
        embutido e reprodução automática.
      </p>
    </section>
  );
}
