// Menu do celular (<details>): fecha ao escolher um link (inclusive âncora na mesma página,
// ex.: "Coleções" na home), com Esc e ao tocar fora; devolve o foco ao botão no Esc.
const menu = document.querySelector("[data-nav-menu]");
if (menu) {
  const close = (focus) => {
    if (!menu.open) return;
    menu.open = false;
    if (focus) menu.querySelector("summary").focus();
  };
  menu.addEventListener("click", (e) => e.target.closest("a") && close(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && close(true));
  document.addEventListener("click", (e) => !menu.contains(e.target) && close(false));
}

// Imagem de produto que falha (404, origem fora do ar): esconde o ícone quebrado e mostra um
// aviso discreto no lugar ([data-img-missing], ver input.css). Captura: "error" não borbulha.
function missing(img) {
  if (!img.matches("main img") || img.closest("[data-img-missing]")) return;
  const box = img.parentElement;
  if (getComputedStyle(box).position === "static") box.style.position = "relative";
  box.dataset.imgMissing = "";
  img.hidden = true;
}
document.addEventListener("error", (e) => e.target instanceof HTMLImageElement && missing(e.target), true);
document.addEventListener("load", (e) => e.target instanceof HTMLImageElement && unmiss(e.target), true);
function unmiss(img) {
  // a mesma <img> é reaproveitada no hero/galeria ao trocar de produto
  if (img.parentElement?.hasAttribute("data-img-missing")) {
    delete img.parentElement.dataset.imgMissing;
    img.hidden = false;
  }
}
for (const img of document.querySelectorAll("main img[src]")) if (img.complete && !img.naturalWidth && img.getAttribute("src")) missing(img);
