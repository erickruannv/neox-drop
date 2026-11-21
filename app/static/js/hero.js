// Hero NEOX drop: carrossel de destaques (FeaturedList) com troca conjunta de nome, preço,
// descrição, foto, cores e CTA. O 3D real abre sob demanda em "Ver em 3D" (viewer3d.js).
import { open3d } from "./viewer3d.js";
const SWAP_MS = 280;

const root = document.getElementById("hero");
const dataEl = document.getElementById("hero-data");
if (root && dataEl) init(root, JSON.parse(dataEl.textContent));

function init(root, items) {
  if (!items.length) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const amount = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fields = (name) => root.querySelectorAll(`[data-field="${name}"]`);
  const thumbs = [...root.querySelectorAll("[data-thumbs] button")];
  const dots = [...root.querySelectorAll("[data-progress] > *")];
  const media = root.querySelector("[data-hero-media]");
  const live = root.querySelector("[data-live]");
  let selected = root.dataset.selected;

  const indexOf = (id) => items.findIndex((it) => it.id === id);
  const pad = (n, len) => String(n).padStart(len, "0");

  function applyColors(item) {
    const bg = item.featured?.backgroundHex ?? "#1A1D17";
    root.style.setProperty("--hero-bg", bg);
    root.style.setProperty("--hero-accent", item.featured?.accentHex ?? "#BDF400");
    // Acima de ~0.18 o texto ink (#151515) contrasta mais que o branco.
    root.dataset.tone = luminance(bg) > 0.18 ? "light" : "dark";
  }

  function render(item, i) {
    const set = (name, fn) => fields(name).forEach(fn);
    set("index", (el) => (el.textContent = pad(i + 1, 3)));
    set("name", (el) => (el.textContent = item.name));
    set("description", (el) => (el.textContent = item.description ?? ""));
    set("price", (el) => (el.textContent = amount.format(item.priceCents / 100)));
    set("lettering", (el) => (el.textContent = item.name.split(" ")[0].toUpperCase()));
    set("counter", (el) => (el.textContent = pad(i + 1, 2)));
    set("cta", (el) => (el.href = `/tenis/${encodeURIComponent(item.slug)}`));
    set("image", (el) => {
      el.src = item.mainImageUrl;
      el.alt = item.colorName ? `${item.name}, ${item.colorName}` : item.name;
    });
    applyColors(item);
    thumbs.forEach((t) => t.setAttribute("aria-current", String(t.dataset.id === item.id)));
    dots.forEach((d, n) => d.toggleAttribute("data-active", n === i));
    live.textContent = `Destaque ${i + 1} de ${items.length}: ${item.name}, ${brl.format(item.priceCents / 100)}`;
    syncModel(item);
  }

  // Troca atômica: só publica se a seleção ainda for a mesma após carregar a mídia.
  async function select(id) {
    if (id === selected) return;
    selected = id;
    root.dataset.selected = id;
    const item = items[indexOf(id)];
    root.setAttribute("data-swapping", "");
    await Promise.all([preload(item.mainImageUrl), reduced.matches ? null : wait(SWAP_MS)]);
    if (selected !== id) return;
    render(item, indexOf(id));
    requestAnimationFrame(() => root.removeAttribute("data-swapping"));
  }

  const step = (delta) => {
    const i = (indexOf(selected) + delta + items.length) % items.length;
    select(items[i].id);
  };

  root.addEventListener("click", (e) => {
    const thumb = e.target.closest("[data-thumbs] button");
    if (thumb) return select(thumb.dataset.id);
    const btn = e.target.closest("[data-step]");
    if (btn) step(Number(btn.dataset.step));
  });
  root.addEventListener("keydown", (e) => {
    if (!e.target.closest("[data-thumbs]")) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    step(e.key === "ArrowLeft" ? -1 : 1);
    thumbs[indexOf(selected)]?.focus();
  });

  // ---- Foto primeiro; 3D só por clique em "Ver em 3D" (palco em viewer3d.js) ----
  const open = root.querySelector("[data-open-3d]");
  const credit = root.querySelector('[data-field="credit"]');

  function syncModel(item) {
    const a = item.attributes ?? {};
    credit.textContent = a.imageCredit ?? "";
    if (a.imageCreditUrl) credit.href = a.imageCreditUrl;
    else credit.removeAttribute("href");
    open.hidden = !item.model3dUrl;
    open.setAttribute("aria-label", `Ver ${item.name} em 3D`);
  }

  open.addEventListener("click", () => open3d(items[indexOf(selected)], open));
  applyColors(items[indexOf(selected)] ?? items[0]);
  syncModel(items[indexOf(selected)] ?? items[0]);
}

function preload(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Luminância relativa WCAG de #RRGGBB, para escolher texto claro/escuro sobre backgroundHex.
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
