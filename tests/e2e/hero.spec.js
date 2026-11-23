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

const media = (page) => hero(page).locator("[data-hero-media]");
const pill = (page) => hero(page).locator("[data-3d-toggle]");

// Arraste horizontal curto sobre a foto: é o gesto que revela o 3D.
async function dragPhoto(page, dx, dy = 0) {
  const b = await media(page).boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}

test("abre com a foto; sem model3dUrl não há convite para girar nem 3D", async ({ page }) => {
  await page.goto("/sem-3d/");
  await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
  await expect(pill(page)).toBeHidden();
  await media(page).click();
  await page.waitForTimeout(200);
  await expect(page.locator("model-viewer, [data-sketchfab-frame]")).toHaveCount(0);
  await expect(hero(page).getByText(/girar/i)).toBeHidden();
});

test("com model3dUrl: foto primeiro, pílula discreta e nada de 3D até interagir", async ({ page }) => {
  await page.goto("/model/");
  await expect(hero(page).locator('img[data-field="image"]')).toBeVisible();
  await expect(pill(page)).toBeVisible();
  await expect(pill(page)).toHaveText("Girar 360°");
  await expect(pill(page)).toHaveAccessibleName(`Girar ${items[0].name} em 360 graus`);
  await expect(page.locator("model-viewer, [data-sketchfab-frame]")).toHaveCount(0);
});

test.describe("3D no lugar da foto com GLB (fictício, sem ativo licenciado)", () => {
  test("arraste horizontal na foto ativa o Model Viewer travado em Y; a foto fica enquanto carrega", async ({ page }) => {
    await page.route("**/*.glb", () => {}); // nunca responde: simula carregamento lento
    await page.goto("/model/");
    await dragPhoto(page, 80);
    const mv = media(page).locator("model-viewer");
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
    await expect(media(page)).toHaveAttribute("data-state3d", "loading");
    await expect(pill(page)).toHaveText("Carregando 3D…");
    await expect(hero(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1");
  });

  test("arraste vertical não ativa (a página rola); toque/clique ativa; reduced-motion sem auto-rotate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/*.glb", () => {});
    await page.goto("/model/");
    await dragPhoto(page, 0, 80);
    await page.waitForTimeout(200);
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await media(page).click();
    await expect(media(page).locator("model-viewer")).not.toHaveAttribute("auto-rotate");
  });

  test("teclado: Enter na pílula ativa; Esc volta à foto e devolve o foco", async ({ page }) => {
    await page.route("**/*.glb", () => {});
    await page.goto("/model/");
    await pill(page).focus();
    await page.keyboard.press("Enter");
    await expect(media(page)).toHaveAttribute("data-state3d", "loading");
    await page.keyboard.press("Escape");
    await expect(media(page)).toHaveAttribute("data-state3d", "idle");
    await expect(pill(page)).toBeFocused();
    await expect(page.locator("model-viewer")).toHaveCount(0);
  });

  test("falha do GLB: volta à foto com aviso; trocar de destaque reseta", async ({ page }) => {
    await page.route("**/*.glb", (route) => route.abort());
    await page.goto("/model/");
    await pill(page).click();
    await expect(pill(page)).toHaveText("3D indisponível", { timeout: 10_000 });
    await expect(hero(page).locator("[data-3d-status]")).toContainText("indisponível");
    await expect(hero(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1");
    await expect(page.locator("model-viewer")).toHaveCount(0);
    await hero(page).locator(`[data-thumbs] button[data-id="${items[1].id}"]`).click();
    await expectSelected(page, 1);
    await expect(media(page)).toHaveAttribute("data-state3d", "idle");
  });
});
