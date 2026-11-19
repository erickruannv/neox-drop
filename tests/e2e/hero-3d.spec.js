import { test, expect } from "@playwright/test";

// GLB mínimo (caixa) gerado em memória só para exercitar o Model Viewer no teste.
// Não é ativo do produto nem substitui o GLB licenciado (T024).
function boxGlb() {
  const p = [-1, -0.5, -0.4, 1, -0.5, -0.4, 1, 0.5, -0.4, -1, 0.5, -0.4, -1, -0.5, 0.4, 1, -0.5, 0.4, 1, 0.5, 0.4, -1, 0.5, 0.4];
  const idx = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5];
  const pos = Buffer.from(new Float32Array(p).buffer);
  const ind = Buffer.from(new Uint16Array(idx).buffer);
  const bin = Buffer.concat([pos, ind]);
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.length, target: 34962 },
      { buffer: 0, byteOffset: pos.length, byteLength: ind.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [-1, -0.5, -0.4], max: [1, 0.5, 0.4] },
      { bufferView: 1, componentType: 5123, count: idx.length, type: "SCALAR" },
    ],
  };
  const pad = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)]);
  const jsonBuf = pad(Buffer.from(JSON.stringify(json)), 0x20);
  const binBuf = pad(bin, 0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
  const chunk = (buf, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(buf.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, buf]);
  };
  return Buffer.concat([header, chunk(jsonBuf, 0x4e4f534a), chunk(binBuf, 0x004e4942)]);
}

// Espera a interpolação da câmera terminar (duas leituras iguais seguidas).
async function settled(mv, page) {
  let prev = await orbit(mv);
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(150);
    const cur = await orbit(mv);
    if (Math.abs(cur.theta - prev.theta) < 1e-4 && Math.abs(cur.phi - prev.phi) < 1e-4) return cur;
    prev = cur;
  }
  return prev;
}

const orbit = (mv) => mv.evaluate((el) => { const o = el.getCameraOrbit(); return { theta: o.theta, phi: o.phi, radius: o.radius }; });

test("GLB carregado: arraste horizontal gira em Y; vertical e roda não inclinam nem dão zoom", async ({ page, isMobile }) => {
  test.skip(isMobile, "arraste por mouse; toque coberto por touch-action=pan-y");
  await page.emulateMedia({ reducedMotion: "reduce" }); // sem auto-rotate: mede só o arraste
  await page.route("**/*.glb", (route) => route.fulfill({ body: boxGlb(), contentType: "model/gltf-binary" }));
  await page.goto("/model/");
  const mv = page.locator("model-viewer");
  await expect.poll(() => mv.evaluate((el) => el.loaded), { timeout: 15_000 }).toBe(true);
  await expect(page.locator('#hero img[data-field="image"]')).toBeHidden();
  await expect(page.locator("[data-model-status]")).toContainText("Arraste na horizontal");

  const box = await mv.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const start = await orbit(mv);

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 220, cy, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await orbit(mv)).theta - start.theta)).toBeGreaterThan(0.3);
  const afterH = await settled(mv, page);
  expect(afterH.phi).toBeCloseTo(start.phi, 3);

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 200, { steps: 12 });
  await page.mouse.up();
  const afterV = await settled(mv, page);
  expect(afterV.phi).toBeCloseTo(start.phi, 3);
  expect(afterV.theta).toBeCloseTo(afterH.theta, 2);

  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -600);
  expect((await settled(mv, page)).radius).toBeCloseTo(afterV.radius, 3);
});
