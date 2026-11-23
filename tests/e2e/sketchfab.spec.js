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
const with3d = items.find(uidOf);
const without = items.find((i) => !uidOf(i));
const media = (page) => page.locator("#hero [data-hero-media]");
const pill = (page) => page.locator("#hero [data-3d-toggle]");
const pad = (page) => media(page).locator("[data-rotate-pad]");
const thumb = (page, it) => page.locator(`#hero [data-thumbs] button[data-id="${it.id}"]`);
const credit = (page) => page.locator('#hero [data-field="credit"]');
const ZOOM = 0.55; // hero.js: aproximação do 3D no hero (mesmo tamanho da foto)

async function heroWith3d(page) {
  await page.goto("/");
  await thumb(page, with3d).click();
  await expect(page.locator("#hero h1")).toHaveText(with3d.name);
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

test("hero: nada do Sketchfab carrega antes da interação; o destaque sem 3D não convida a girar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#hero h1")).toHaveText(items[0].name);
  if (!uidOf(items[0])) {
    await expect(pill(page)).toBeHidden();
    await media(page).click(); // tocar na foto do item sem 3D não abre o 3D de outro tênis
  }
  await thumb(page, with3d).click();
  await expect(pill(page)).toBeVisible();
  await page.waitForTimeout(300);
  expect((await sf(page)).inits).toEqual([]);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
});

test("toque na foto revela o 3D do mesmo produto (celular)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "toque");
  await heroWith3d(page);
  await media(page).tap(); // contêiner: a foto do hero flutua (animação) e nunca fica "estável"
  await expect(pad(page)).toBeVisible();
  expect((await sf(page)).inits.map((i) => i.uid)).toEqual([uidOf(with3d)]);
});

test("palco 3D: arraste horizontal gira só em Y; vertical não move a câmera", async ({ page, isMobile }) => {
  test.skip(isMobile, "toque real coberto em test:3d");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await heroWith3d(page);
  await open(page);
  await expect(pad(page)).toBeVisible();
  await expect(media(page)).toHaveAttribute("data-state3d", "ready");
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "0");
  await expect(pill(page)).toHaveText("Ver foto");
  await expect(credit(page)).toHaveText(with3d.attributes.model3dCredit);
  const { inits } = await sf(page);
  expect(inits.map((i) => i.uid)).toEqual([uidOf(with3d)]);
  expect(inits[0].o).toMatchObject({ autostart: 1, preload: 1, transparent: 1 });

  await drag(page, 200, 0);
  const looks = (await sf(page)).looks;
  expect(looks.length).toBeGreaterThan(1);
  // Câmera do dublê: olho (0,-8,2.5), alvo (0,0,0.2); o hero aproxima ZOOM.
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
  await heroWith3d(page);
  await open(page);
  await expect(pad(page)).toBeVisible();
  const still = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(still);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await heroWith3d(page);
  await open(page);
  await expect(pad(page)).toBeVisible();
  await expect.poll(async () => (await sf(page)).looks.length).toBeGreaterThan(5);
  await drag(page, 10, 0);
  const after = (await sf(page)).looks.length;
  await page.waitForTimeout(400);
  expect((await sf(page)).looks.length).toBe(after);
});

test("teclado: pílula ativa e leva o foco ao giro; Esc volta à foto; trocar de destaque reseta e reabre o modelo certo", async ({ page }) => {
  await heroWith3d(page);
  await pill(page).focus();
  await page.keyboard.press("Enter");
  await expect(pad(page)).toBeFocused();
  await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(with3d.name));
  await page.keyboard.press("Escape");
  await expect(media(page)).toHaveAttribute("data-state3d", "idle");
  await expect(pill(page)).toBeFocused();
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1");
  await expect(credit(page)).toHaveText(with3d.attributes.imageCredit);

  await open(page);
  await expect(pad(page)).toBeVisible();
  await thumb(page, without).click();
  await expect(page.locator("#hero h1")).toHaveText(without.name);
  await expect(pill(page)).toBeHidden(); // nunca o 3D de outro tênis no lugar
  await expect(pad(page)).toBeHidden();

  await thumb(page, with3d).click();
  await expect(pill(page)).toHaveText("Girar 360°");
  await open(page);
  await expect(pad(page)).toBeVisible();
  expect((await sf(page)).inits.at(-1).uid).toBe(uidOf(with3d));
});

test("falha ao carregar a Viewer API: aviso e a foto continua", async ({ page }) => {
  await page.unroute("https://static.sketchfab.com/**");
  await page.route("https://static.sketchfab.com/**", (r) => r.abort());
  await heroWith3d(page);
  await open(page);
  await expect(pill(page)).toHaveText("3D indisponível");
  await expect(page.locator("#hero [data-3d-status]")).toContainText("indisponível");
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1");
  await expect(pad(page)).toBeHidden();
});

test("script carrega mas o modelo nunca fica pronto → aviso e foto após o timeout", async ({ page }) => {
  await page.unroute("https://static.sketchfab.com/**");
  const NEVER = FAKE.replace('if (ev === "viewerready") setTimeout(cb, 20);', "");
  await page.route("https://static.sketchfab.com/**", (r) => r.fulfill({ contentType: "application/javascript", body: NEVER }));
  await page.addInitScript(() => (window.__sfTimeoutMs = 400));
  await heroWith3d(page);
  await open(page);
  await expect(media(page)).toHaveAttribute("data-state3d", "loading");
  await expect(media(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "1"); // foto durante o carregamento
  await expect(pill(page)).toHaveText("3D indisponível");
  await expect(pad(page)).toBeHidden();
});

test("produto: arrastar a foto revela o 3D do próprio produto; Esc volta à foto", async ({ page, isMobile }) => {
  const stage = page.locator("[data-3d-stage]");
  await page.goto(`/tenis/${with3d.slug}/`);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /em 3D/ })).toHaveCount(0); // sem botão grande
  if (isMobile) await stage.locator("[data-3d-photo]").tap();
  else {
    const b = await stage.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 5 });
    await page.mouse.up();
  }
  await expect(stage.locator("[data-rotate-pad]")).toBeVisible();
  expect((await sf(page)).inits.at(-1).uid).toBe(uidOf(with3d));
  await stage.locator("[data-rotate-pad]").focus();
  await page.keyboard.press("Escape");
  await expect(stage).toHaveAttribute("data-state3d", "idle");
  await expect(page.getByRole("link", { name: with3d.attributes.imageCredit })).toHaveAttribute("href", with3d.attributes.imageCreditUrl);
});

test("produto sem 3D: sem pílula e sem 3D", async ({ page }) => {
  await page.goto(`/tenis/${without.slug}/`);
  await expect(page.locator("[data-3d-toggle]")).toBeHidden();
  await page.locator("[data-3d-stage]").click();
  await page.waitForTimeout(200);
  await expect(page.locator("[data-sketchfab-frame], model-viewer")).toHaveCount(0);
});
