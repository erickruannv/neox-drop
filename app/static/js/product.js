// Detalhe do produto: troca da imagem da galeria e stepper de quantidade (1–10).
// Adicionar ao carrinho é tratado por cart.js ([data-add-to-cart]).

import { createSketchfabViewer, sketchfabUid } from "./sketchfab.js";

const main = document.querySelector("[data-gallery-main]");
const toggle3d = document.querySelector("[data-view-3d]");
let viewer = null;

function exit3d() {
  if (toggle3d?.getAttribute("aria-pressed") !== "true") return;
  viewer.hide();
  main.hidden = false;
  toggle3d.setAttribute("aria-pressed", "false");
  toggle3d.querySelector("[data-view-3d-label]").textContent = "Ver em 3D";
}

document.querySelectorAll("[data-gallery-thumb]").forEach((thumb, _, all) => {
  thumb.addEventListener("click", () => {
    exit3d();
    main.src = thumb.dataset.galleryThumb;
    all.forEach((t) => t.setAttribute("aria-current", String(t === thumb)));
  });
});

// 3D sob demanda (não pesa o carregamento da página). Giro só em Y, igual ao hero.
// shortcut: só embed Sketchfab aqui; GLB próprio usa o Model Viewer apenas no hero até existir um.
const uid = sketchfabUid(toggle3d?.dataset.model);
if (toggle3d && !uid) toggle3d.hidden = true;
toggle3d?.addEventListener("click", () => {
  if (toggle3d.getAttribute("aria-pressed") === "true") return exit3d();
  const status = document.querySelector("[data-gallery-status]");
  const label = toggle3d.querySelector("[data-view-3d-label]");
  viewer ??= createSketchfabViewer(main.parentElement, {
    reduced: matchMedia("(prefers-reduced-motion: reduce)"),
    onState(state) {
      main.hidden = state === "ready";
      if (state === "loading") label.textContent = "Carregando 3D…";
      if (state === "ready") label.textContent = "Ver em 3D";
      if (state === "error") exit3d();
      status.textContent = { ready: "Modelo 3D carregado. Arraste na horizontal ou use as setas para girar.", error: "Modelo 3D indisponível agora." }[state] ?? "";
    },
  });
  toggle3d.setAttribute("aria-pressed", "true");
  viewer.show(uid, `Modelo 3D de ${document.querySelector("#produto-nome").textContent}`);
});

const qty = document.querySelector("[data-qty] input");
document.querySelectorAll("[data-qty-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = Math.min(10, Math.max(1, (Number(qty.value) || 1) + Number(btn.dataset.qtyStep)));
    qty.value = String(next);
  });
});
