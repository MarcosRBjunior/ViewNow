// 12 fecha linhas inteiras em 1, 2, 3 e 4 colunas (é também o padrão da API).
export const PAGE_SIZE = 12;
const MAX_SEARCH = 100;
const MAX_PAGE = 1000;

export type GalleryQuery = { page: number; search?: string };

type Raw = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Normaliza `?page` e `?search` da URL com as mesmas regras da API (nunca gera 400). */
export function parseGalleryQuery(raw: Raw): GalleryQuery {
  const pageNumber = Number(first(raw.page));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber, MAX_PAGE) : 1;
  const search = first(raw.search)?.trim().slice(0, MAX_SEARCH) || undefined;
  return { page, search };
}

/** Monta a URL da home preservando a busca. A página 1 fica implícita. */
export function galleryHref({ page, search }: GalleryQuery): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}
