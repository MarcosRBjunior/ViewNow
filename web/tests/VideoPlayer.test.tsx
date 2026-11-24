import { act, fireEvent, render, screen } from '@testing-library/react';
import type { YouTubeProps } from 'react-youtube';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOPLAY_CHECK_MS, VideoPlayer } from '@/components/VideoPlayer/VideoPlayer';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// Guarda as props que o VideoPlayer passou ao react-youtube para disparar os eventos.
let youtubeProps: YouTubeProps;
vi.mock('react-youtube', () => ({
  default: (props: YouTubeProps) => {
    youtubeProps = props;
    return <div data-testid="youtube" data-video-id={props.videoId} />;
  },
}));

function fakePlayer(initialState: number) {
  let state = initialState;
  return {
    playVideo: vi.fn(() => {
      if (state !== -1 || player.muted) state = 1;
    }),
    mute: vi.fn(() => {
      player.muted = true;
    }),
    unMute: vi.fn(),
    getPlayerState: vi.fn(() => state),
    muted: false,
  };
}
let player: ReturnType<typeof fakePlayer>;

const fire = (name: 'onReady' | 'onEnd' | 'onError', data?: number) =>
  act(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    youtubeProps[name]?.({ target: player, data } as any);
  });

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('toca com autoplay e vai para o próximo vídeo ao terminar', () => {
    render(<VideoPlayer youtubeId="jIfogFtgV-o" title="Noragami" nextHref="/video/0YF8vecQWYs" />);

    expect(screen.getByTestId('youtube')).toHaveAttribute('data-video-id', 'jIfogFtgV-o');
    expect(youtubeProps.opts?.playerVars?.autoplay).toBe(1);

    player = fakePlayer(1);
    fire('onReady');
    expect(player.playVideo).toHaveBeenCalled();

    fire('onEnd');
    expect(push).toHaveBeenCalledWith('/video/0YF8vecQWYs');
  });

  it('no último vídeo, terminar não navega', () => {
    render(<VideoPlayer youtubeId="Hv4znGv6lzg" title="Último" nextHref={null} />);
    player = fakePlayer(1);
    fire('onReady');
    fire('onEnd');
    expect(push).not.toHaveBeenCalled();
  });

  it('se o navegador bloquear o autoplay com som, toca mudo e oferece ativar o som', async () => {
    render(<VideoPlayer youtubeId="jIfogFtgV-o" title="Noragami" nextHref={null} />);
    player = fakePlayer(-1);
    fire('onReady');
    expect(screen.queryByRole('button', { name: 'Ativar som' })).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(AUTOPLAY_CHECK_MS));
    expect(player.mute).toHaveBeenCalled();
    expect(player.playVideo).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    expect(player.unMute).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Ativar som' })).not.toBeInTheDocument();
  });

  it('com autoplay liberado, não muta', async () => {
    render(<VideoPlayer youtubeId="jIfogFtgV-o" title="Noragami" nextHref={null} />);
    player = fakePlayer(1);
    fire('onReady');
    await act(() => vi.advanceTimersByTimeAsync(AUTOPLAY_CHECK_MS));
    expect(player.mute).not.toHaveBeenCalled();
  });

  it.each([101, 150])('erro %i mostra o aviso com link para o YouTube', (code) => {
    render(<VideoPlayer youtubeId="jIfogFtgV-o" title="Noragami" nextHref="/video/0YF8vecQWYs" />);
    player = fakePlayer(-1);
    fire('onError', code);

    expect(screen.getByRole('alert')).toHaveTextContent('Este vídeo não pode ser reproduzido aqui');
    expect(screen.getByRole('link', { name: 'Assistir no YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=jIfogFtgV-o',
    );
    expect(screen.getByRole('link', { name: 'Próximo vídeo' })).toHaveAttribute(
      'href',
      '/video/0YF8vecQWYs',
    );
  });

  it('erro 100 avisa que o vídeo está indisponível', () => {
    render(<VideoPlayer youtubeId="jIfogFtgV-o" title="Noragami" nextHref={null} />);
    player = fakePlayer(-1);
    fire('onError', 100);
    expect(screen.getByRole('alert')).toHaveTextContent('Este vídeo não está disponível');
    expect(screen.queryByRole('link', { name: 'Assistir no YouTube' })).not.toBeInTheDocument();
  });

  it('outros erros do player não escondem o vídeo', () => {
    render(<VideoPlayer youtubeId="jIfogFtgV-o" title="Noragami" nextHref={null} />);
    player = fakePlayer(-1);
    fire('onError', 5);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
