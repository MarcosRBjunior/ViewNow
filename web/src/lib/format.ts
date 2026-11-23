const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2021-10-15T…" → "15 de out. de 2021". Datas ausentes ou inválidas viram null. */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

/** Número de ordem com dois dígitos, como os badges do design: 1 → "01". */
export function formatOrder(n: number): string {
  return String(n).padStart(2, '0');
}

/** Corta a descrição na primeira linha em branco e limita o tamanho. */
export function excerpt(text: string, max = 220): string {
  const firstBlock =
    text
      .split(/\n\s*\n/)[0]
      ?.replace(/\s+/g, ' ')
      .trim() ?? '';
  if (firstBlock.length <= max) return firstBlock;
  return `${firstBlock.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** "1 vídeo" / "20 vídeos". */
export function pluralVideos(n: number): string {
  return `${n} ${n === 1 ? 'vídeo' : 'vídeos'}`;
}
