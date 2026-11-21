import { test, expect } from "@playwright/test";
import fixture from "../fixtures/home.json" with { type: "json" };

// Teste REAL (sem mock): abre "Ver em 3D", carrega o modelo do Sketchfab na GPU, arrasta com
// mouse/toque e confere giro só em Y. Precisa de rede. SHOTS=dir grava as capturas.
const items = fixture.featured.items;
const SHOTS = process.env.SHOTS;
const save = async (buf, name) => SHOTS && (await import("node:fs")).writeFileSync(`${SHOTS}/${name}.png`, buf);

const dialog = (page) => page.getByRole("dialog");
const pad = (page) => dialog(page).locator("[data-rotate-pad]");
const yaw = async (page) => Number(await pad(page).getAttribute("aria-valuenow"));

async function ready(page, item) {
  await expect(pad(page)).toBeVisible();
  await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(item.name));
  await expect(dialog(page).locator("[data-viewer-poster]")).toBeHidden();
  await expect(dialog(page).locator("[data-viewer-hint]")).toHaveText("Arraste na horizontal para girar 360°");
  await page.waitForTimeout(2500); // texturas finais e UI do player some
}

// Arraste real: mouse no desktop; toque via CDP (gera pointer events "touch" de verdade).
async function drag(page, dx, dy, isMobile) {
  const b = await pad(page).boundingBox();
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  if (!isMobile) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 15 });
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, px, py) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: px, y: py }] });
  await touch("touchStart", x, y);
  for (let i = 1; i <= 15; i++) await touch("touchMove", x + (dx * i) / 15, y + (dy * i) / 15);
  await touch("touchEnd");
}

test("home abre com foto; cada destaque abre seu modelo 3D real", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
  await page.waitForTimeout(800);
  await save(await page.screenshot(), `${info.project.name}-home`);
  for (const item of items) {
    await page.locator(`#hero [data-thumbs] button[data-id="${item.id}"]`).click();
    await expect(page.locator("#hero h1")).toHaveText(item.name);
    await page.locator("#hero").getByRole("button", { name: `Ver ${item.name} em 3D` }).click();
    await ready(page, item);
    await save(await page.screenshot(), `${info.project.name}-3d-${item.slug}`);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
  }
});

test("arraste horizontal gira em Y; arraste vertical não inclina", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // sem giro automático: mede só o gesto
  await page.goto("/");
  await page.locator("#hero").getByRole("button", { name: /em 3D/ }).click();
  await ready(page, items[0]);

  const y0 = await yaw(page);
  const stage = dialog(page).locator("[data-viewer-stage]");
  const before = await stage.screenshot();
  await drag(page, 160, 0, isMobile);
  await expect.poll(() => yaw(page)).not.toBe(y0);
  await page.waitForTimeout(800);
  expect(Buffer.compare(before, await stage.screenshot())).not.toBe(0);

  const y1 = await yaw(page);
  await drag(page, 0, isMobile ? 120 : -160, isMobile);
  await page.waitForTimeout(800);
  expect(await yaw(page)).toBe(y1); // vertical não muda o ângulo nem inclina (z da câmera fixo)

  await pad(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => yaw(page)).toBe((y1 + 15) % 360);
});

test("sem reduced-motion o modelo gira sozinho até o usuário interagir", async ({ page }) => {
  await page.goto("/");
  await page.locator("#hero").getByRole("button", { name: /em 3D/ }).click();
  await expect(pad(page)).toBeVisible();
  const a = await yaw(page);
  await expect.poll(() => yaw(page), { timeout: 10_000 }).not.toBe(a);
});

test("produto: galeria real e 'Ver em 3D' com o modelo real", async ({ page, isMobile }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const item = items.find((i) => i.galleryUrls.length > 1) ?? items[0];
  await page.goto(`/tenis/${item.slug}/`);
  await page.waitForTimeout(600);
  await save(await page.screenshot(), `${info.project.name}-produto`);
  await page.getByRole("button", { name: `Ver ${item.name} em 3D` }).click();
  await ready(page, item);
  const y0 = await yaw(page);
  await drag(page, 140, 0, isMobile);
  await expect.poll(() => yaw(page)).not.toBe(y0);
  await page.waitForTimeout(800);
  await save(await page.screenshot(), `${info.project.name}-produto-3d`);
});

test("catálogo: só produtos com foto real", async ({ page }, info) => {
  await page.goto("/tenis");
  await page.waitForTimeout(600);
  await save(await page.screenshot({ fullPage: true }), `${info.project.name}-catalogo`);
  const srcs = await page.locator("[data-catalog-list] [data-card=image]").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
  expect(srcs.length).toBeGreaterThan(0);
  for (const s of srcs) expect(s).toMatch(/^\/static\/images\/products\/.+\.webp$/);
});
