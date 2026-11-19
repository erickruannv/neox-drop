// Captura evidências visuais da home renderizada (pnpm preview + servidor em 4173).
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const out = process.argv[2] ?? "docs/evidencias/visual";
const browser = await chromium.launch();
for (const [name, width, height] of [["1440", 1440, 900], ["360", 360, 780]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width === 360 ? 2 : 1 });
  await page.goto(`${base}/`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/home-${name}-hero.png` });
  await page.screenshot({ path: `${out}/home-${name}-full.png`, fullPage: true });
  await page.locator("[data-thumbs] button").nth(1).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/home-${name}-slide2.png` });
  await page.close();
}
await browser.close();
console.log(`screenshots em ${out}`);
