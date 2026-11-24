import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { watchUrl } from '@/lib/youtube';
import buttonStyles from '@/components/ui/Button.module.css';
import styles from './EmbedBlockedNotice.module.css';

type EmbedBlockedNoticeProps = {
  youtubeId: string;
  /** Código de erro do player (100: indisponível; 101/150: incorporação bloqueada pelo dono ou bloqueio por país). */
  errorCode: number;
  nextHref?: string | null;
};

/** Aparece no lugar do player quando o vídeo não pode tocar fora do YouTube (RF-28). */
export function EmbedBlockedNotice({ youtubeId, errorCode, nextHref }: EmbedBlockedNoticeProps) {
  const unavailable = errorCode === 100;

  return (
    <div className={styles.notice} role="alert">
      <Icon name="alert" size={40} className={styles.icon} />
      <p className={styles.title}>
        {unavailable
          ? 'Este vídeo não está disponível'
          : 'Este vídeo não pode ser reproduzido aqui'}
      </p>
      <p className={styles.text}>
        {unavailable
          ? 'Ele pode ter sido removido ou ficado privado no YouTube.'
          : 'O YouTube não liberou este vídeo para tocar aqui: o dono bloqueou a incorporação ou ele não está disponível no seu país.'}
      </p>
      <div className={styles.actions}>
        {!unavailable && (
          <a
            href={watchUrl(youtubeId)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonStyles.button} ${buttonStyles.primary}`}
          >
            <Icon name="external" size={20} />
            Assistir no YouTube
          </a>
        )}
        {nextHref && (
          <Link href={nextHref} className={`${buttonStyles.button} ${buttonStyles.secondary}`}>
            <Icon name="next" size={20} />
            Próximo vídeo
          </Link>
        )}
      </div>
    </div>
  );
}
