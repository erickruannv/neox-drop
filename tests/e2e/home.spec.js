import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fixture from "./fixtures/home.json" with { type: "json" };

const brl = (c) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);

test("home renderiza marca, hero e lançamentos a partir do contexto", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "NEOX drop — início" }).first()).toBeVisible();
  await expect(page.locator("h1")).toHaveText(fixture.featured.items[0].name);
  const cards = page.locator('section[aria-labelledby="lancamentos-titulo"] article');
  await expect(cards).toHaveCount(fixture.launches.items.length);
  for (const [i, p] of fixture.launches.items.entries()) {
    await expect(cards.nth(i)).toContainText(p.name);
    await expect(cards.nth(i)).toContainText(brl(p.priceCents).replace(/\s/, " "));
    await expect(cards.nth(i).getByRole("link")).toHaveAttribute("href", `/tenis/${p.slug}`);
  }
  for (const [category, image] of [["Street", "nike-dunk-low-vermelho-cinza/main.webp"], ["Classics", "adidas-gazelle-indoor-azul/main.webp"], ["Performance", "asics-gel-1130-branco-dourado/main.webp"]]) {
    const collection = page.locator(`#colecoes a[href="/tenis?category=${category}"]`);
    await expect(collection).toBeVisible();
    await expect(collection.locator("img")).toHaveAttribute("src", `/static/images/products/${image}`);
  }
});

test("Air Max 90 Infrared fora dos destaques e dos banners, mas no catálogo", async ({ page }) => {
  await page.goto("/");
  const featured = JSON.parse(await page.locator("#hero-data").textContent());
  expect(featured.map((p) => p.slug)).not.toContain("nike-air-max-90-infrared");
  await expect(page.locator('#hero img[src*="nike-air-max-90"], #colecoes img[src*="nike-air-max-90"]')).toHaveCount(0);
  await expect(page.locator("#hero [data-thumbs] button")).toHaveCount(featured.length);
  await expect(page.locator("#hero [data-progress] > *")).toHaveCount(featured.length);
  await page.goto("/tenis/");
  await expect(page.locator('[data-catalog-list] a[href="/tenis/nike-air-max-90-infrared"]')).toHaveCount(1);
});

test("sem claims comerciais não comprovados (cap. 05)", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/frete grátis|sem juros|\b10x\b|troca fácil|compra segura|promoç/i);
});

test("sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("título de lançamentos não sobrepõe Ver todos no celular", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator('section[aria-labelledby="lancamentos-titulo"]');
  const title = await section.locator('h2').evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().toJSON();
  });
  const link = await section.getByRole('link', { name: 'Ver todos', exact: true }).boundingBox();
  expect(title.right <= link.x || title.bottom <= link.y).toBe(true);
});

test("axe: sem violações sérias/críticas WCAG A/AA", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = violations.filter((v) => ["serious", "critical"].includes(v.impact));
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
});

test("primeiro Tab leva ao link de pular conteúdo, com foco visível", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});

test("sem destaques/lançamentos: hero da marca e estado vazio, sem preço", async ({ page }) => {
  await page.goto("/empty/");
  await expect(page.locator("h1")).toHaveText("Catálogo de tênis");
  await expect(page.getByText("Nenhum lançamento disponível no momento.")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("R$");
});

test("navegação: Marcas e Coleções levam a destinos visíveis; menu do celular fecha ao escolher", async ({ page, isMobile }) => {
  await page.goto("/");
  const header = page.locator("header");
  const go = async (name) => {
    if (isMobile) {
      await header.getByLabel("Menu", { exact: true }).click();
      await header.getByRole("navigation", { name: "Principal (menu)" }).getByRole("link", { name }).click();
      await expect(header.locator("[data-nav-menu]")).not.toHaveAttribute("open");
    } else await header.getByRole("navigation", { name: "Principal" }).getByRole("link", { name }).click();
  };
  await go("Coleções");
  await expect(page.locator("#colecoes")).toBeInViewport();
  await expect(page.locator("#colecoes a[href^='/tenis?category=']")).toHaveCount(3);
  await expect(page.locator('#colecoes a[href="/tenis?category=Performance"]')).toBeVisible();

  await go("Marcas");
  await expect(page).toHaveURL(/\/tenis\/?#marcas$/);
  await expect(page.locator("#marcas")).toBeInViewport();
  await expect(page.locator("#marcas").getByRole("link", { name: "Nike" })).toHaveAttribute("href", "/tenis?brand=Nike");

  // nenhum link falso na página (href="#" ou vazio)
  for (const href of await page.locator("a[href]").evaluateAll((els) => els.map((a) => a.getAttribute("href"))))
    expect(href === "#" || href === "").toBe(false);
});

test("indicador do menu: Início, Tênis, Marcas e Coleções seguem rota, filtro e âncora", async ({ page, isMobile }) => {
  const nav = page.locator(`nav[aria-label="${isMobile ? "Principal (menu)" : "Principal"}"]`);
  const expectActive = async (name) => {
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveText(name);
  };
  for (const [url, name] of [
    ["/", "Início"], ["/#colecoes", "Coleções"], ["/#recentes", "Recentes"], ["/tenis/", "Tênis"], ["/tenis/#marcas", "Marcas"],
    ["/tenis/?brand=Nike", "Marcas"], ["/tenis/?category=Street", "Coleções"], ["/tenis/nike-air-max-90-infrared/", "Tênis"],
  ]) {
    await page.goto(url);
    await expectActive(name);
  }
  // mesma página: âncora e filtro aplicado sem recarregar
  await page.goto("/tenis/");
  if (isMobile) await page.locator("header").getByLabel("Menu", { exact: true }).click();
  await nav.getByRole("link", { name: "Marcas" }).click();
  await expectActive("Marcas");
  await page.locator("#marcas").getByRole("link", { name: "Todas" }).first().click();
  await expectActive("Tênis");
});

test("vistos recentemente: logo abaixo do hero, antes das coleções, e alcançável pelo menu", async ({ page }) => {
  await page.goto("/#recentes");
  const recent = page.locator("#recentes");
  await expect(recent).toBeInViewport();
  await expect(recent.getByRole("heading", { name: "Vistos recentemente" })).toBeVisible();
  const order = await page.evaluate(() =>
    document.querySelector("#recentes").compareDocumentPosition(document.querySelector("#colecoes")) & Node.DOCUMENT_POSITION_FOLLOWING);
  expect(order).toBeTruthy();
});
