import { describe, expect, it } from 'vitest';
import { escapeLike, toVideo } from '../../src/repositories/videos.repository.js';

describe('videos.repository', () => {
  it('converte a linha do banco para camelCase', () => {
    expect(
      toVideo({
        id: '6b1c3c1e-0000-4000-8000-000000000001',
        youtube_id: 'video000001',
        playlist_id: 'PLtest',
        title: 'Título',
        description: 'Descrição',
        thumbnail_url: 'https://i.ytimg.com/vi/video000001/hqdefault.jpg',
        channel_title: 'Canal',
        position: 3,
        published_at: '2015-10-03T12:00:00+00:00',
      }),
    ).toEqual({
      id: '6b1c3c1e-0000-4000-8000-000000000001',
      youtubeId: 'video000001',
      playlistId: 'PLtest',
      title: 'Título',
      description: 'Descrição',
      thumbnailUrl: 'https://i.ytimg.com/vi/video000001/hqdefault.jpg',
      channelTitle: 'Canal',
      position: 3,
      publishedAt: '2015-10-03T12:00:00+00:00',
    });
  });

  it('escapa curingas da busca', () => {
    expect(escapeLike('100%_real\\')).toBe('100\\%\\_real\\\\');
    expect(escapeLike('opening')).toBe('opening');
  });
});
