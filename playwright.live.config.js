import { defineConfig, devices } from "@playwright/test";

// 3D real (Sketchfab, rede + GPU): `pnpm test:3d`. Fora do `test:ui`, que roda offline.
// channel "chromium" = headless novo com GPU; o headless antigo usa SwiftShader e o
// Sketchfab recusa ("No Hardware Support for Webgl").
export default defineConfig({
  testDir: "tests/e2e/live",
  timeout: 180_000,
  expect: { timeout: 90_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4180", channel: "chromium" },
  webServer: {
    command: "pnpm demo",
    url: "http://127.0.0.1:4180/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  // UA real da máquina no desktop: o Sketchfab escolhe o formato de textura pela UA, e uma UA
  // falsa (ex.: Windows) gera texturas corrompidas na GPU do Mac. No celular emulado a UA móvel
  // e o DPR > 1 também distorcem o render (canto do canvas, granulado): o projeto mobile prova
  // gesto/toque e troca de modelo; a aparência no celular precisa de aparelho real.
  projects: [
    { name: "desktop", use: { channel: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile-360", use: { ...devices["Pixel 7"], channel: "chromium", viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 } },
  ],
});
