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
