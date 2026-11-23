import { test, expect } from '@playwright/test';

// Integração real na main :8000. Sem fixtures/interceptação ou escrita de produtos.
// Credenciais só pelo ambiente privado; runner deve omitir relatórios brutos de falhas.
test.skip(process.env.NEOX_DELIVERY_QA !== '1' || !process.env.NEOX_FASTAPI_URL,
  'Exige servidor real e opt-in NEOX_DELIVERY_QA=1.');

test('destaques reais excluem AM90 e preservam AM95 e o catálogo', async ({ page }) => {
  const items = (await (await page.request.get('/api/featured')).json()).items;
  expect(items.some(p => p.sku === 'NEOX-AM90-INFRARED')).toBe(false);
  expect(items.some(p => p.sku === 'NEOX-AM95-DARKARMY')).toBe(true);
  expect(items.map(p => p.sku)).toEqual(['NEOX-DEMO-206', 'NEOX-AM95-DARKARMY', 'NEOX-SAMBA-OG-BP', 'NEOX-DEMO-208', 'NEOX-DEMO-209']);
  await page.goto('/');
  await expect(page.locator('#hero h1')).toHaveText(items[0].name);
  await expect(page.locator('#hero [data-3d-toggle]')).toBeHidden();
  expect(await page.locator('main img').evaluateAll(images => images.every(i => !i.src.includes('nike-air-max-90-infrared')))).toBe(true);
  expect((await page.request.get('/api/products/nike-air-max-90-infrared')).status()).toBe(200);
});

