import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoCard } from '@/components/VideoCard/VideoCard';
import { makeVideo } from './fixtures';

describe('VideoCard', () => {
  it('liga para a página do vídeo e mostra título, miniatura e metadados', () => {
    render(<VideoCard video={makeVideo()} order={3} />);

    const link = screen.getByRole('link', { name: /Noragami \/ Opening 2/ });
    expect(link).toHaveAttribute('href', '/video/jIfogFtgV-o');
    expect(screen.getByRole('img', { name: 'Miniatura de Noragami / Opening 2' })).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/jIfogFtgV-o/hqdefault.jpg',
    );
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('reeaaas')).toBeInTheDocument();
    expect(screen.getByText('15 de out. de 2021')).toHaveAttribute(
      'dateTime',
      '2021-10-15T12:00:00Z',
    );
  });

  it('funciona sem miniatura, canal e data', () => {
    render(
      <VideoCard
        video={makeVideo({ thumbnailUrl: null, channelTitle: null, publishedAt: null })}
        order={1}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Sem miniatura')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
