import { defineConfig, devices } from "@playwright/test";

const fastapiURL = process.env.NEOX_FASTAPI_URL;

// Sem URL, testa fixtures; com URL, testa o FastAPI já iniciado, sem interceptar a API.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  testMatch: fastapiURL ? "**/fastapi.spec.js" : undefined,
  testIgnore: fastapiURL ? [] : ["**/fastapi.spec.js"],
  use: { baseURL: fastapiURL ?? "http://127.0.0.1:4173" },
  webServer: fastapiURL ? undefined : {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory tests/e2e/.preview",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    stderr: "ignore",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile-360", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } },
  ],
});
