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
  for (const c of ["Street", "Classics", "Performance"]) {
    await expect(page.locator(`a[href="/tenis?category=${c}"]`)).toBeVisible();
  }
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
  await expect(page.locator("body")).not.toContainText("R$");
});
