import type { Page } from '@playwright/test';

/**
 * IFrame Player API falsa, injetada no lugar de https://www.youtube.com/iframe_api.
 * Implementa o que o react-youtube usa (construtor com `events`, playVideo, mute,
 * getPlayerState, getIframe, destroy...) e expõe `window.__fakeYT` para o teste
 * disparar o fim do vídeo ou um erro do player. Nada sai para a rede.
 */
const FAKE_IFRAME_API = `(() => {
  const config = window.__FAKE_YT_CONFIG__ || {};
  const players = [];

  class Player {
    constructor(el, opts) {
      const host = typeof el === 'string' ? document.getElementById(el) : el;
      this.opts = opts;
      this.videoId = opts.videoId;
      this.state = -1;
      this.muted = false;
      this.calls = [];
      const frame = document.createElement('iframe');
      frame.setAttribute('data-fake-youtube', this.videoId);
      frame.srcdoc = '<body style="margin:0;background:#000"></body>';
      if (host.id) frame.id = host.id;
      host.replaceWith(frame);
      this.frame = frame;
      players.push(this);
      setTimeout(() => this.emit('onReady', {}), 50);
    }
    emit(name, extra) {
      const handler = this.opts.events && this.opts.events[name];
      if (handler) handler(Object.assign({ target: this }, extra));
    }
    setState(state) {
      this.state = state;
      this.emit('onStateChange', { data: state });
    }
    playVideo() {
      this.calls.push('playVideo');
      if (config.blockUnmutedAutoplay && !this.muted) return;
      this.setState(1);
    }
    pauseVideo() { this.setState(2); }
    stopVideo() { this.setState(5); }
    mute() { this.calls.push('mute'); this.muted = true; }
    unMute() { this.calls.push('unMute'); this.muted = false; }
    isMuted() { return this.muted; }
    getPlayerState() { return this.state; }
    getIframe() { return this.frame; }
    getVideoUrl() { return 'https://www.youtube.com/watch?v=' + this.videoId; }
    loadVideoById(arg) { this.videoId = typeof arg === 'string' ? arg : arg.videoId; this.playVideo(); }
    cueVideoById(arg) { this.videoId = typeof arg === 'string' ? arg : arg.videoId; this.setState(5); }
    setSize() {}
    destroy() { this.calls.push('destroy'); }
    // Controles usados pelos testes:
    end() { this.setState(0); }
    fail(code) { this.emit('onError', { data: code }); }
  }

  window.YT = {
    Player,
    loaded: 1,
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  };
  window.__fakeYT = { players, current: () => players[players.length - 1] };
  if (typeof window.onYouTubeIframeAPIReady === 'function') window.onYouTubeIframeAPIReady();
})();`;

type FakeYouTubeOptions = { blockUnmutedAutoplay?: boolean };

export async function stubYouTube(page: Page, options: FakeYouTubeOptions = {}) {
  await page.addInitScript((config) => {
    (window as unknown as { __FAKE_YT_CONFIG__: FakeYouTubeOptions }).__FAKE_YT_CONFIG__ = config;
  }, options);

  // Compara só o host: /_next/image?url=https://i.ytimg.com/... é do próprio Next e não pode cair aqui.
  const isYouTubeHost = (url: URL) =>
    /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com)$/.test(url.hostname);

  // Qualquer outra chamada ao YouTube é bloqueada; as rotas abaixo têm prioridade.
  await page.route(isYouTubeHost, (route) => route.abort());
  await page.route(
    (url) => isYouTubeHost(url) && url.pathname === '/iframe_api',
    (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_IFRAME_API }),
  );
  await page.route(
    (url) => isYouTubeHost(url) && url.pathname.startsWith('/embed/'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Embed falso</title><body style="margin:0;background:#000">',
      }),
  );
}

type FakePlayerState = { videoId: string; state: number; muted: boolean; calls: string[] };

/** Estado do player falso atual (o último criado na página). */
export function fakePlayer(page: Page): Promise<FakePlayerState | null> {
  return page.evaluate(() => {
    const fake = (window as unknown as { __fakeYT?: { current(): FakePlayerState | undefined } })
      .__fakeYT;
    const player = fake?.current();
    return player
      ? { videoId: player.videoId, state: player.state, muted: player.muted, calls: player.calls }
      : null;
  });
}

/** Dispara um evento no player falso atual: fim do vídeo ou erro com código. */
export async function firePlayer(page: Page, event: 'end' | number) {
  await page.evaluate((evt) => {
    type Controls = { end(): void; fail(code: number): void };
    const player = (window as unknown as { __fakeYT: { current(): Controls } }).__fakeYT.current();
    if (evt === 'end') player.end();
    else player.fail(evt);
  }, event);
}
