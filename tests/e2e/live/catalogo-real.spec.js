import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// FastAPI real, sem fixtures/interceptação ou escrita de produtos. Visitar o detalhe pode
// alimentar cache/recentes QA normalmente. INSERTs pendentes não são prova de nove ativos.
test.skip(!process.env.NEOX_FASTAPI_URL, 'Requer vitrine FastAPI explícita');

test('correção real: AM90 fora dos destaques, catálogo preservado e 3D do AM95 separado', async ({ page, isMobile }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const products = (await (await page.request.get('/api/products?limit=24')).json()).items;
  const featured = (await (await page.request.get('/api/featured')).json()).items;
  expect(products).toHaveLength(9);
  expect(featured.map(p => p.sku)).toEqual(['NEOX-DEMO-206', 'NEOX-AM95-DARKARMY', 'NEOX-SAMBA-OG-BP', 'NEOX-DEMO-208', 'NEOX-DEMO-209']);
  for (const sku of ['NEOX-AM90-INFRARED', 'NEOX-AM95-DARKARMY', 'NEOX-SAMBA-OG-BP', 'NEOX-DEMO-205', 'NEOX-DEMO-206', 'NEOX-DEMO-207']) {
    expect(products.some(p => p.sku === sku)).toBe(true);
  }
  expect(featured.some(p => p.sku === 'NEOX-AM90-INFRARED')).toBe(false);
  expect(featured.some(p => p.sku === 'NEOX-AM95-DARKARMY')).toBe(true);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  expect((await page.goto('/')).status()).toBe(200);
  const rendered = await page.locator('#hero-data').evaluate(el => JSON.parse(el.textContent));
  expect(rendered.map(p => p.id)).toEqual(featured.map(p => p.id));
  await expect(page.locator('#hero h1')).toHaveText(featured[0].name);
  if (featured.length > 1) {
    await expect(page.locator('#hero [data-thumbs] button')).toHaveCount(featured.length);
    await expect(page.locator('#hero [data-field=counter]')).toHaveText('01');
    for (const item of featured) {
      await page.locator(`#hero [data-thumbs] button[data-id="${item.id}"]`).click();
      await expect(page.locator('#hero h1')).toHaveText(item.name);
      await expect(page.locator('#hero [data-3d-photo]')).toHaveAttribute('src', item.mainImageUrl);
    }
  } else await expect(page.locator('#hero [data-thumbs], #hero [data-step]')).toHaveCount(0);
  await expect(page.locator('#hero [data-3d-toggle]')).toBeHidden();
  expect(await page.locator('main img').evaluateAll(images => images.every(i => !i.src.includes('nike-air-max-90-infrared')))).toBe(true);
  await expect(page.locator('main')).not.toContainText('Nike Air Max 90 Infrared');
  await expect(page.locator('#colecoes a[href="/tenis?category=Performance"] img')).toHaveAttribute('src', '/static/images/products/asics-gel-1130-branco-dourado/main.webp');
  for (const image of await page.locator('#hero img, #colecoes img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  }
  const nav = page.locator(`nav[aria-label="${isMobile ? 'Principal (menu)' : 'Principal'}"]`);
  const go = async name => {
    if (isMobile) await page.locator('header').getByLabel('Menu', { exact: true }).click();
    await nav.getByRole('link', { name, exact: true }).click();
  };
  await go('Coleções');
  await expect(page.locator('#colecoes')).toBeInViewport();
  await go('Marcas');
  await expect(page.locator('#marcas')).toBeInViewport();
  await expect(page.locator('#marcas').getByRole('link', { name: 'New Balance', exact: true })).toBeVisible();
  for (const [query, count] of [['brand=New%20Balance', 2], ['category=Performance', products.filter(p => p.category === 'Performance').length]]) {
    expect((await page.goto(`/tenis?${query}`)).status()).toBe(200);
    await expect(page.locator('[data-catalog-list] article')).toHaveCount(count);
  }
  expect((await page.goto('/tenis')).status()).toBe(200);
  await expect(page.locator('[data-catalog-list] article')).toHaveCount(products.length);
  for (const p of products) await expect(page.locator('[data-catalog-list]')).toContainText(p.name);
  for (const image of await page.locator('[data-catalog-list] img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  }
  await mkdir('.gstack/final-nine', { recursive: true });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: `.gstack/final-nine/${info.project.name}-catalogo.png`, fullPage: true });
  await page.goto('/');
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: `.gstack/final-nine/${info.project.name}-home.png`, fullPage: true });
  const am95 = products.find(p => p.sku === 'NEOX-AM95-DARKARMY');
  await page.goto(`/tenis/${am95.slug}`);
  await expect(page.getByRole('heading', { name: 'Demonstração 3D' })).toBeVisible();
  await expect(page.locator('[data-gallery-main] ~ [data-3d-toggle]')).toHaveCount(0);
  const demo = page.locator('[data-3d-demo]');
  await demo.locator('[data-3d-toggle]').click();
  await expect(demo).toHaveAttribute('data-state3d', 'ready');
  const pad = demo.locator('[data-rotate-pad]');
  const yaw = await pad.getAttribute('aria-valuenow');
  await pad.focus();
  await page.keyboard.press('ArrowRight');
  await expect(pad).not.toHaveAttribute('aria-valuenow', yaw);
  expect(errors).toEqual([]);
  console.log(`REAL ${info.project.name}: ${products.length} produtos ativos; ${featured.length} slides; AM90 fora do hero/banners; AM95 ativo e 3D preservado.`);
});
