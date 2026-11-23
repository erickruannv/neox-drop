import { defineConfig, devices } from "@playwright/test";

const fastapiURL = process.env.NEOX_FASTAPI_URL;

// 3D real (Sketchfab, rede + GPU): `pnpm test:3d`. Fora do `test:ui`, que roda offline.
// channel "chromium" = headless novo com GPU; o headless antigo usa SwiftShader e o
// Sketchfab recusa ("No Hardware Support for Webgl").
export default defineConfig({
  testDir: "tests/e2e/live",
  timeout: 180_000,
  expect: { timeout: 90_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: fastapiURL ?? "http://127.0.0.1:4180", channel: "chromium" },
  webServer: fastapiURL ? undefined : {
    command: "pnpm demo",
    url: "http://127.0.0.1:4180/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  // DPR 1: no headless, DPR 2 emulado faz o iframe do Sketchfab enxergar metade da caixa
  // (innerWidth 359 numa caixa de 717) e desenha o modelo num quadrante. Num Chromium com
  // janela no Retina (DPR 2 nativo) o iframe mede a caixa inteira (578 × 577), conferido em
  // 2026-11-23. Mobile continua emulação; não comprova aparência/desempenho em aparelho físico.
  projects: [
    { name: "desktop", use: { channel: "chromium", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: "mobile-360", use: { ...devices["Pixel 7"], channel: "chromium", viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 } },
  ],
});
