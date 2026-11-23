import { describe, expect, it } from 'vitest';
import { isYoutubeId, playlistEmbedUrl, playlistUrl, watchUrl } from '@/lib/youtube';

describe('youtube', () => {
  it('valida ids de 11 caracteres', () => {
    expect(isYoutubeId('jIfogFtgV-o')).toBe(true);
    expect(isYoutubeId('_FDEH7hWb8c')).toBe(true);
    expect(isYoutubeId('curto')).toBe(false);
    expect(isYoutubeId('jIfogFtgV-o1')).toBe(false);
    expect(isYoutubeId('../etc/pass')).toBe(false);
  });

  it('monta os links do YouTube', () => {
    expect(watchUrl('jIfogFtgV-o')).toBe('https://www.youtube.com/watch?v=jIfogFtgV-o');
    expect(playlistUrl('PLabc')).toBe('https://www.youtube.com/playlist?list=PLabc');
  });

  it('embed da playlist repete o primeiro vídeo na lista, na ordem', () => {
    expect(playlistEmbedUrl(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'])).toBe(
      'https://www.youtube.com/embed/aaaaaaaaaaa?playlist=aaaaaaaaaaa,bbbbbbbbbbb,ccccccccccc&rel=0',
    );
    expect(playlistEmbedUrl(['aaaaaaaaaaa'])).toBe(
      'https://www.youtube.com/embed/aaaaaaaaaaa?playlist=aaaaaaaaaaa&rel=0',
    );
    expect(playlistEmbedUrl([])).toBeNull();
  });
});
