import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mock } from "./helpers/api.js";

const amount = (c) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(c / 100);

test("detalhe mostra nome, preço, cor, numerações disponíveis e trilha", async ({ page }) => {
  const p = mock.details.find((d) => d.slug === "volt-runner-01");
  await page.goto(`/tenis/${p.slug}/`);
  await expect(page.locator("h1")).toHaveText(p.name);
  await expect(page.locator("main")).toContainText(amount(p.priceCents));
  await expect(page.locator("main")).toContainText(p.colorName);
  const sizes = page.getByRole("radio");
  await expect(sizes).toHaveCount(p.sizesAvailable.length);
  await expect(page.getByText(`${p.sizesAvailable.length} numerações disponíveis`)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Trilha" }).getByRole("link", { name: "Tênis" })).toHaveAttribute("href", "/tenis");
});

test("galeria troca a imagem principal", async ({ page }) => {
  const p = mock.details.find((d) => d.slug === "mono-low-retro");
  await page.goto(`/tenis/${p.slug}/`);
  await page.getByRole("button", { name: "Imagem 2 de 2" }).click();
  await expect(page.locator("[data-gallery-main]")).toHaveAttribute("src", p.galleryUrls[1]);
  await expect(page.getByRole("button", { name: "Imagem 2 de 2" })).toHaveAttribute("aria-current", "true");
});

test("quantidade fica entre 1 e 10", async ({ page }) => {
  await page.goto("/tenis/volt-runner-01/");
  const qty = page.getByLabel("Quantidade", { exact: true });
  await page.getByRole("button", { name: "Diminuir quantidade" }).click();
  await expect(qty).toHaveValue("1");
  for (let i = 0; i < 12; i++) await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(qty).toHaveValue("10");
});

test("sem numeração disponível: esgotado, sem botão de compra", async ({ page }) => {
  await page.goto("/tenis/knit-pace-esgotado/");
  await expect(page.getByText("Esgotado no momento.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toHaveCount(0);
});

test("detalhe: sem rolagem horizontal e sem violações axe sérias", async ({ page }) => {
  await page.goto("/tenis/volt-runner-01/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id)).toEqual([]);
});
