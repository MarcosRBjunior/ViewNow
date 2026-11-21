import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>Vídeos e miniaturas fornecidos pelo YouTube.</p>
        <a href="https://github.com/MarcosRBjunior/ViewNow" target="_blank" rel="noreferrer">
          Código no GitHub
        </a>
      </div>
    </footer>
  );
}
