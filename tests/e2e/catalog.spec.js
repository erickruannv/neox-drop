import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mock, productList, errorBody } from "./helpers/api.js";

// No celular o painel começa recolhido: abre pelo summary, como o usuário.
async function openFilters(page) {
  const panel = page.locator("[data-filters-panel]");
  if (!(await panel.evaluate((el) => el.open))) await panel.locator("summary").click();
}

const cards = (page) => page.locator("[data-catalog-list] article");

test("Performance permanece acessível na navegação e no filtro", async ({ page }) => {
  await page.goto("/tenis/");
  await expect(page.locator('#colecoes a[data-chip="category=Performance"]')).toHaveAttribute("href", "/tenis?category=Performance");
  await expect(page.getByLabel("Categoria", { exact: true }).locator('option[value="Performance"]')).toHaveCount(1);
});

test("SSR lista o catálogo com links por slug e contagem", async ({ page }) => {
  await page.goto("/tenis/");
  await expect(cards(page)).toHaveCount(mock.catalog.length);
  await expect(page.locator("[data-catalog-status]")).toHaveText(`${mock.catalog.length} tênis encontrados`);
  await expect(cards(page).first().getByRole("link")).toHaveAttribute("href", `/tenis/${mock.catalog[0].slug}`);
});

test("filtros chamam /api/products só com parâmetros preenchidos e atualizam a URL", async ({ page }) => {
  const calls = [];
  await page.route("**/api/products?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    calls.push(params.toString());
    route.fulfill({ json: productList(params) });
  });
  await page.goto("/tenis/");
  await openFilters(page);

  await page.getByLabel("Categoria").selectOption("Classics");
  await expect(cards(page)).toHaveCount(mock.catalog.filter((p) => p.category === "Classics").length);
  await expect.poll(() => calls.at(-1)).toBe("category=Classics");
  await expect(page).toHaveURL(/\/tenis\?category=Classics$/);

  await page.getByLabel("Ordenar por preço").selectOption("price_asc");
  await expect.poll(() => calls.at(-1)).toBe("category=Classics&sort=price_asc");
  await expect(page.locator("[data-catalog-results]")).toHaveAttribute("aria-busy", "false");
  const prices = await page.locator('[data-catalog-list] [data-card="price"]').allTextContents();
  expect(prices).toEqual([...prices].sort((a, b) => parseFloat(a.replace(/\D/g, "")) - parseFloat(b.replace(/\D/g, ""))));

  await page.getByLabel("Numeração (BR)").fill("39");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect.poll(() => calls.at(-1)).toBe("category=Classics&sizeBR=39&sort=price_asc");
  await expect(page.locator("[data-catalog-status]")).toContainText("encontrado");
});

test("estado vazio e erro com nova tentativa", async ({ page }) => {
  let fail = true;
  await page.route("**/api/products?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("q") === "erro" && fail) return route.fulfill({ status: 503, json: errorBody("DEPENDENCY_UNAVAILABLE", "Catálogo indisponível no momento.") });
    route.fulfill({ json: productList(params) });
  });
  await page.goto("/tenis/");
  await openFilters(page);

  await page.getByLabel("Busca", { exact: true }).fill("inexistente");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Nenhum tênis encontrado", { exact: true })).toBeVisible();
  await expect(page.locator("[data-catalog-empty]").getByRole("link", { name: "Ver todos os tênis" })).toHaveAttribute("href", "/tenis");
  await expect(cards(page)).toHaveCount(0);

  await page.getByLabel("Busca", { exact: true }).fill("erro");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert")).toContainText("Catálogo indisponível no momento.");
  fail = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator("[data-catalog-error]")).toBeHidden();
});

test("paginação e resposta antiga descartada", async ({ page }) => {
  const many = Array.from({ length: 30 }, (_, i) => ({ ...mock.catalog[i % mock.catalog.length], id: (i + 1).toString(16).padStart(24, "0"), slug: `demo-${i}` }));
  await page.route("**/api/products?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("category") === "Street") await new Promise((r) => setTimeout(r, 800)); // lenta
    route.fulfill({ json: productList(params, many) });
  });
  await page.goto("/tenis/");
  await openFilters(page);
  await page.getByLabel("Categoria").selectOption("Street"); // lenta
  await page.getByLabel("Categoria").selectOption(""); // rápida: deve prevalecer
  await expect(page.locator("[data-page-label]")).toHaveText("Página 1 de 3");
  await page.waitForTimeout(1000);
  await expect(page.locator("[data-page-label]")).toHaveText("Página 1 de 3");
  await expect(page.locator("[data-catalog-status]")).toHaveText("30 tênis encontrados");

  await page.getByRole("link", { name: "Próxima" }).click();
  await expect(page.locator("[data-page-label]")).toHaveText("Página 2 de 3");
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('[data-catalog-pager] [data-dir="-1"]')).not.toHaveAttribute("aria-disabled");
});

test("catálogo: sem rolagem horizontal e sem violações axe sérias", async ({ page }) => {
  await page.goto("/tenis/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id)).toEqual([]);
});

test("menu marca Tênis como página atual", async ({ page, isMobile }) => {
  test.skip(isMobile, "menu principal visível só no desktop");
  await page.goto("/tenis/");
  await expect(page.getByRole("navigation", { name: "Principal", exact: true }).getByRole("link", { name: "Tênis" })).toHaveAttribute("aria-current", "page");
});

test("Marcas/Coleções: faixa de exploração filtra de verdade e acompanha o filtro aplicado", async ({ page }) => {
  await page.route("**/api/products?*", (r) => r.fulfill({ json: productList(new URL(r.request().url()).searchParams) }));
  await page.goto("/tenis/");
  const explore = page.getByRole("navigation", { name: "Explorar por marca e coleção" });
  for (const a of await explore.getByRole("link").all()) expect(await a.getAttribute("href")).toMatch(/^\/tenis(\?(brand|category)=[A-Za-z+%0-9]+)?$/);
  await expect(explore.locator("#marcas")).toBeVisible(); // âncora do menu "Marcas" fora do painel recolhível
  await openFilters(page);
  await page.getByLabel("Marca", { exact: true }).selectOption("adidas");
  await expect(page).toHaveURL(/brand=adidas/);
  await expect(explore.locator("#marcas").getByRole("link", { name: "adidas" })).toHaveAttribute("aria-current", "true");
  await expect(explore.locator("#marcas").getByRole("link", { name: "Todas" })).not.toHaveAttribute("aria-current");
});
