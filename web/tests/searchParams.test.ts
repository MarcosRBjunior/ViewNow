import { describe, expect, it } from 'vitest';
import { galleryHref, parseGalleryQuery } from '@/lib/searchParams';

describe('parseGalleryQuery', () => {
  it('usa a página 1 quando o valor é ausente ou inválido', () => {
    expect(parseGalleryQuery({})).toEqual({ page: 1, search: undefined });
    expect(parseGalleryQuery({ page: '0' }).page).toBe(1);
    expect(parseGalleryQuery({ page: 'abc' }).page).toBe(1);
    expect(parseGalleryQuery({ page: '2.5' }).page).toBe(1);
  });

  it('limita a página e o tamanho da busca como a API', () => {
    expect(parseGalleryQuery({ page: '99999' }).page).toBe(1000);
    expect(parseGalleryQuery({ search: 'x'.repeat(150) }).search).toHaveLength(100);
  });

  it('ignora busca vazia e pega o primeiro valor repetido', () => {
    expect(parseGalleryQuery({ search: '   ' }).search).toBeUndefined();
    expect(parseGalleryQuery({ search: [' gintama ', 'outro'], page: ['2'] })).toEqual({
      page: 2,
      search: 'gintama',
    });
  });
});

describe('galleryHref', () => {
  it('omite a página 1 e preserva a busca', () => {
    expect(galleryHref({ page: 1 })).toBe('/');
    expect(galleryHref({ page: 2 })).toBe('/?page=2');
    expect(galleryHref({ page: 2, search: 'black clover' })).toBe('/?search=black+clover&page=2');
  });
});
