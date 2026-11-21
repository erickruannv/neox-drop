import { test, expect } from "@playwright/test";
import { mock, errorBody, expectSchemaKeys } from "./helpers/api.js";

// T022: consome POST /api/checkout (mock no formato do contrato); integração real depende de T021.
const volt = mock.details.find((d) => d.slug === "nike-air-max-90-infrared");
const brl = (c) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
const drawer = (page) => page.getByRole("dialog", { name: "Carrinho" });
const WA = "https://wa.me/5500000000000?text=Pedido%20NEOX";

const response = (unitPriceCents, quantity = 2) => ({
  items: [{ productId: volt.id, name: volt.name, sizeBR: 40, quantity, unitPriceCents, lineTotalCents: unitPriceCents * quantity }],
  totalCents: unitPriceCents * quantity,
  currency: "BRL",
  waUrl: WA,
});

async function addVolt(page) {
  await page.goto(`/tenis/${volt.slug}/`);
  await page.locator('input[name="sizeBR"][value="40"]').check({ force: true });
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(drawer(page)).toBeVisible();
}

test("envia só os itens do contrato com CSRF e mostra link após clique explícito", async ({ page }) => {
  let sent;
  await page.route("**/api/checkout", async (route) => {
    sent = { body: route.request().postDataJSON(), csrf: route.request().headers()["x-csrf-token"] };
    await route.fulfill({ json: response(volt.priceCents) });
  });
  await addVolt(page);
  const link = drawer(page).getByRole("link", { name: "Abrir WhatsApp com o pedido" });
  await expect(link).toBeHidden();
  await drawer(page).getByRole("button", { name: "Pedir pelo WhatsApp" }).click();

  await expect(link).toBeVisible();
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute("href", WA);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(drawer(page).locator("[data-checkout-total]")).toHaveText(brl(volt.priceCents * 2));
  await expect(drawer(page).getByText("O preço mudou")).toBeHidden();
  expect(sent.csrf).toBe("preview-csrf");
  expectSchemaKeys("CheckoutRequest", sent.body);
  sent.body.items.forEach((i) => expectSchemaKeys("CartItem", i));
  expect(sent.body.items).toEqual([{ productId: volt.id, sizeBR: 40, quantity: 2 }]);
});

test("preço alterado no servidor exige aceitar o novo valor", async ({ page }) => {
  const novo = volt.priceCents + 5000;
  await page.route("**/api/checkout", (route) => route.fulfill({ json: response(novo) }));
  await addVolt(page);
  await drawer(page).getByRole("button", { name: "Pedir pelo WhatsApp" }).click();
  await expect(drawer(page).getByText("O preço mudou desde que você adicionou:")).toBeVisible();
  await expect(drawer(page).getByText(`de ${brl(volt.priceCents)} para ${brl(novo)}`)).toBeVisible();
  await expect(drawer(page).getByRole("link", { name: "Aceitar novo valor e abrir WhatsApp" })).toBeVisible();
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText(brl(novo * 2));
});

test("editar o carrinho descarta resumo e resposta antiga", async ({ page }) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/api/checkout", async (route) => {
    await gate;
    await route.fulfill({ json: response(volt.priceCents) });
  });
  await addVolt(page);
  await drawer(page).getByRole("button", { name: "Pedir pelo WhatsApp" }).click();
  await drawer(page).getByRole("button", { name: `Aumentar quantidade de ${volt.name}, numeração 40` }).click();
  release();
  await page.waitForTimeout(300);
  await expect(drawer(page).locator("[data-checkout-link]")).toBeHidden();
  await expect(drawer(page).locator("[data-checkout-link]")).not.toHaveAttribute("href", /.+/);
  await expect(drawer(page).getByRole("button", { name: "Pedir pelo WhatsApp" })).toBeEnabled();
});

test("422 mostra o motivo e não gera link", async ({ page }) => {
  await page.route("**/api/checkout", (route) =>
    route.fulfill({
      status: 422,
      json: errorBody("CART_ITEM_UNAVAILABLE", "Alguns itens não estão disponíveis.", [
        { field: "items[0]", code: "CART_ITEM_UNAVAILABLE", message: `${volt.name} 40 indisponível.` },
      ]),
    }),
  );
  await addVolt(page);
  await drawer(page).getByRole("button", { name: "Pedir pelo WhatsApp" }).click();
  const alert = drawer(page).getByRole("alert");
  await expect(alert).toContainText("Alguns itens não estão disponíveis.");
  await expect(alert).toContainText(`${volt.name} 40 indisponível.`);
  await expect(drawer(page).locator("[data-checkout-link]")).toBeHidden();
});