test('entrega integrada: catálogo Atlas, navegação, foto/3D, carrinho, WhatsApp, recentes e admin', async ({ page, isMobile }, info) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', e => window.cspViolations.push(e.violatedDirective));
  });
  const products = (await (await page.request.get('/api/products?limit=24')).json()).items;
  expect(products.length).toBe(9);
  const featured = (await (await page.request.get('/api/featured')).json()).items;
  const am95 = featured.find(p => p.sku === 'NEOX-AM95-DARKARMY');
  const am90 = products.find(p => p.sku === 'NEOX-AM90-INFRARED');
  expect(am95.model3dUrl).toBe('https://sketchfab.com/models/c425a652fc59427ba1fcef48ea174c92/embed');
  const nav = page.locator(`nav[aria-label="${isMobile ? 'Principal (menu)' : 'Principal'}"]`);
  const active = async name => {
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveText(name);
  };
  await page.goto('/');
  await active('Início');
  await expect(page.locator('#hero h1')).toHaveText(featured[0].name);
  await expect(page.locator('[data-sketchfab-frame]')).toHaveCount(0);
  for (const product of products.filter(p => p.sku !== 'NEOX-AM90-INFRARED').slice(0, 6)) await expect(page.locator('section[aria-labelledby="lancamentos-titulo"]')).toContainText(product.name);
  await expect(page.locator('main')).not.toContainText(am90.name);
  const go = async name => {
    if (isMobile) await page.locator('header').getByLabel('Menu', { exact: true }).click();
    await nav.getByRole('link', { name, exact: true }).click();
    await active(name);
  };
  await go('Coleções');
  await expect(page.locator('#colecoes')).toBeInViewport();
  await expect(page.locator('#colecoes a[href="/tenis?category=Performance"] img')).toBeVisible();
  await go('Marcas');
  await expect(page.locator('#marcas')).toBeInViewport();
  await page.locator('#marcas').getByRole('link', { name: 'Nike', exact: true }).click();
  await expect(page.locator('[data-catalog-list]')).toContainText(am90.name);
  await active('Marcas');
  expect((await page.goto('/tenis?category=Performance')).status()).toBe(200);
  await active('Coleções');
  await expect(page.locator('[data-catalog-list]')).toContainText(am90.name);
  await page.goto('/tenis');
  await active('Tênis');
  await expect(page.locator('[data-catalog-list] [data-card=image]')).toHaveCount(products.length);
  for (const img of await page.locator('main img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('catalogo.png'), fullPage: true });
  await page.goto('/');
  await page.screenshot({ path: info.outputPath('home-foto.png'), fullPage: true });
  await page.locator(`#hero [data-thumbs] button[data-id="${am95.id}"]`).click();
  await expect(page.locator('#hero h1')).toHaveText(am95.name);
  await expect(page.locator('#hero [data-3d-photo]')).toHaveAttribute('src', am95.mainImageUrl);
  await expect(page.locator('[data-sketchfab-frame]')).toHaveCount(0);
  await page.goto(`/tenis/${am95.slug}`);
  await page.locator('[data-3d-demo] [data-3d-toggle]').click();
  await expect(page.locator('[data-3d-demo]')).toHaveAttribute('data-state3d', 'ready');
  const frame = page.frames().find(f => f.url().includes('sketchfab.com/models/'));
  const frameBox = await page.locator('[data-sketchfab-frame]').boundingBox();
  expect(Math.abs(await frame.evaluate(() => innerWidth) - frameBox.width)).toBeLessThan(2);
  const pad = page.locator('[data-3d-demo] [data-rotate-pad]');
  const yaw = await pad.getAttribute('aria-valuenow');
  await pad.focus();
  await page.keyboard.press('ArrowRight');
  await expect(pad).not.toHaveAttribute('aria-valuenow', yaw);
  await expect(page.locator('[data-gallery]')).toContainText('Andre Bond Sr.', { timeout: 5000 });
  await expect(page.locator('[data-gallery]')).toContainText('CC BY 4.0', { timeout: 5000 });
  await page.waitForTimeout(2500); // Aguarda as texturas finais antes da inspeção visual.
  await page.screenshot({ path: info.outputPath('demonstracao-3d.png') });
  await page.locator('[data-3d-demo] [data-3d-toggle]').click();
  await expect(page.locator('[data-3d-demo]')).toHaveAttribute('data-state3d', 'idle');
  await expect(page.locator('[data-3d-demo] [data-3d-photo]')).toHaveCSS('opacity', '1');

  for (const product of products) {
    await page.goto(`/tenis/${product.slug}`);
    await expect(page.locator('h1')).toHaveText(product.name);
    for (const img of await page.locator('main img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
    }
    await expect.poll(async () => (await (await page.request.get('/api/recent')).json()).items.map(p => p.id)).toContain(product.id);
  }
  await page.goto(`/tenis/${am90.slug}`);
  await page.locator('input[name=sizeBR]').first().check();
  const size = Number(await page.locator('input[name=sizeBR]:checked').inputValue());
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  await page.locator('[data-item-step="1"]').click();
  await expect(page.locator('[data-item=qty]')).toHaveText('2');
  const brl = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);
  await expect(page.locator('[data-cart-subtotal]')).toHaveText(brl(am90.priceCents * 2));
  const checkout = page.waitForResponse('**/api/checkout');
  await page.locator('[data-checkout]').click();
  const response = await checkout;
  expect(response.status()).toBe(200);
  const order = await response.json();
  expect(order.totalCents).toBe(am90.priceCents * 2);
  expect(order.items[0]).toMatchObject({ productId: am90.id, sizeBR: size, quantity: 2, unitPriceCents: am90.priceCents });
  const link = new URL(order.waUrl);
  expect(link.hostname).toBe('wa.me');
  expect(link.pathname).toBe('/5589994693084');
  const message = link.searchParams.get('text');
  expect(message).toContain(am90.name);
  expect(message).toContain(String(size));
  expect(message).toContain('1.499,80');
  await expect(page.locator('[data-checkout-link]')).toHaveAttribute('href', order.waUrl);
  // Não abre o link, não envia mensagem, não modifica estoque.
  const visitors = (await page.context().cookies()).filter(c => c.name === 'neox_visitor');
  expect(visitors).toHaveLength(1);
  await test.info().attach('visitor-qa', { body: visitors[0].value, contentType: 'text/plain' });
  await page.keyboard.press('Escape');
  await page.goto('/');
  await expect(page.locator('main')).not.toContainText(am90.name);
  expect(await page.locator('main img').evaluateAll(images => images.every(i => !i.src.includes('nike-air-max-90-infrared')))).toBe(true);
  expect((await (await page.request.get('/api/recent')).json()).items[0].id).toBe(am90.id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);

  if (!isMobile) {
    expect((await page.request.get('/api/admin/products')).status()).toBe(401);
    await page.goto('/admin/login');
    await page.getByLabel('E-mail').fill(process.env.NEOX_TEST_ADMIN_EMAIL);
    await page.getByLabel('Senha', { exact: true }).fill(process.env.NEOX_TEST_ADMIN_PASSWORD);
    const signedIn = page.waitForResponse('**/api/admin/auth/login');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    expect((await signedIn).status()).toBe(200);
    try {
      await expect(page).toHaveURL(/\/admin\/produtos$/);
      expect((await page.request.get('/api/admin/products')).status()).toBe(200);
    } finally {
      const csrf = await page.locator('meta[name=csrf-token]').getAttribute('content');
      expect((await page.request.post('/api/admin/auth/logout', { headers: { Origin: new URL(page.url()).origin, 'X-CSRF-Token': csrf } })).status()).toBe(204);
    }
    expect((await page.request.get('/api/admin/products')).status()).toBe(401);
    await page.goto('/admin/produtos');
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
  expect(errors).toEqual([]);
});
