import { test, expect } from "@playwright/test";

// Integração sem mocks. Requer FastAPI local com TEST_CONNECTIONS_ENABLED=false.
test("home real, assets compilados e carrinho vazio sem inventar produtos", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response.status()).toBe(503);
  await expect(page.locator("[data-service-unavailable]")).toContainText("Catálogo temporariamente indisponível");
  await expect(page.locator("[data-demo-banner]")).toHaveCount(0);
  await expect(page.locator("#hero h1")).toHaveText("Catálogo de tênis");
  for (const path of ["/static/dist/app.css", "/static/js/cart.js", "/static/js/checkout.js", "/static/dist/fonts/archivo-latin-wdth-italic.woff2"]) {
    expect((await page.request.get(path)).status()).toBe(200);
  }
  await page.getByRole("button", { name: "Carrinho", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[data-cart-list] li")).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar carrinho" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("catálogo e detalhe mostram falha real do serviço, filtro trata API 503", async ({ page }) => {
  expect((await page.goto("/tenis")).status()).toBe(503);
  await expect(page.locator("[data-catalog-status]")).toContainText("Consulta indisponível");
  await expect(page.locator("[data-catalog-empty]")).not.toBeVisible();
  await expect(page.locator("[data-catalog-error]")).toBeVisible();
  const panel = page.locator("[data-filters-panel]");
  if (!(await panel.evaluate((el) => el.open))) await panel.locator("summary").click();
  await page.locator("#f-q").fill("consulta de teste");
  const reply = page.waitForResponse((r) => r.url().includes("/api/products?"));
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  expect((await reply).status()).toBe(503);
  await expect(page.locator("[data-catalog-error]")).toBeVisible();
  expect((await page.goto("/tenis/produto-nao-configurado")).status()).toBe(503);
  await expect(page.getByRole("heading", { name: "Não foi possível consultar o catálogo." })).toBeVisible();
});

test("login usa CSRF real, falha sem opt-in e painel continua protegido", async ({ page }) => {
  expect((await page.goto("/admin/login")).status()).toBe(200);
  await expect(page.locator("[data-service-unavailable]")).toContainText("autenticação administrativa aguarda");
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "neox_csrf")?.httpOnly).toBe(true);
  await page.getByLabel("E-mail").fill("admin@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("local-ui-test-not-real");
  const reply = page.waitForResponse("**/api/admin/auth/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  expect((await reply).status()).toBe(503);
  await expect(page.locator("[data-login-error]")).toBeVisible();
  await page.goto("/admin/produtos");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await page.request.get("/api/admin/products")).status()).toBe(401);
});

test("checkout reconhece CSRF e bloqueia cálculo sem MongoDB", async ({ page, baseURL }) => {
  await page.goto("/");
  const token = await page.locator('meta[name="csrf-token"]').getAttribute("content");
  const data = { items: [{ productId: "6740a1b2c3d4e5f601000001", sizeBR: 40, quantity: 1 }] };
  const response = await page.request.post("/api/checkout", {
    headers: { Origin: baseURL, "X-CSRF-Token": token }, data,
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  expect((await page.request.post("/api/checkout", { data })).status()).toBe(403);
});
