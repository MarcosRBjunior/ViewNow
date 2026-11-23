import type { Video, VideosMeta } from '@/types/video';

export const makeVideo = (overrides: Partial<Video> = {}): Video => ({
  id: '0dd40f92-ce65-47b2-b6a2-3c3df9479cdc',
  youtubeId: 'jIfogFtgV-o',
  title: 'Noragami / Opening 2',
  thumbnailUrl: 'https://i.ytimg.com/vi/jIfogFtgV-o/hqdefault.jpg',
  channelTitle: 'reeaaas',
  position: 0,
  publishedAt: '2021-10-15T12:00:00Z',
  ...overrides,
});

export const makeMeta = (overrides: Partial<VideosMeta> = {}): VideosMeta => ({
  page: 1,
  limit: 12,
  total: 20,
  totalPages: 2,
  ...overrides,
});
