import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mock } from "./helpers/api.js";

const volt = mock.details.find((d) => d.slug === "nike-air-max-90-infrared");
const coral = mock.details.find((d) => d.slug === "adidas-samba-og");
const brl = (c) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("neox.cart.v1")));
const drawer = (page) => page.getByRole("dialog", { name: "Carrinho" });

async function add(page, slug, size, qty = 1) {
  await page.goto(`/tenis/${slug}/`);
  await page.locator(`input[name="sizeBR"][value="${size}"]`).check({ force: true });
  await page.getByLabel("Quantidade", { exact: true }).fill(String(qty));
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(drawer(page)).toBeVisible();
}

test("exige numeração antes de adicionar", async ({ page }) => {
  await page.goto(`/tenis/${volt.slug}/`);
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(drawer(page)).toBeHidden();
  expect(await page.locator('input[name="sizeBR"]').first().evaluate((el) => el.validity.valueMissing)).toBe(true);
});

test("adiciona, persiste só {productId,sizeBR,quantity}, agrupa e soma subtotal", async ({ page }) => {
  await add(page, volt.slug, 40, 2);
  expect(await stored(page)).toEqual([{ productId: volt.id, sizeBR: 40, quantity: 2 }]);
  await expect(drawer(page)).toContainText(volt.name);
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText(brl(volt.priceCents * 2));

  await add(page, volt.slug, 40, 1); // mesmo produto+tamanho: agrupa
  await add(page, coral.slug, 39, 1);
  expect(await stored(page)).toEqual([
    { productId: volt.id, sizeBR: 40, quantity: 3 },
    { productId: coral.id, sizeBR: 39, quantity: 1 },
  ]);
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText(brl(volt.priceCents * 3 + coral.priceCents));
  await expect(page.locator("#cart-button")).toHaveAttribute("aria-label", "Carrinho, 4 itens");
});

test("altera quantidade (máx. 10), remove itens e mostra vazio", async ({ page }) => {
  await add(page, volt.slug, 41, 9);
  const plus = drawer(page).getByRole("button", { name: `Aumentar quantidade de ${volt.name}, numeração 41` });
  await plus.click();
  await expect(plus).toBeDisabled();
  expect((await stored(page))[0].quantity).toBe(10);
  await drawer(page).getByRole("button", { name: `Diminuir quantidade de ${volt.name}, numeração 41` }).click();
  expect((await stored(page))[0].quantity).toBe(9);
  await drawer(page).getByRole("button", { name: `Remover ${volt.name}, numeração 41` }).click();
  await expect(drawer(page).getByText("Seu carrinho está vazio.")).toBeVisible();
  expect(await stored(page)).toEqual([]);
});

test("carrinho malformado no localStorage é saneado ao ler", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((id) => localStorage.setItem("neox.cart.v1", JSON.stringify([
    { productId: id, sizeBR: 40, quantity: 8, priceCents: 1 },
    { productId: id, sizeBR: 40, quantity: 8 },
    { productId: "nao-e-id", sizeBR: 40, quantity: 1 },
    { productId: id, sizeBR: 99, quantity: 1 },
    { productId: id, sizeBR: 41, quantity: 0 },
    "lixo",
  ])), volt.id);
  await page.reload();
  expect(await stored(page)).toEqual([{ productId: volt.id, sizeBR: 40, quantity: 10 }]);
  await page.evaluate(() => localStorage.setItem("neox.cart.v1", "{json quebrado"));
  await page.reload();
  expect(await stored(page)).toEqual([]);
});

test("botão do header abre; Esc fecha e devolve foco", async ({ page }) => {
  await page.goto("/");
  await page.locator("#cart-button").click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).getByText("Seu carrinho está vazio.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer(page)).toBeHidden();
  await expect(page.locator("#cart-button")).toBeFocused();
});

test("drawer aberto: sem violações axe sérias", async ({ page }) => {
  await add(page, volt.slug, 40, 1);
  const { violations } = await new AxeBuilder({ page }).include("#cart-drawer").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id)).toEqual([]);
});
