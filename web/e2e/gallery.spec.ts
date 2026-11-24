import { expect, test } from '@playwright/test';
import { cards, pagination, setApiDown, stubImages } from './helpers';

test.beforeEach(async ({ page }) => {
  await stubImages(page);
});

test('home mostra o destaque e a grade de vídeos', async ({ page }) => {
  await page.goto('/');

  const hero = page.getByRole('region', { name: 'Noragami / Opening 2' });
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Noragami / Opening 2');
  await expect(hero.getByRole('link', { name: 'Assistir agora' })).toHaveAttribute(
    'href',
    '/video/jIfogFtgV-o',
  );

  await expect(page.getByRole('heading', { name: 'Seleção da playlist' })).toBeVisible();
  await expect(page.getByText('20 vídeos')).toBeVisible();
  await expect(cards(page)).toHaveCount(12);
  await expect(cards(page).first().getByRole('link')).toHaveAttribute('href', '/video/jIfogFtgV-o');
});

test('busca digitando filtra os vídeos e atualiza ?search=', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Abrir busca' }).click();
  await page
    .getByRole('searchbox', { name: 'Buscar vídeos pelo título' })
    .pressSequentially('gintama', { delay: 40 });

  await expect(page).toHaveURL(/\?search=gintama$/);
  await expect(page.getByRole('heading', { name: 'Resultados para “gintama”' })).toBeVisible();
  await expect(page.getByText('3 vídeos encontrados')).toBeVisible();
  await expect(cards(page)).toHaveCount(3);
  for (const title of await cards(page).getByRole('heading').allTextContents()) {
    expect(title.toLowerCase()).toContain('gintama');
  }
  // Durante a busca o destaque sai para os resultados ficarem no topo.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
});

test('busca sem resultado mostra o estado vazio e permite limpar', async ({ page }) => {
  await page.goto('/?search=xyzabc');

  await expect(page.getByText('Nenhum vídeo encontrado')).toBeVisible();
  await expect(page.getByText('0 vídeos encontrados')).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveValue('xyzabc');

  await page.getByRole('link', { name: 'Limpar busca' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(cards(page)).toHaveCount(12);
  await expect(page.getByRole('searchbox')).toHaveValue('');
});

test('paginação vai para a página 2 e volta', async ({ page }) => {
  await page.goto('/');

  await pagination(page).getByRole('link', { name: 'Página 2' }).click();

  await expect(page).toHaveURL(/\?page=2$/);
  await expect(cards(page)).toHaveCount(8);
  await expect(cards(page).first().getByText('Posição 13')).toBeVisible();
  await expect(pagination(page).getByRole('link', { name: 'Página 2' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await pagination(page).getByRole('link', { name: 'Página anterior' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(cards(page)).toHaveCount(12);
  await expect(cards(page).first().getByText('Posição 01')).toBeVisible();
});

test.describe('com a API fora do ar', () => {
  test.afterEach(async () => {
    await setApiDown(false);
  });

  test('mostra o erro e "Tentar de novo" recupera quando a API volta', async ({ page }) => {
    await setApiDown(true);
    // Termo único a cada execução: a resposta nunca vem do cache de 5 min do Next,
    // então a página precisa mesmo chamar a API (inclusive em retry ou --repeat-each).
    const term = `offline${Date.now()}`;
    await page.goto(`/?search=${term}`);

    await expect(
      page.getByRole('heading', { name: 'Não foi possível carregar os vídeos' }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(0);

    await setApiDown(false);
    await page.getByRole('button', { name: 'Tentar de novo' }).click();

    await expect(page.getByRole('heading', { name: `Resultados para “${term}”` })).toBeVisible();
    await expect(page.getByText('Nenhum vídeo encontrado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0);

    // E a navegação volta ao normal com dados de verdade.
    await page.getByRole('link', { name: 'Limpar busca' }).click();
    await expect(cards(page)).toHaveCount(12);
  });
});

test.describe('mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('layout em uma coluna, sem rolagem horizontal', async ({ page }) => {
    await page.goto('/');

    await expect(cards(page)).toHaveCount(12);
    await expect(page.getByRole('link', { name: 'Assistir agora' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Uma coluna: os dois primeiros cards ficam um embaixo do outro, alinhados e dentro da tela.
    const first = await cards(page).nth(0).boundingBox();
    const second = await cards(page).nth(1).boundingBox();
    if (!first || !second) throw new Error('Cards sem caixa de layout');
    expect(second.y).toBeGreaterThan(first.y + first.height - 1);
    expect(Math.abs(second.x - first.x)).toBeLessThan(1);
    expect(first.x).toBeGreaterThanOrEqual(0);
    expect(first.x + first.width).toBeLessThanOrEqual(390);

    // Header: menu e botão de busca visíveis e dentro da tela.
    for (const locator of [
      page.getByRole('navigation', { name: 'Principal' }),
      page.getByRole('button', { name: 'Abrir busca' }),
    ]) {
      await expect(locator).toBeInViewport();
      const box = await locator.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }

    // A busca aberta ocupa a largura da tela sem estourar.
    await page.getByRole('button', { name: 'Abrir busca' }).click();
    await expect(page.getByRole('searchbox')).toBeFocused();
    const search = await page.getByRole('search').boundingBox();
    expect(search!.x).toBeGreaterThanOrEqual(0);
    expect(search!.x + search!.width).toBeLessThanOrEqual(390);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});
