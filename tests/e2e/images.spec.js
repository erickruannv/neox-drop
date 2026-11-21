import { test, expect } from "@playwright/test";

// Fotos reais chegam em proporções variadas (quadrada com fundo branco, retrato, recorte largo).
// As molduras não podem depender do 630×304 das ilustrações demo.
const shapes = [
  [900, 900, "#ffffff"], // foto quadrada com fundo branco
  [600, 1000, "none"], // retrato transparente
  [1600, 600, "none"], // recorte largo
];
const svg = ([w, h, bg]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.4}" ry="${h * 0.25}" fill="#333"/></svg>`;

test.beforeEach(async ({ page }) => {
  let n = 0;
  await page.route("**/static/images/products/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: svg(shapes[n++ % shapes.length]) }),
  );
});

const box = (loc) => loc.evaluate((el) => el.getBoundingClientRect().toJSON());
const inside = (inner, outer) =>
  inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;

test("cards: moldura 3:2 fixa e imagem contida, qualquer proporção", async ({ page }) => {
  await page.goto("/tenis/");
  const images = page.locator("[data-catalog-list] [data-card=image]");
  await expect(images.first()).toBeVisible();
  const heights = new Set();
  for (const img of await images.all()) {
    const frame = await box(img.locator(".."));
    expect(Math.abs(frame.height - (frame.width * 2) / 3)).toBeLessThan(2);
    expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe("contain");
    expect(inside(await box(img), frame)).toBe(true);
    heights.add(Math.round(frame.height));
  }
  expect(heights.size).toBe(1);
});

test("hero: imagem fica dentro da área de mídia em qualquer proporção", async ({ page }) => {
  await page.goto("/");
  const media = page.locator("[data-hero-media]");
  const img = media.locator('[data-field="image"]');
  await expect(img).toBeVisible();
  expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe("contain");
  const m = await box(media);
  const ratio = 10 / 16; // fotos 1600×1000
  expect(Math.abs(m.height - m.width * ratio)).toBeLessThan(2);
  const thumbs = await box(page.locator("[data-thumbs]"));
  expect(m.bottom).toBeLessThanOrEqual(thumbs.top + 1); // não invade as miniaturas
});

test("galeria: foto não é girada nem recebe sombra retangular", async ({ page }) => {
  await page.goto("/tenis/nike-air-max-90-infrared/");
  const main = page.locator("[data-gallery-main]");
  await expect(main).toBeVisible();
  const style = await main.evaluate((el) => ({ t: getComputedStyle(el).transform, f: getComputedStyle(el).filter, fit: getComputedStyle(el).objectFit }));
  expect(style).toEqual({ t: "none", f: "none", fit: "contain" });
  expect(inside(await box(main), await box(main.locator("..")))).toBe(true);
});
