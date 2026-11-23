import { test, expect } from "@playwright/test";

// Aceite do pedido de 2026-11-23 contra a vitrine FastAPI real (somente leitura, sem fixtures):
// no mínimo 8 tênis ativos com foto, AM95 Dark Army fora dos destaques, AM90 primeiro e o player
// do Sketchfab só no bloco "Demonstração 3D". Opt-in: NEOX_FASTAPI_URL=http://127.0.0.1:8000.
test.skip(!process.env.NEOX_FASTAPI_URL, "Requer vitrine FastAPI explícita");

test("catálogo real: 8+ ativos, AM95 fora dos destaques e 3D separado", async ({ page }, info) => {
  const products = (await (await page.request.get("/api/products?limit=24")).json()).items;
  const featured = (await (await page.request.get("/api/featured")).json()).items;
  expect(products.length).toBeGreaterThanOrEqual(8);
  expect(featured[0].slug).toBe("nike-air-max-90-infrared");
  expect(featured.map((p) => p.slug)).not.toContain("nike-air-max-95-dark-army");

  await page.goto("/");
  await expect(page.locator("#hero h1")).toHaveText(featured[0].name);
  await expect(page.locator("#hero [data-3d-toggle]")).toBeHidden();
  await page.screenshot({ path: info.outputPath("home.png") });
  await page.goto("/tenis");
  await expect(page.locator("[data-catalog-list] [data-card=image]")).toHaveCount(products.length);
  await page.screenshot({ path: info.outputPath("catalogo.png"), fullPage: true });

  await page.goto("/tenis/nike-air-max-95-dark-army");
  await expect(page.getByRole("heading", { name: "Demonstração 3D" })).toBeVisible();
  await expect(page.locator("[data-gallery-main] ~ [data-3d-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-sketchfab-frame]")).toHaveCount(0);
});
