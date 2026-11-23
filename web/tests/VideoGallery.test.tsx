import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoGallery } from '@/components/VideoGallery/VideoGallery';
import { makeMeta, makeVideo } from './fixtures';

const videos = [
  makeVideo(),
  makeVideo({ id: 'b', youtubeId: 'pmanD_s7G3U', title: 'Demon Slayer | OP' }),
];

describe('VideoGallery', () => {
  it('lista os vídeos com a contagem total', () => {
    render(<VideoGallery videos={videos} meta={makeMeta()} />);

    expect(screen.getByRole('heading', { name: 'Seleção da playlist' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('20 vídeos');
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('continua a numeração na página seguinte', () => {
    render(<VideoGallery videos={videos} meta={makeMeta({ page: 2 })} />);

    const [first, second] = screen.getAllByRole('article');
    expect(within(first).getByText('13')).toBeInTheDocument();
    expect(within(second).getByText('14')).toBeInTheDocument();
  });

  it('mostra a paginação no topo e no rodapé quando há mais de uma página', () => {
    render(<VideoGallery videos={videos} meta={makeMeta()} />);
    expect(screen.getAllByRole('navigation', { name: 'Paginação da galeria' })).toHaveLength(2);
  });

  it('mostra os resultados da busca', () => {
    render(
      <VideoGallery
        videos={videos.slice(0, 1)}
        meta={makeMeta({ total: 1, totalPages: 1 })}
        search="noragami"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Resultados para “noragami”' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 vídeo encontrado');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('busca sem resultado oferece limpar a busca', () => {
    render(<VideoGallery videos={[]} meta={makeMeta({ total: 0, totalPages: 0 })} search="xyz" />);

    expect(screen.getByText('Nenhum vídeo encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar busca' })).toHaveAttribute('href', '/');
  });

  it('avisa quando a seleção está vazia', () => {
    render(<VideoGallery videos={[]} meta={makeMeta({ total: 0, totalPages: 0 })} />);
    expect(screen.getByText('Nenhum vídeo por aqui ainda')).toBeInTheDocument();
  });

  it('página além da última leva de volta para a primeira', () => {
    render(<VideoGallery videos={[]} meta={makeMeta({ page: 9 })} />);
    expect(screen.getByRole('link', { name: 'Voltar para a primeira página' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
