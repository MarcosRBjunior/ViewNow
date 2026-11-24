const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

/**
 * Avisa a API que o player não conseguiu tocar o vídeo (erros 100/101/150).
 * A API decide se esconde: na hora, se o YouTube confirmar; ou depois de vários
 * visitantes relatarem. Fire-and-forget: falha aqui nunca afeta a página.
 */
export function reportUnplayable(youtubeId: string, code: number): void {
  try {
    fetch(`${API_URL}/videos/${encodeURIComponent(youtubeId)}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fetch indisponível: ignora
  }
}
