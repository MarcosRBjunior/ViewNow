const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** IDs de vídeo do YouTube têm 11 caracteres de [A-Za-z0-9_-] (mesma regra do banco). */
export function isYoutubeId(value: string): boolean {
  return YOUTUBE_ID.test(value);
}

export function watchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
}

export function playlistUrl(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
}

/**
 * Player da seleção inteira: `embed/{primeiro}?playlist={primeiro},{segundo},...`.
 * Toca só os vídeos visíveis do banco, na ordem da playlist (RF-25).
 *
 * O primeiro vídeo vai também no parâmetro `playlist`: na prática o player usa essa
 * lista inteira e ignora o vídeo do caminho, então sem ele a sequência começaria no segundo.
 */
export function playlistEmbedUrl(youtubeIds: string[]): string | null {
  const [first] = youtubeIds;
  if (!first) return null;
  const ids = youtubeIds.map(encodeURIComponent).join(',');
  return `https://www.youtube.com/embed/${encodeURIComponent(first)}?playlist=${ids}&rel=0`;
}

/** Códigos de erro do player que significam "não toca aqui" (privado/removido ou incorporação bloqueada). */
export const UNPLAYABLE_ERRORS = new Set([100, 101, 150]);
