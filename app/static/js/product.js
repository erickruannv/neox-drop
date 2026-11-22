// Detalhe do produto: troca da imagem da galeria e stepper de quantidade (1–10).
// Adicionar ao carrinho é tratado por cart.js ([data-add-to-cart]).

import { open3d } from "./viewer3d.js";

const main = document.querySelector("[data-gallery-main]");
document.querySelectorAll("[data-gallery-thumb]").forEach((thumb, _, all) => {
  thumb.addEventListener("click", () => {
    main.src = thumb.dataset.galleryThumb;
    all.forEach((t) => t.setAttribute("aria-current", String(t === thumb)));
  });
});

// 3D sob demanda no palco "Ver em 3D" (viewer3d.js); nada carrega antes do clique.
const open = document.querySelector("[data-open-3d]");
const data = JSON.parse(document.getElementById("product-data")?.textContent ?? "{}");
const productId = document.querySelector("[data-add-to-cart]")?.dataset.productId;
if (productId) {
  fetch("/api/recent", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content ?? "" },
    body: JSON.stringify({ productId }),
  }).catch(() => {}); // Recentes indisponíveis não bloqueiam a página ou o carrinho.
}
open?.addEventListener("click", () => open3d(data, open));

const qty = document.querySelector("[data-qty] input");
document.querySelectorAll("[data-qty-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = Math.min(10, Math.max(1, (Number(qty.value) || 1) + Number(btn.dataset.qtyStep)));
    qty.value = String(next);
  });
});
