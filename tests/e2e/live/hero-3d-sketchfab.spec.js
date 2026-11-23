import { test, expect } from "@playwright/test";
import home from "../fixtures/home.json" with { type: "json" };
import extra from "../fixtures/products.json" with { type: "json" };

// Teste REAL (sem mock), na GPU: o hero e a foto principal nunca embutem o player do Sketchfab;
// o modelo aparece só no bloco "Demonstração 3D" do produto, ao interagir (arrastar/tocar), e gira
// só em Y. Precisa de rede. SHOTS=dir grava as capturas.
const items = [...home.featured.items, ...extra.extraDetails].filter((i) => i.model3dUrl);
const SHOTS = process.env.SHOTS;
if (SHOTS) await (await import("node:fs/promises")).mkdir(SHOTS, { recursive: true });
const save = async (buf, name) => SHOTS && (await import("node:fs")).writeFileSync(`${SHOTS}/${name}.png`, buf);

const stage = (page) => page.locator("[data-3d-demo]");
const pad = (page) => stage(page).locator("[data-rotate-pad]");
const yaw = async (page) => Number(await pad(page).getAttribute("aria-valuenow"));

// Gesto real que revela o 3D: arraste horizontal (mouse) ou toque (celular) sobre a foto.
async function activate(page, isMobile) {
  await stage(page).scrollIntoViewIfNeeded();
  if (isMobile) return stage(page).tap();
  const b = await stage(page).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
}

async function ready(page, item) {
  await expect(pad(page)).toBeVisible();
  await expect(pad(page)).toHaveAttribute("aria-label", new RegExp(item.name));
  await expect(stage(page)).toHaveAttribute("data-state3d", "ready");
  await expect(stage(page).locator("[data-3d-photo]")).toHaveCSS("opacity", "0");
  await expect(stage(page).locator("[data-3d-status]")).toContainText("Arraste na horizontal");
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

test("home abre com foto e nenhum destaque embute o player do Sketchfab", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const featured = JSON.parse(await page.locator("#hero-data").textContent());
  await page.waitForTimeout(800);
  await save(await page.screenshot(), `${info.project.name}-home`);
  for (const item of featured) {
    await page.locator(`#hero [data-thumbs] button[data-id="${item.id}"]`).click();
    await expect(page.locator("#hero h1")).toHaveText(item.name);
    await expect(page.locator("#hero [data-3d-toggle]")).toBeHidden();
  }
  await page.locator("#hero [data-hero-media]").click();
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
});

async function demoReady(page, isMobile) {
  await page.goto(`/tenis/${items[0].slug}/`);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
  await activate(page, isMobile);
  await ready(page, items[0]);
}

test("demonstração 3D: arraste horizontal gira em Y; arraste vertical não inclina", async ({ page, isMobile }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // sem giro automático: mede só o gesto
  await demoReady(page, isMobile);
  await save(await stage(page).screenshot(), `${info.project.name}-demo-3d`);

  const y0 = await yaw(page);
  const before = await stage(page).screenshot();
  await drag(page, 160, 0, isMobile);
  await expect.poll(() => yaw(page)).not.toBe(y0);
  await page.waitForTimeout(800);
  expect(Buffer.compare(before, await stage(page).screenshot())).not.toBe(0);

  const y1 = await yaw(page);
  await drag(page, 0, isMobile ? 120 : -160, isMobile);
  await page.waitForTimeout(800);
  expect(await yaw(page)).toBe(y1); // vertical não muda o ângulo nem inclina (z da câmera fixo)

  await pad(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => yaw(page)).toBe((y1 + 15) % 360);
  await page.keyboard.press("Escape");
  await expect(stage(page)).toHaveAttribute("data-state3d", "idle");
});

test("sem reduced-motion o modelo gira sozinho até o usuário interagir", async ({ page }) => {
  await page.goto(`/tenis/${items[0].slug}/`);
  await stage(page).scrollIntoViewIfNeeded();
  await stage(page).locator("[data-3d-toggle]").click();
  await expect(pad(page)).toBeVisible();
  const a = await yaw(page);
  await expect.poll(() => yaw(page), { timeout: 10_000 }).not.toBe(a);
});

test("catálogo: só produtos com foto real", async ({ page }, info) => {
  await page.goto("/tenis");
  await page.waitForTimeout(600);
  await save(await page.screenshot({ fullPage: true }), `${info.project.name}-catalogo`);
  const srcs = await page.locator("[data-catalog-list] [data-card=image]").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
  expect(srcs.length).toBeGreaterThan(0);
  for (const s of srcs) expect(s).toMatch(/^\/static\/images\/products\/.+\.webp$/);
});

test("FastAPI integrado: navegação, mídia, CSP e carrinho sem liberar admin/checkout", async ({ page }) => {
  // Modo vitrine somente leitura (faixa de demonstração, checkout 403). O app completo com
  // checkout real é coberto por delivery.spec.js.
  test.skip(!process.env.NEOX_FASTAPI_URL || process.env.NEOX_READONLY_SHOWCASE !== "1", "Requer vitrine FastAPI somente leitura");
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => window.cspViolations.push(e.violatedDirective));
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/tenis", ...items.map((p) => `/tenis/${p.slug}`)]) {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-security-policy"]).toContain("frame-src https://sketchfab.com");
    await expect(page.locator("[data-demo-banner]")).toContainText("estoque ilustrativos");
    const photos = page.locator('main img[src*="/images/products/"]');
    expect(await photos.count()).toBeGreaterThan(0);
    for (const photo of await photos.all()) {
      await photo.evaluate((i) => i.scrollIntoView({ block: "center", behavior: "instant" }));
      await expect.poll(() => photo.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  }
  await page.locator('input[name="sizeBR"]').first().check();
  await page.getByRole("button", { name: /Adicionar ao carrinho/i }).click();
  await expect(page.locator("[data-cart-list] li")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.goto("/admin/login");
  await expect(page.locator("[data-demo-login-hint]")).toHaveCount(0);
  expect((await page.request.get("/api/admin/products")).status()).toBe(401);
  expect((await page.request.post("/api/checkout", { data: { items: [] } })).status()).toBe(403);
  expect(errors).toEqual([]);
});
