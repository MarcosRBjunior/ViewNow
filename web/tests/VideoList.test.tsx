import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoList } from '@/components/VideoList/VideoList';
import { makeVideo } from './fixtures';

const videos = [
  makeVideo(),
  makeVideo({ id: 'b', youtubeId: '0YF8vecQWYs', title: 'Segundo', channelTitle: null }),
  makeVideo({ id: 'c', youtubeId: '4JnWiC9F448', title: 'Terceiro' }),
];

describe('VideoList', () => {
  it('numera os vídeos e liga cada um à sua página', () => {
    render(<VideoList videos={videos} label="Vídeos da playlist" />);

    const list = screen.getByRole('list', { name: 'Vídeos da playlist' });
    const items = within(list).getAllByRole('link');
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute('href', '/video/0YF8vecQWYs');
    expect(items[2]).toHaveTextContent('03');
    expect(screen.queryByText('Tocando agora')).not.toBeInTheDocument();
  });

  it('destaca o vídeo atual', () => {
    render(<VideoList videos={videos} currentId="0YF8vecQWYs" label="Vídeos da playlist" />);

    const current = screen.getByRole('link', { current: 'page' });
    expect(current).toHaveAttribute('href', '/video/0YF8vecQWYs');
    expect(within(current).getByText('Tocando agora')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { current: false })).toHaveLength(2);
  });
});
