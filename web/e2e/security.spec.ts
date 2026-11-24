import { expect, test } from '@playwright/test';
import { fakePlayer, stubYouTube } from './fake-youtube';
import { stubImages } from './helpers';

test('cabeçalhos de segurança e nenhuma violação de CSP nas páginas', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
  });

  await stubImages(page);
  await stubYouTube(page);

  const response = await page.goto('/');
  const headers = response!.headers();
  expect(headers['content-security-policy']).toContain('frame-src www.youtube.com');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-powered-by']).toBeUndefined();

  await page.goto('/video/jIfogFtgV-o');
  await expect.poll(async () => (await fakePlayer(page))?.state).toBe(1);
  await page.goto('/playlist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seleção completa');

  expect(violations).toEqual([]);
});
