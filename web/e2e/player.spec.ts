import { expect, test } from '@playwright/test';
import { fakePlayer, firePlayer, stubYouTube } from './fake-youtube';
import { cards, stubImages } from './helpers';
import { MOCK_API_URL } from './ports';

const FIRST = 'jIfogFtgV-o';
const SECOND = '0YF8vecQWYs';
const LAST = 'Hv4znGv6lzg';

const selection = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Vídeos da playlist' });

test.beforeEach(async ({ page }) => {
  await stubImages(page);
});

test('card da galeria abre o vídeo, que toca sozinho com a seleção ao lado', async ({ page }) => {
  await stubYouTube(page);
  await page.goto('/');
  await cards(page).first().getByRole('link').click();

  await expect(page).toHaveURL(`/video/${FIRST}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Noragami / Opening 2');
  await expect(page).toHaveTitle('Noragami / Opening 2 · ViewNow');

  // Autoplay: o player é criado com o vídeo certo e recebe playVideo().
  await expect(page.locator(`[data-fake-youtube="${FIRST}"]`)).toBeAttached();
  await expect.poll(async () => (await fakePlayer(page))?.state).toBe(1);
  expect((await fakePlayer(page))?.calls).toContain('playVideo');

  // Informações do vídeo.
  const info = page.getByRole('region', { name: 'Informações do vídeo' });
  await expect(info).toContainText('reeaaas');
  await expect(info).toContainText('15 de out. de 2021');
  await expect(info).toContainText('01 de 20');
  await expect(page.getByRole('region', { name: 'Descrição' })).toContainText('Kyoran Hey Kids!!');

  // Lista lateral com o vídeo atual destacado.
  await expect(selection(page).getByRole('link')).toHaveCount(20);
  const current = selection(page).locator('a[aria-current="page"]');
  await expect(current).toHaveAttribute('href', `/video/${FIRST}`);
  await expect(current).toContainText('Tocando agora');
});

test('ao terminar, vai para o próximo vídeo da seleção', async ({ page }) => {
  await stubYouTube(page);
  await page.goto(`/video/${FIRST}`);
  await expect.poll(async () => (await fakePlayer(page))?.state).toBe(1);

  await firePlayer(page, 'end');

  await expect(page).toHaveURL(`/video/${SECOND}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('美波「カワキヲアメク」MV');
  await expect.poll(async () => (await fakePlayer(page))?.videoId).toBe(SECOND);
  await expect(selection(page).locator('a[aria-current="page"]')).toHaveAttribute(
    'href',
    `/video/${SECOND}`,
  );
});

test('no último vídeo não há próximo', async ({ page }) => {
  await stubYouTube(page);
  await page.goto(`/video/${LAST}`);
  await expect(page.getByText('Vídeo 20 de 20')).toBeVisible();
  await expect(page.getByRole('link', { name: /A seguir/ })).toHaveCount(0);

  await expect.poll(async () => (await fakePlayer(page))?.state).toBe(1);
  await firePlayer(page, 'end');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(`/video/${LAST}`);
});

test('vídeo com incorporação bloqueada mostra aviso com link para o YouTube', async ({ page }) => {
  await stubYouTube(page);
  await page.goto(`/video/${FIRST}`);
  await expect.poll(async () => (await fakePlayer(page))?.state).toBe(1);

  await firePlayer(page, 150);

  // O player relata o vídeo para a API (passa pela CSP connect-src e pelo CORS).
  await expect
    .poll(
      async () => (await (await page.request.get(`${MOCK_API_URL}/__e2e/reports`)).json()).reports,
    )
    .toContain(FIRST);

  const notice = page.getByRole('alert').filter({ hasText: 'não pode ser reproduzido aqui' });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole('link', { name: 'Assistir no YouTube' })).toHaveAttribute(
    'href',
    `https://www.youtube.com/watch?v=${FIRST}`,
  );
  await notice.getByRole('link', { name: 'Próximo vídeo' }).click();
  await expect(page).toHaveURL(`/video/${SECOND}`);
});

test('autoplay com som bloqueado: toca mudo e "Ativar som" liga o áudio', async ({ page }) => {
  await stubYouTube(page, { blockUnmutedAutoplay: true });
  await page.goto(`/video/${FIRST}`);

  const unmute = page.getByRole('button', { name: 'Ativar som' });
  await expect(unmute).toBeVisible();
  expect(await fakePlayer(page)).toMatchObject({ state: 1, muted: true });

  await unmute.click();
  await expect(unmute).toBeHidden();
  expect((await fakePlayer(page))?.muted).toBe(false);
});

test('/playlist incorpora a seleção inteira na ordem', async ({ page }) => {
  await stubYouTube(page);
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Playlist' })
    .click();

  await expect(page).toHaveURL('/playlist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seleção completa');
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).locator('a[aria-current="page"]'),
  ).toHaveText('Playlist');

  const iframe = page.locator('iframe[title="Player do YouTube: seleção da playlist"]');
  const src = new URL((await iframe.getAttribute('src'))!);
  expect(src.pathname).toBe(`/embed/${FIRST}`);
  const ids = src.searchParams.get('playlist')!.split(',');
  expect(ids).toHaveLength(20);
  expect(ids[0]).toBe(FIRST);
  expect(ids[1]).toBe(SECOND);
  expect(ids[19]).toBe(LAST);

  await expect(selection(page).getByRole('link')).toHaveCount(20);
  await expect(selection(page).locator('a[aria-current="page"]')).toHaveCount(0);

  await page.getByRole('link', { name: 'Assistir um por um' }).click();
  await expect(page).toHaveURL(`/video/${FIRST}`);
});

test('vídeo inexistente ou id inválido cai no 404', async ({ page }) => {
  await stubYouTube(page);
  for (const id of ['aaaaaaaaaaa', 'nao-e-um-id']) {
    await page.goto(`/video/${id}`);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  }
});

test.describe('mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('player em cima e seleção abaixo, sem rolagem horizontal', async ({ page }) => {
    await stubYouTube(page);
    await page.goto(`/video/${FIRST}`);
    await expect(selection(page).getByRole('link')).toHaveCount(20);

    const stage = await page.locator(`[data-fake-youtube="${FIRST}"]`).boundingBox();
    const list = await selection(page).boundingBox();
    if (!stage || !list) throw new Error('Sem caixa de layout');
    expect(list.y).toBeGreaterThan(stage.y + stage.height);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
