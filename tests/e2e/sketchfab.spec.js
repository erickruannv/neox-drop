import { test, expect } from "@playwright/test";
import home from "./fixtures/home.json" with { type: "json" };
import extra from "./fixtures/products.json" with { type: "json" };

// Offline: substitui a Viewer API do Sketchfab por um dublê que só registra as chamadas de
// câmera. O player gratuito do Sketchfab mostra marca e controles obrigatórios, então ele só
// aparece no bloco separado "Demonstração 3D" da página do produto, nunca no hero nem na foto
// principal. O 3D real com rede e GPU é coberto por `pnpm test:3d` (tests/e2e/live).
const all = [...home.featured.items, ...extra.extraDetails];
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
const with3d = all.find(uidOf);
const without = all.find((i) => !uidOf(i));
const media = (page) => page.locator("[data-3d-demo]");
const pill = (page) => media(page).locator("[data-3d-toggle]");
const pad = (page) => media(page).locator("[data-rotate-pad]");
const ZOOM = 0.85; // product.js: aproximação do 3D na demonstração

async function demo(page) {
  await page.goto(`/tenis/${with3d.slug}/`);
  await expect(page.getByRole("heading", { name: "Demonstração 3D" })).toBeVisible();
  await media(page).scrollIntoViewIfNeeded();
}
const open = (page) => pill(page).click();

async function drag(page, dx, dy) {
  const b = await pad(page).boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

test("hero nunca embute o player do Sketchfab, nem com o AM95 em destaque", async ({ page }) => {
  await page.goto("/");
  await page.locator(`#hero [data-thumbs] button[data-id="${with3d.id}"]`).click();
  await expect(page.locator("#hero h1")).toHaveText(with3d.name);
  await expect(page.locator("#hero [data-3d-toggle]")).toBeHidden();
  await page.locator("#hero [data-hero-media]").click();
  await page.waitForTimeout(300);
  expect((await sf(page)).inits).toEqual([]);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
});

test("produto: foto principal sem player; demonstração separada e identificada, nada carrega antes da interação", async ({ page }) => {
  await demo(page);
  await expect(page.locator("[data-gallery-main] ~ [data-3d-toggle]")).toHaveCount(0);
  await page.locator("[data-gallery-main]").click();
  await expect(page.locator("[data-gallery-main] ~ [data-sketchfab-frame]")).toHaveCount(0);
  await expect(page.locator("#demo-3d-titulo + p, [aria-labelledby=demo-3d-titulo]").first()).toContainText("Sketchfab");
  await expect(pill(page)).toBeVisible();
  await expect(pill(page)).toHaveAccessibleName(`Girar ${with3d.name} em 360 graus`);
  await page.waitForTimeout(300);
  expect((await sf(page)).inits).toEqual([]);
});

test("toque na demonstração carrega o 3D do mesmo produto (celular)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "toque");
  await demo(page);
  await media(page).tap();
  await expect(pad(page)).toBeVisible();
  expect((await sf(page)).inits.map((i) => i.uid)).toEqual([uidOf(with3d)]);
});

test("demonstração: arraste horizontal gira só em Y; vertical não move a câmera", async ({ page, isMobile }) => {
  test.skip(isMobile, "toque real coberto em test:3d");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await demo(page);
  await open(page);
  await expect(pad(page)).toBeVisible();
  await expect(media(page)).toHaveAttribute("data-state3d", "ready");
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "0");
  await expect(pill(page)).toHaveText("Ver foto");
  const { inits } = await sf(page);
  expect(inits.map((i) => i.uid)).toEqual([uidOf(with3d)]);
  expect(inits[0].o).toMatchObject({ autostart: 1, preload: 1, transparent: 1 });

  await drag(page, 200, 0);
  const looks = (await sf(page)).looks;
  expect(looks.length).toBeGreaterThan(1);
  // Câmera do dublê: olho (0,-8,2.5), alvo (0,0,0.2); a demonstração aproxima ZOOM.
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

test("demonstração: reduced-motion não gira sozinho; sem ele gira até o primeiro gesto", async ({ page, isMobile }) => {
  test.skip(isMobile, "mesma lógica do desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await demo(page);
  await open(page);
  await expect(pad(page)).toBeVisible();
  const still = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(still);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await demo(page);
  await open(page);
  await expect(pad(page)).toBeVisible();
  await expect.poll(async () => (await sf(page)).looks.length).toBeGreaterThan(5);
  await drag(page, 10, 0);
  const after = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(after);
});

test("teclado: pílula ativa e leva o foco ao giro; Esc volta à foto", async ({ page }) => {
  await demo(page);
  await pill(page).focus();
  await page.keyboard.press("Enter");
  await expect(pad(page)).toBeFocused();
  await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(with3d.name));
  await page.keyboard.press("Escape");
  await expect(media(page)).toHaveAttribute("data-state3d", "idle");
  await expect(pill(page)).toBeFocused();
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1");
});

test("falha ao carregar a Viewer API: aviso e a foto continua", async ({ page }) => {
  await page.unroute("https://static.sketchfab.com/**");
  await page.route("https://static.sketchfab.com/**", (r) => r.abort());
  await demo(page);
  await open(page);
  await expect(pill(page)).toHaveText("3D indisponível");
  await expect(media(page).locator("[data-3d-status]")).toContainText("indisponível");
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1");
  await expect(pad(page)).toBeHidden();
});

test("script carrega mas o modelo nunca fica pronto → aviso e foto após o timeout", async ({ page }) => {
  await page.unroute("https://static.sketchfab.com/**");
  const NEVER = FAKE.replace('if (ev === "viewerready") setTimeout(cb, 20);', "");
  await page.route("https://static.sketchfab.com/**", (r) => r.fulfill({ contentType: "application/javascript", body: NEVER }));
  await page.addInitScript(() => (window.__sfTimeoutMs = 400));
  await demo(page);
  await open(page);
  await expect(media(page)).toHaveAttribute("data-state3d", "loading");
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1"); // foto durante o carregamento
  await expect(pill(page)).toHaveText("3D indisponível");
  await expect(pad(page)).toBeHidden();
});

test("produto sem 3D: sem demonstração, sem pílula e sem 3D", async ({ page }) => {
  await page.goto(`/tenis/${without.slug}/`);
  await expect(page.locator("[data-3d-demo], [data-3d-toggle]")).toHaveCount(0);
  await page.locator("[data-gallery-main]").click();
  await page.waitForTimeout(200);
  await expect(page.locator("[data-sketchfab-frame], model-viewer")).toHaveCount(0);
});

test("produto: atalho \"Ver em 3D\" na foto leva à demonstração e já carrega o modelo", async ({ page }) => {
  await page.goto(`/tenis/${with3d.slug}/`);
  const jump = page.locator("[data-gallery] [data-3d-jump]");
  await expect(jump).toBeVisible();
  await expect(jump).toHaveAttribute("href", "#demo-3d");
  await jump.click();
  await expect(media(page)).toBeInViewport();
  await expect(pad(page)).toBeVisible();
  expect((await sf(page)).inits.map((i) => i.uid)).toEqual([uidOf(with3d)]);
});

test("produto sem 3D: sem atalho \"Ver em 3D\"", async ({ page }) => {
  await page.goto(`/tenis/${without.slug}/`);
  await expect(page.locator("[data-3d-jump]")).toHaveCount(0);
});
