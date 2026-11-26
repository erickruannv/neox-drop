// Serviços reais: somente pelo runner opt-in, sem route.fulfill, fake Auth ou preço autoritativo local.
import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

test.skip(process.env.RUN_REAL_INTEGRATION !== '1' || process.env.NEOX_REAL_E2E !== '1',
  'Escritas e sessões reais exigem autorização específica e runner protegido.');

async function login(page, kind) {
  await page.goto('/admin/login');
  await page.getByLabel('E-mail').fill(process.env[`NEOX_TEST_${kind}_EMAIL`]);
  await page.getByLabel('Senha', { exact: true }).fill(process.env[`NEOX_TEST_${kind}_PASSWORD`]);
  const response = page.waitForResponse('**/api/admin/auth/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  return await response;
}

async function headers(page, baseURL) {
  const cookie = (await page.context().cookies()).find(c => c.name === 'neox_csrf');
  return { Origin: baseURL, 'X-CSRF-Token': cookie?.value ?? '' };
}

test('admin real cadastra, catálogo sincroniza, recentes e checkout revalidam, logout bloqueia', async ({ page, baseURL, context }) => {
  test.setTimeout(120000);
  const suffix = randomBytes(12).toString('hex');
  const sku = `NEOX-E2E-${suffix}`, slug = `validacao-${suffix}`, name = `TESTE ACADÊMICO ${suffix}`;
  let id = null;
  try {
    expect((await login(page, 'ADMIN')).status()).toBe(200);
    await expect(page).toHaveURL(/\/admin\/produtos$/);
    for (const cookieName of ['neox_admin_session', 'neox_admin_refresh', 'neox_csrf']) {
      expect((await context.cookies()).find(c => c.name === cookieName)?.httpOnly).toBe(true);
    }
    const form = page.locator('[data-admin-product-form]');
    for (const [field, value] of Object.entries({ name, brand: 'NEOX QA', sku, slug,
      category: 'Validação', price: '159,90', colorName: 'Teste',
      mainImageUrl: '/static/images/demo/volt-runner-01.svg',
      description: 'Produto fictício exclusivo de QA; preço e estoque de teste, sem oferta real.',
      sizeBR: '40', stock: '3',
    })) await form.locator(`[name="${field}"]`).fill(value);
    const createdResponse = page.waitForResponse(r => r.url().endsWith('/api/admin/products') && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Cadastrar produto', exact: true }).click();
    const created = await createdResponse;
    expect(created.status()).toBe(201);
    id = (await created.json()).id;
    await page.goto(`/tenis?q=${suffix}`);
    await expect(page.locator('[data-catalog-list]')).toContainText(name);
    await page.goto(`/tenis/${slug}`);
    await expect(page.locator('h1')).toHaveText(name);
    await expect.poll(async () => (await (await page.request.get('/api/recent')).json()).items.map(p => p.id)).toContain(id);
    await page.locator('input[name="sizeBR"]').check();
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await page.locator('[data-item-step="1"]').click();
    await expect(page.locator('[data-item="qty"]')).toHaveText('2');
    await expect(page.locator('[data-cart-subtotal]')).toContainText('319,80');
    const changed = await page.request.patch(`/api/admin/products/${id}`, {
      headers: await headers(page, baseURL), data: { priceCents: 17000 },
    });
    expect(changed.status()).toBe(200);
    const checkout = page.waitForResponse('**/api/checkout');
    await page.locator('[data-checkout]').click();
    const summary = await checkout;
    expect(summary.status()).toBe(200);
    expect((await summary.json()).totalCents).toBe(34000);
    await expect(page.locator('[data-checkout-changed]')).toBeVisible();
    await expect(page.locator('[data-checkout-link]')).toHaveAttribute('href', /^https:\/\/wa\.me\/[1-9][0-9]+\?text=/);
    // Não clica no link: nenhuma mensagem nem navegação ao WhatsApp é enviada pelo teste.
  } finally {
    try {
      if (id) {
        const removed = await page.request.delete(`/api/admin/products/${id}`, { headers: await headers(page, baseURL) });
        expect(removed.status()).toBe(204);
        expect((await page.request.get(`/api/products/${slug}`)).status()).toBe(404);
      }
    } finally {
      const hasSession = (await context.cookies()).some(c => ['neox_admin_session', 'neox_admin_refresh'].includes(c.name));
      if (hasSession) {
        // Requer logout mesmo que desativação, renderização ou validações anteriores falhem.
        try {
          await page.goto('/admin/produtos');
          await page.locator('[data-admin-logout]').click({ timeout: 5000 });
          await expect(page).toHaveURL(/\/admin\/login$/);
        } finally {
          if ((await context.cookies()).some(c => ['neox_admin_session', 'neox_admin_refresh'].includes(c.name))) {
            expect((await page.request.post('/api/admin/auth/logout', { headers: await headers(page, baseURL) })).status()).toBe(204);
          }
        }
      }
    }
  }

  expect((await page.request.get('/api/admin/products')).status()).toBe(401);
  await page.goto('/admin/produtos');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('segunda conta real sem perfil ativo não recebe sessão administrativa', async ({ page }) => {
  expect((await login(page, 'NONADMIN')).status()).toBe(403);
  expect((await page.request.get('/api/admin/products')).status()).toBe(401);
  await page.goto('/admin/produtos');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
