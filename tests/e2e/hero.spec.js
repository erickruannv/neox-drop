import { test, expect } from "@playwright/test";
import fixture from "./fixtures/home.json" with { type: "json" };

const items = fixture.featured.items;
const amount = (c) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(c / 100);
const hero = (page) => page.locator("#hero");

async function expectSelected(page, i) {
  const item = items[i];
  const h = hero(page);
  await expect(h.locator("h1")).toHaveText(item.name);
  await expect(h.locator('[data-field="price"]')).toHaveText(amount(item.priceCents));
  await expect(h.locator('[data-field="description"]')).toHaveText(item.description);
  await expect(h.locator('[data-field="counter"]')).toHaveText(String(i + 1).padStart(2, "0"));
  await expect(h.locator('img[data-field="image"]')).toHaveAttribute("src", item.mainImageUrl);
  await expect(h.locator('a[data-field="cta"]:visible')).toHaveAttribute("href", `/tenis/${item.slug}`);
  await expect(h.locator(`[data-thumbs] button[data-id="${item.id}"]`)).toHaveAttribute("aria-current", "true");
  await expect(h.locator('[data-thumbs] button[aria-current="true"]')).toHaveCount(1);
  await expect(h).toHaveCSS("background-color", hexToRgb(item.featured.backgroundHex));
  await expect(h).not.toHaveAttribute("data-swapping");
}

function hexToRgb(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

test("miniatura troca nome, preço, descrição, imagem, fundo, CTA e marcador juntos", async ({ page }) => {
  await page.goto("/");
  await expectSelected(page, 0);
  await hero(page).locator(`[data-thumbs] button[data-id="${items[2].id}"]`).click();
  await expectSelected(page, 2);
});

test("cliques rápidos: estado final corresponde ao último clique (sem race)", async ({ page }) => {
  await page.goto("/");
  for (const i of [1, 3, 2, 3, 1]) {
    await hero(page).locator(`[data-thumbs] button[data-id="${items[i].id}"]`).click({ delay: 0 });
  }
  await expectSelected(page, 1);
});

test("setas avançam/voltam com volta circular", async ({ page }) => {
  await page.goto("/");
  await hero(page).locator('[data-step="-1"]:visible').first().click();
  await expectSelected(page, items.length - 1);
  await hero(page).locator('[data-step="1"]:visible').first().click();
  await expectSelected(page, 0);
});

test("teclado: setas nas miniaturas trocam e mantêm foco", async ({ page }) => {
  await page.goto("/");
  await hero(page).locator("[data-thumbs] button").first().focus();
  await page.keyboard.press("ArrowRight");
  await expectSelected(page, 1);
  await expect(hero(page).locator(`[data-thumbs] button[data-id="${items[1].id}"]`)).toBeFocused();
});

test("anuncia a troca em região aria-live", async ({ page }) => {
  await page.goto("/");
  await hero(page).locator(`[data-thumbs] button[data-id="${items[3].id}"]`).click();
  await expect(hero(page).locator("[data-live]")).toContainText(`Destaque 4 de 4: ${items[3].name}`);
});

test("sem model3dUrl: só foto 2D, nenhum visualizador nem promessa de giro", async ({ page }) => {
  const i = items.findIndex((it) => !it.model3dUrl);
  await page.goto("/");
  await hero(page).locator(`[data-thumbs] button[data-id="${items[i].id}"]`).click();
  await expectSelected(page, i);
  await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
  await expect(page.locator("model-viewer")).toHaveCount(0);
  await expect(hero(page).locator("[data-rotate-pad]")).toBeHidden();
  await expect(hero(page).locator("[data-model-hint]")).toHaveText("Visualização 3D indisponível para este modelo");
  await expect(hero(page)).not.toContainText(/girar/i);
});

test.describe("com model3dUrl (GLB fictício, sem ativo licenciado)", () => {
  test("Model Viewer travado em Y: phi igual em min/max, sem zoom/pan; foto visível enquanto carrega", async ({ page }) => {
    await page.route("**/*.glb", () => {}); // nunca responde: simula carregamento lento
    await page.goto("/model/");
    const mv = page.locator("model-viewer");
    await expect(mv).toHaveCount(1);
    const orbit = (attr) => mv.getAttribute(attr).then((v) => v.split(/\s+/));
    const [minTheta, minPhi] = await orbit("min-camera-orbit");
    const [maxTheta, maxPhi] = await orbit("max-camera-orbit");
    const [, phi] = await orbit("camera-orbit");
    expect(minPhi).toBe(maxPhi);
    expect(phi).toBe(minPhi);
    expect([minTheta, maxTheta]).toEqual(["-Infinity", "Infinity"]);
    await expect(mv).toHaveAttribute("disable-zoom", "");
    await expect(mv).toHaveAttribute("disable-pan", "");
    await expect(mv).toHaveAttribute("touch-action", "pan-y");
    await expect(mv).toHaveAttribute("auto-rotate", "");
    await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
  });

  test("reduced-motion: sem auto-rotate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*.glb", () => {});
    await page.goto("/model/");
    const mv = page.locator("model-viewer");
    await expect(mv).toHaveCount(1);
    await expect(mv).not.toHaveAttribute("auto-rotate");
  });

  test("falha do GLB: remove o viewer e mantém foto e carrossel", async ({ page }) => {
    await page.route("**/*.glb", (route) => route.abort());
    await page.goto("/model/");
    await expect(page.locator("model-viewer")).toHaveCount(0, { timeout: 10_000 });
    await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
    await hero(page).locator(`[data-thumbs] button[data-id="${items[1].id}"]`).click();
    await expectSelected(page, 1);
  });
});
