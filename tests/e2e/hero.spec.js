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
  const last = items.length - 1;
  await hero(page).locator(`[data-thumbs] button[data-id="${items[last].id}"]`).click();
  await expectSelected(page, last);
});

test("cliques rápidos: estado final corresponde ao último clique (sem race)", async ({ page }) => {
  await page.goto("/");
  for (const i of [1, 0, 1, 0, 1]) {
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
  const last = items.length - 1;
  await hero(page).locator(`[data-thumbs] button[data-id="${items[last].id}"]`).click();
  await expect(hero(page).locator("[data-live]")).toContainText(`Destaque ${items.length} de ${items.length}: ${items[last].name}`);
});

test("abre com a foto; sem model3dUrl não há botão 3D nem promessa de giro", async ({ page }) => {
  await page.goto("/sem-3d/");
  await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
  await expect(hero(page).getByRole("button", { name: /em 3D/ })).toBeHidden();
  await expect(page.locator("model-viewer, [data-sketchfab-frame]")).toHaveCount(0);
  await expect(hero(page)).not.toContainText(/girar/i);
});

test("com model3dUrl: foto primeiro, nada de 3D carregado até o clique", async ({ page }) => {
  await page.goto("/");
  await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
  await expect(hero(page).getByRole("button", { name: `Ver ${items[0].name} em 3D` })).toBeVisible();
  await expect(page.locator("model-viewer, [data-sketchfab-frame]")).toHaveCount(0);
});

const open3d = (page) => hero(page).getByRole("button", { name: /em 3D/ }).click();
const dialog = (page) => page.getByRole("dialog");

test.describe("Ver em 3D com GLB (fictício, sem ativo licenciado)", () => {
  test("Model Viewer travado em Y: phi igual em min/max, sem zoom/pan; foto visível enquanto carrega", async ({ page }) => {
    await page.route("**/*.glb", () => {}); // nunca responde: simula carregamento lento
    await page.goto("/model/");
    await open3d(page);
    const mv = dialog(page).locator("model-viewer");
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
    await expect(dialog(page).locator("[data-viewer-poster]")).toBeVisible();
    await expect(dialog(page).locator("[data-viewer-hint]")).toHaveText("Carregando modelo 3D…");
  });

  test("reduced-motion: sem auto-rotate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*.glb", () => {});
    await page.goto("/model/");
    await open3d(page);
    await expect(dialog(page).locator("model-viewer")).not.toHaveAttribute("auto-rotate");
  });

  test("falha do GLB: avisa no palco; fechar devolve o foco e o carrossel segue", async ({ page }) => {
    await page.route("**/*.glb", (route) => route.abort());
    await page.goto("/model/");
    await open3d(page);
    await expect(dialog(page).locator("[data-viewer-hint]")).toContainText("indisponível", { timeout: 10_000 });
    await dialog(page).getByRole("button", { name: "Fechar visualização 3D" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(hero(page).getByRole("button", { name: /em 3D/ })).toBeFocused();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await hero(page).locator(`[data-thumbs] button[data-id="${items[1].id}"]`).click();
    await expectSelected(page, 1);
  });
});
