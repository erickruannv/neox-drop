// Detalhe do produto: troca da imagem da galeria e stepper de quantidade (1–10).
// Adicionar ao carrinho é tratado por cart.js ([data-add-to-cart]).

const main = document.querySelector("[data-gallery-main]");
document.querySelectorAll("[data-gallery-thumb]").forEach((thumb, _, all) => {
  thumb.addEventListener("click", () => {
    main.src = thumb.dataset.galleryThumb;
    all.forEach((t) => t.setAttribute("aria-current", String(t === thumb)));
  });
});

const qty = document.querySelector("[data-qty] input");
document.querySelectorAll("[data-qty-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = Math.min(10, Math.max(1, (Number(qty.value) || 1) + Number(btn.dataset.qtyStep)));
    qty.value = String(next);
  });
});
