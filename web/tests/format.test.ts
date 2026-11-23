import { describe, expect, it } from 'vitest';
import { excerpt, formatDate, formatOrder, pluralVideos } from '@/lib/format';

describe('format', () => {
  it('formata a data em pt-BR, em UTC', () => {
    expect(formatDate('2021-10-15T23:30:00Z')).toBe('15 de out. de 2021');
  });

  it('devolve null para data ausente ou inválida', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate('ontem')).toBeNull();
  });

  it('usa dois dígitos na ordem', () => {
    expect(formatOrder(3)).toBe('03');
    expect(formatOrder(12)).toBe('12');
  });

  it('pega só o primeiro bloco da descrição e corta em palavra inteira', () => {
    expect(excerpt('Music: Kyoran\n\n*Copyright: ...')).toBe('Music: Kyoran');
    expect(excerpt('uma frase bem comprida', 12)).toBe('uma frase…');
  });

  it('flexiona "vídeo"', () => {
    expect(pluralVideos(1)).toBe('1 vídeo');
    expect(pluralVideos(20)).toBe('20 vídeos');
  });
});
