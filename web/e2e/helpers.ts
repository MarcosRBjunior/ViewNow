import type { Page } from '@playwright/test';
import { MOCK_API_URL } from './ports';

// Miniatura cinza 16:9: o navegador não baixa nada do i.ytimg.com durante os testes.
const THUMB_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="100%" height="100%" fill="#333"/></svg>';

export async function stubImages(page: Page) {
  await page.route('**/_next/image**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: THUMB_SVG }),
  );
}

/** Liga ou desliga a API mock (503 em todas as rotas quando `down`). */
export async function setApiDown(down: boolean) {
  const res = await fetch(`${MOCK_API_URL}/__e2e/state`, {
    method: 'POST',
    body: JSON.stringify({ down }),
  });
  if (!res.ok) throw new Error(`Falha ao mudar o estado da API mock: ${res.status}`);
}

export const cards = (page: Page) => page.getByRole('main').getByRole('article');

export const pagination = (page: Page) =>
  page.getByRole('navigation', { name: 'Paginação da galeria' }).first();
