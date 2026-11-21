import { test, expect } from "@playwright/test";
import fixture from "../fixtures/home.json" with { type: "json" };

// Teste REAL (sem mock): carrega os modelos do Sketchfab na GPU, arrasta com mouse/toque e
// confere giro só em Y. Precisa de rede. Capturas em test-results/ (SHOTS=dir para copiar).
const items = fixture.featured.items;
const SHOTS = process.env.SHOTS;

const media = (page) => page.locator("#hero [data-hero-media]");
const pad = (page) => page.locator("#hero [data-rotate-pad]");
const yaw = async (page) => Number(await pad(page).getAttribute("aria-valuenow"));

async function choose(page, item) {
  await page.locator(`#hero [data-thumbs] button[data-id="${item.id}"]`).click();
  await expect(page.locator("#hero h1")).toHaveText(item.name);
}

async function expectReady(page, item) {
  await expect(page.locator("#hero [data-sketchfab-frame]")).not.toHaveClass(/opacity-0/);
  await expect(pad(page)).toBeVisible();
  await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(item.name));
  await expect(page.locator('#hero img[data-field="image"]')).toBeHidden();
  await expect(page.locator("#hero [data-model-hint]")).toHaveText("Arraste para girar 360°");
  await expect(page.locator('#hero [data-field="credit"]')).toHaveText(item.attributes.model3dCredit);
}

// Arraste real: mouse no desktop; toque via CDP (gera pointer events "touch" de verdade).
async function drag(page, dx, dy, isMobile) {
  const b = await pad(page).boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
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

test("os modelos 3D reais carregam e trocam com o carrossel", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const item of items) {
    await choose(page, item);
    if (!item.model3dUrl) {
      await expect(page.locator('#hero img[data-field="image"]')).toBeVisible();
      await expect(page.locator("#hero [data-model-hint]")).toHaveText("Visualização 3D indisponível para este modelo");
      await expect(pad(page)).toBeHidden();
    } else {
      await expectReady(page, item);
      await page.waitForTimeout(1500); // texturas finais
    }
    const shot = await page.locator("#hero").screenshot();
    await info.attach(item.slug, { body: shot, contentType: "image/png" });
    if (SHOTS) (await import("node:fs")).writeFileSync(`${SHOTS}/${info.project.name}-${item.slug}.png`, shot);
  }
});

test("arraste horizontal gira em Y; arraste vertical não inclina", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // sem giro automático: mede só o gesto
  await page.goto("/");
  const item = items.find((i) => i.model3dUrl);
  await choose(page, item);
  await expectReady(page, item);
  await page.waitForTimeout(1500);

  const y0 = await yaw(page);
  const before = await media(page).screenshot();
  await drag(page, 160, 0, isMobile);
  await expect.poll(() => yaw(page)).not.toBe(y0);
  await page.waitForTimeout(800);
  expect(Buffer.compare(before, await media(page).screenshot())).not.toBe(0);

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
  const item = items.find((i) => i.model3dUrl);
  await choose(page, item);
  await expectReady(page, item);
  const a = await yaw(page);
  await expect.poll(() => yaw(page), { timeout: 10_000 }).not.toBe(a);
});

test("produto: 'Ver em 3D' carrega o modelo real e gira com o gesto", async ({ page, isMobile }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const item = items.find((i) => i.model3dUrl);
  await page.goto(`/tenis/${item.slug}/`);
  await page.getByRole("button", { name: "Ver em 3D" }).click();
  const gpad = page.locator("[data-gallery] [data-rotate-pad]");
  await expect(gpad).toBeVisible();
  await expect(page.locator("[data-gallery-main]")).toBeHidden();
  await page.waitForTimeout(1500);
  const y0 = Number(await gpad.getAttribute("aria-valuenow"));
  const b = await gpad.boundingBox();
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + 100, y: b.y + b.height / 2 }] });
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x + 100 + i * 12, y: b.y + b.height / 2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(b.x + 100, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 260, b.y + b.height / 2, { steps: 10 });
    await page.mouse.up();
  }
  await expect.poll(async () => Number(await gpad.getAttribute("aria-valuenow"))).not.toBe(y0);
  await page.waitForTimeout(800);
  const shot = await page.locator("[data-gallery]").screenshot();
  if (SHOTS) (await import("node:fs")).writeFileSync(`${SHOTS}/${info.project.name}-produto-3d.png`, shot);
});
