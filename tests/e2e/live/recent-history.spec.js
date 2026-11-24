import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';

// Histórico Redis real de produtos ABERTOS (não termos pesquisados), na main :8000.
// Visitantes aleatórios; ids gravados em visitors.txt para remover só essas chaves depois.
test.skip(process.env.NEOX_DELIVERY_QA !== '1' || !process.env.NEOX_FASTAPI_URL,
  'Exige servidor real e opt-in NEOX_DELIVERY_QA=1.');

test('vistos recentemente: Redis por visitante, ordem, sem duplicar, persiste e aparece na home', async ({ browser, baseURL }, info) => {
  const visitor = async () => {
    const id = randomBytes(16).toString('hex');
    appendFileSync(info.outputPath('visitors.txt'), id + '\n', { mode: 0o600 });
    const ctx = await browser.newContext(info.project.use);
    await ctx.addCookies([{ name: 'neox_visitor', value: id, url: baseURL }]);
    return ctx;
  };
  const ctx = await visitor();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const recentHome = page.locator('[data-recent-products] [data-card=link]');
  const apiNames = async () => (await (await page.request.get('/api/recent')).json()).items.map(p => p.name);
  const photosLoaded = async () => {
    for (const img of await page.locator('[data-recent-products] img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
    }
  };
  const open = async action => {
    const visit = page.waitForResponse(r => r.url().endsWith('/api/recent') && r.request().method() === 'POST');
    await action();
    expect((await visit).status()).toBe(204);
  };

  await page.goto('/tenis?q=nike');
  const cards = page.locator('[data-catalog-list] [data-card=link]');
  await expect(cards).toHaveCount(4);
  await open(() => cards.filter({ hasText: 'Nike Cortez' }).click());
  await page.goBack();
  await open(() => cards.filter({ hasText: 'Nike Dunk Low' }).click());
  expect(await apiNames()).toEqual(['Nike Dunk Low', 'Nike Cortez']);

  await page.goto('/');
  await expect(recentHome).toHaveText(['Nike Dunk Low', 'Nike Cortez']);
  await photosLoaded();
  await page.locator('[data-recent-products]').screenshot({ path: info.outputPath('vistos-recentemente.png') });

  await page.goto('/tenis?brand=adidas');
  await page.goto('/');
  await page.reload();
  await expect(recentHome).toHaveText(['Nike Dunk Low', 'Nike Cortez']);

  await open(() => page.goto('/tenis/nike-cortez-branco-vermelho'));
  await open(() => page.goto('/tenis/nike-air-max-90-infrared'));
  await page.goto('/');
  // Curadoria da home não apaga navegação real: AM90 aparece no histórico.
  await expect(recentHome).toHaveText(['Nike Air Max 90 Infrared', 'Nike Cortez', 'Nike Dunk Low']);
  await photosLoaded();
  await page.locator('[data-recent-products]').screenshot({ path: info.outputPath('vistos-recentemente-am90.png') });
  await page.screenshot({ path: info.outputPath('home-recentes.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const other = await visitor();
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  await expect(otherPage.locator('[data-recent-products] [data-card=link]')).toHaveCount(0);
  await other.close();

  expect(errors).toEqual([]);
  await ctx.close();
});
