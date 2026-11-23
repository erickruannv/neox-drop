import { test, expect } from "@playwright/test";
import fixture from "./fixtures/home.json" with { type: "json" };

// Offline: substitui a Viewer API do Sketchfab por um dublê que só registra as chamadas de
// câmera. Prova a lógica (foto primeiro, 3D por clique, giro só em Y, troca no carrossel,
// fallback). O 3D real com rede e GPU é coberto por `pnpm test:3d` (tests/e2e/live).
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

const sf = (page) => page.evaluate(() => window.__sf ?? { inits: [], looks: [] });
const dialog = (page) => page.getByRole("dialog");
const pad = (page) => dialog(page).locator("[data-rotate-pad]");
const open = (page) => page.locator("#hero").getByRole("button", { name: /em 3D/ }).click();
const ZOOM = 0.8; // viewer3d.js: aproximação do palco

async function drag(page, dx, dy) {
  const b = await pad(page).boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

test("hero: nada do Sketchfab carrega antes do clique em 'Ver em 3D'", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300);
  expect((await sf(page)).inits).toEqual([]);
  await expect(dialog(page)).toBeHidden();
});

test("palco 3D: arraste horizontal gira só em Y; vertical não move a câmera", async ({ page, isMobile }) => {
  test.skip(isMobile, "toque real coberto em test:3d");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await open(page);
  await expect(pad(page)).toBeVisible();
  await expect(dialog(page).locator("[data-viewer-poster]")).toBeHidden();
  await expect(dialog(page).locator("[data-viewer-title]")).toHaveText(items[0].name);
  await expect(dialog(page).locator("[data-viewer-credit]")).toHaveText(items[0].attributes.model3dCredit);
  const { inits } = await sf(page);
  expect(inits.map((i) => i.uid)).toEqual([uidOf(items[0])]);
  expect(inits[0].o).toMatchObject({ autostart: 1, preload: 1, transparent: 1 });

  await drag(page, 200, 0);
  const looks = (await sf(page)).looks;
  expect(looks.length).toBeGreaterThan(1);
  // Câmera do dublê: olho (0,-8,2.5), alvo (0,0,0.2); o palco aproxima ZOOM.
  for (const [x, y, z] of looks) {
    expect(z).toBeCloseTo(0.2 + 2.3 * ZOOM, 9); // altura fixa: sem inclinação
    expect(Math.hypot(x, y)).toBeCloseTo(8 * ZOOM, 9); // distância fixa: sem zoom
  }
  expect(looks.at(-1)[0]).not.toBeCloseTo(0, 2);

  const n = looks.length;
  await drag(page, 0, -200);
  expect((await sf(page)).looks.length).toBe(n);

  await pad(page).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(pad(page)).toHaveAttribute("aria-valuetext", /graus/);
});

test("palco 3D: reduced-motion não gira sozinho; sem ele gira até o primeiro gesto", async ({ page, isMobile }) => {
  test.skip(isMobile, "mesma lógica do desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await open(page);
  await expect(pad(page)).toBeVisible();
  const still = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(still);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await open(page);
  await expect(pad(page)).toBeVisible();
  await expect.poll(async () => (await sf(page)).looks.length).toBeGreaterThan(5);
  await drag(page, 10, 0);
  const after = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(after);
});

test("palco 3D: Esc fecha, devolve o foco; destaque sem 3D esconde o botão; voltar reabre o modelo certo", async ({ page }) => {
  const [with3d, without] = [items.find(uidOf), items.find((i) => !uidOf(i))];
  const thumb = (it) => page.locator(`#hero [data-thumbs] button[data-id="${it.id}"]`);
  await page.goto("/");
  await thumb(with3d).click();
  await open(page);
  await expect(pad(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator("#hero").getByRole("button", { name: /em 3D/ })).toBeFocused();

  await thumb(without).click();
  await expect(page.locator("#hero h1")).toHaveText(without.name);
  await expect(page.locator("#hero").getByRole("button", { name: /em 3D/ })).toBeHidden(); // nunca outro tênis no lugar

  await thumb(with3d).click();
  await open(page);
  await expect(pad(page)).toBeVisible();
  expect((await sf(page)).inits.at(-1).uid).toBe(uidOf(with3d));
  await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(with3d.name));
  await expect(dialog(page).locator("[data-viewer-poster]")).toBeHidden();
});

test("palco 3D: falha ao carregar a Viewer API mostra aviso e mantém a foto", async ({ page }) => {
  await page.unroute("https://static.sketchfab.com/**");
  await page.route("https://static.sketchfab.com/**", (r) => r.abort());
  await page.goto("/");
  await open(page);
  await expect(dialog(page).locator("[data-viewer-hint]")).toContainText("indisponível");
  await expect(dialog(page).locator("[data-viewer-poster]")).toBeVisible();
  await expect(pad(page)).toBeHidden();
});

test("produto: 'Ver em 3D' abre o mesmo palco com o modelo do produto", async ({ page }) => {
  const item = items.find(uidOf);
  await page.goto(`/tenis/${item.slug}/`);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
  await page.getByRole("button", { name: `Ver ${item.name} em 3D` }).click();
  await expect(pad(page)).toBeVisible();
  expect((await sf(page)).inits.at(-1).uid).toBe(uidOf(item));
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole("link", { name: item.attributes.imageCredit })).toHaveAttribute("href", item.attributes.imageCreditUrl);
});
