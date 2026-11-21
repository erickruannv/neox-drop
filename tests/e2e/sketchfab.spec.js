import { test, expect } from "@playwright/test";
import fixture from "./fixtures/home.json" with { type: "json" };

// Offline: substitui a Viewer API do Sketchfab por um dublê que só registra as chamadas de
// câmera. Prova a lógica (giro só em Y, troca no carrossel, fallback). O 3D real com rede e
// GPU é coberto por `pnpm test:3d` (tests/e2e/live).
const items = fixture.featured.items;
const uidOf = (item) => item.model3dUrl?.match(/models\/([0-9a-f]{32})\//)?.[1];
const FAKE = `
window.__sf = { inits: [], looks: [] };
window.Sketchfab = function () {
  this.init = (uid, o) => {
    __sf.inits.push({ uid, o });
    const api = {
      start() {},
      addEventListener(ev, cb) { if (ev === "viewerready") setTimeout(cb, 20); },
      getCameraLookAt(cb) { cb(null, { position: [0, -8, 2.5], target: [0, 0, 0.2] }); },
      setCameraLookAt(p) { __sf.looks.push(p); },
    };
    setTimeout(() => o.success(api), 10);
  };
};`;

test.beforeEach(async ({ page }) => {
  await page.route("https://static.sketchfab.com/**", (r) => r.fulfill({ contentType: "application/javascript", body: FAKE }));
});

const sf = (page) => page.evaluate(() => window.__sf);
const pad = (page) => page.locator("#hero [data-rotate-pad]");

async function drag(page, dx, dy) {
  const b = await pad(page).boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

test("hero: arraste horizontal gira só em Y; vertical não move a câmera", async ({ page, isMobile }) => {
  test.skip(isMobile, "toque real coberto em test:3d");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(pad(page)).toBeVisible();
  await expect(page.locator('#hero img[data-field="image"]')).toBeHidden();
  await expect(page.locator('#hero [data-field="credit"]')).toHaveText(items[0].attributes.model3dCredit);
  const { inits } = await sf(page);
  expect(inits.map((i) => i.uid)).toEqual([uidOf(items[0])]);
  expect(inits[0].o).toMatchObject({ autostart: 1, preload: 1, transparent: 1 });

  const n0 = (await sf(page)).looks.length;
  await drag(page, 200, 0);
  const looks = (await sf(page)).looks;
  expect(looks.length).toBeGreaterThan(n0);
  // Câmera do dublê: olho (0,-8,2.5), alvo (0,0,0.2); enquadramento aproxima 0,62x.
  for (const [x, y, z] of looks) {
    expect(z).toBeCloseTo(0.2 + 2.3 * 0.62, 9); // altura da câmera fixa: sem inclinação
    expect(Math.hypot(x, y)).toBeCloseTo(8 * 0.62, 9); // distância horizontal fixa: sem zoom
  }
  expect(looks.at(-1)[0]).not.toBeCloseTo(0, 2);

  const n1 = looks.length;
  await drag(page, 0, -200);
  expect((await sf(page)).looks.length).toBe(n1);

  await pad(page).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(pad(page)).toHaveAttribute("aria-valuetext", /graus/);
});

test("hero: reduced-motion não gira sozinho; sem ele gira até o primeiro gesto", async ({ page, isMobile }) => {
  test.skip(isMobile, "mesma lógica do desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(pad(page)).toBeVisible();
  const still = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(still);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(pad(page)).toBeVisible();
  await expect.poll(async () => (await sf(page)).looks.length).toBeGreaterThan(5);
  await drag(page, 10, 0);
  const after = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(after);
});

test("hero: carrossel troca o modelo 3D junto; sem modelo mostra foto e aviso", async ({ page }) => {
  await page.goto("/");
  await expect(pad(page)).toBeVisible();
  for (const [i, item] of items.entries()) {
    if (i === 0) continue;
    await page.locator(`#hero [data-thumbs] button[data-id="${item.id}"]`).click();
    await expect(page.locator("#hero h1")).toHaveText(item.name);
    if (uidOf(item)) {
      await expect.poll(async () => (await sf(page)).inits.at(-1).uid).toBe(uidOf(item));
      await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(item.name));
      await expect(page.locator('#hero img[data-field="image"]')).toBeHidden();
    } else {
      await expect(pad(page)).toBeHidden();
      await expect(page.locator('#hero img[data-field="image"]')).toBeVisible();
      await expect(page.locator("#hero [data-model-hint]")).toHaveText("Visualização 3D indisponível para este modelo");
    }
  }
});

test("hero: falha ao carregar a Viewer API mantém a foto", async ({ page }) => {
  await page.unroute("https://static.sketchfab.com/**");
  await page.route("https://static.sketchfab.com/**", (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("#hero [data-model-hint]")).toHaveText("Modelo 3D indisponível agora");
  await expect(page.locator('#hero img[data-field="image"]')).toBeVisible();
  await expect(pad(page)).toBeHidden();
});

test("produto: 'Ver em 3D' abre o modelo sob demanda e volta para a foto", async ({ page }) => {
  const item = items.find(uidOf);
  await page.goto(`/tenis/${item.slug}/`);
  const btn = page.getByRole("button", { name: "Ver em 3D" });
  await expect(page.locator("[data-gallery] [data-sketchfab-frame]")).toHaveCount(0); // nada carregado antes do clique
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-gallery-main]")).toBeHidden();
  await expect(page.locator("[data-gallery] [data-rotate-pad]")).toBeVisible();
  expect((await sf(page)).inits.at(-1).uid).toBe(uidOf(item));
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-gallery-main]")).toBeVisible();
  await expect(page.locator("[data-gallery] [data-rotate-pad]")).toBeHidden();
  await expect(page.getByRole("link", { name: item.attributes.model3dCredit })).toHaveAttribute("href", item.attributes.model3dCreditUrl);
});
