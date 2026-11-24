'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeEvent, type YouTubeProps } from 'react-youtube';
import { EmbedBlockedNotice } from '@/components/EmbedBlockedNotice/EmbedBlockedNotice';
import { Icon } from '@/components/ui/Icon';
import { UNPLAYABLE_ERRORS } from '@/lib/youtube';
import { reportUnplayable } from '@/services/playbackReport';
import styles from './VideoPlayer.module.css';

/** Tempo para conferir se o navegador deixou o autoplay com som começar. */
export const AUTOPLAY_CHECK_MS = 1500;

// Estados do IFrame Player: -1 não iniciado, 5 carregado e parado (cued).
const NOT_STARTED = new Set([-1, 5]);

const PLAYER_OPTS: YouTubeProps['opts'] = {
  width: '100%',
  height: '100%',
  playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
};

type VideoPlayerProps = {
  youtubeId: string;
  title: string;
  /** Página do próximo vídeo da seleção; calculada no servidor (RF-27). */
  nextHref: string | null;
};

/**
 * Player com autoplay (react-youtube). Isolado aqui para poder trocar por um <iframe>
 * sem mexer no resto (ADR-07). Use `key={youtubeId}` para recriar ao trocar de vídeo.
 */
export function VideoPlayer({ youtubeId, title, nextHref }: VideoPlayerProps) {
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const playerRef = useRef<YouTubeEvent['target'] | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function handleReady(event: YouTubeEvent) {
    const player = event.target;
    playerRef.current = player;
    player.playVideo();

    // Sem interação prévia, o navegador pode bloquear o autoplay com som:
    // nesse caso o vídeo começa mudo e aparece o botão "Ativar som".
    timerRef.current = window.setTimeout(async () => {
      try {
        const state = await Promise.resolve(player.getPlayerState());
        if (NOT_STARTED.has(state)) {
          player.mute();
          player.playVideo();
          setMuted(true);
        }
      } catch {
        // Player já destruído (troca de página): nada a fazer.
      }
    }, AUTOPLAY_CHECK_MS);
  }

  function handleUnmute() {
    playerRef.current?.unMute();
    setMuted(false);
  }

  function handleEnd() {
    if (nextHref) router.push(nextHref);
  }

  function handleError(event: YouTubeEvent<number>) {
    if (UNPLAYABLE_ERRORS.has(event.data)) {
      window.clearTimeout(timerRef.current);
      setErrorCode(event.data);
      // A API esconde o vídeo da galeria quando confirma que ele não toca aqui.
      reportUnplayable(youtubeId, event.data);
    }
  }

  return (
    <div className={styles.player}>
      <YouTube
        videoId={youtubeId}
        title={`Player do YouTube: ${title}`}
        opts={PLAYER_OPTS}
        className={styles.frame}
        onReady={handleReady}
        onEnd={handleEnd}
        onError={handleError}
      />

      {muted && errorCode === null && (
        <button type="button" className={styles.unmute} onClick={handleUnmute}>
          <Icon name="volumeOff" size={20} />
          Ativar som
        </button>
      )}

      {errorCode !== null && (
        <EmbedBlockedNotice youtubeId={youtubeId} errorCode={errorCode} nextHref={nextHref} />
      )}
    </div>
  );
}
