// Detalhe do produto: troca da imagem da galeria e stepper de quantidade (1–10).
// Adicionar ao carrinho é tratado por cart.js ([data-add-to-cart]).

import { inline3d } from "./viewer3d.js";

const main = document.querySelector("[data-gallery-main]");
const data = JSON.parse(document.getElementById("product-data")?.textContent ?? "{}");
// Foto → 3D no lugar da foto principal (viewer3d.js); nada do 3D carrega antes da interação.
const stage = document.querySelector("[data-3d-stage]");
const viewer = stage && inline3d(stage, { zoom: 0.85 });
viewer?.set(data);
document.querySelectorAll("[data-gallery-thumb]").forEach((thumb, _, all) => {
  thumb.addEventListener("click", () => {
    viewer?.reset();
    main.src = thumb.dataset.galleryThumb;
    all.forEach((t) => t.setAttribute("aria-current", String(t === thumb)));
  });
});

const productId = document.querySelector("[data-add-to-cart]")?.dataset.productId;
if (productId) {
  fetch("/api/recent", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content ?? "" },
    body: JSON.stringify({ productId }),
  }).catch(() => {}); // Recentes indisponíveis não bloqueiam a página ou o carrinho.
}

const qty = document.querySelector("[data-qty] input");
document.querySelectorAll("[data-qty-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = Math.min(10, Math.max(1, (Number(qty.value) || 1) + Number(btn.dataset.qtyStep)));
    qty.value = String(next);
  });
});
