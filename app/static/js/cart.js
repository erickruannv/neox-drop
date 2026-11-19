// Carrinho local (ui.md): persiste só {productId,sizeBR,quantity} em localStorage "neox.cart.v1".
// Nome/foto/preço para exibição ficam em sessionStorage e não são autoritativos:
// o checkout (T021/T022) revalida tudo no servidor.

export const CART_KEY = "neox.cart.v1";
const DISPLAY_KEY = "neox.cart.display.v1";
const MAX_QTY = 10; // por produto+tamanho (contrato)
const MAX_LINES = 50;
const ID = /^[0-9a-fA-F]{24}$/;

const isItem = (i) =>
  i !== null && typeof i === "object" && typeof i.productId === "string" && ID.test(i.productId) &&
  Number.isInteger(i.sizeBR) && i.sizeBR >= 15 && i.sizeBR <= 60 &&
  Number.isInteger(i.quantity) && i.quantity >= 1;

// Descarta malformados, agrupa produto+tamanho, limita quantidade e linhas, remove campos extras.
export function normalize(raw) {
  const groups = new Map();
  for (const i of Array.isArray(raw) ? raw : []) {
    if (!isItem(i)) continue;
    const key = `${i.productId}:${i.sizeBR}`;
    const prev = groups.get(key)?.quantity ?? 0;
    groups.set(key, { productId: i.productId, sizeBR: i.sizeBR, quantity: Math.min(MAX_QTY, prev + i.quantity) });
  }
  return [...groups.values()].slice(0, MAX_LINES);
}

function readJson(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

const readCart = () => normalize(readJson(localStorage, CART_KEY, []));
const readDisplay = () => readJson(sessionStorage, DISPLAY_KEY, {});
function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(normalize(items)));
  } catch {
    /* storage bloqueado: carrinho vale só para esta página */
  }
}

const drawer = document.getElementById("cart-drawer");
if (drawer) initDrawer(drawer);

function initDrawer(drawer) {
  const $ = (s) => drawer.querySelector(s);
  const list = $("[data-cart-list]");
  const template = document.getElementById("cart-item-template");
  const live = $("[data-cart-live]");
  const button = document.getElementById("cart-button");
  const badge = button?.querySelector("[data-cart-count]");
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  let memory = readCart();
  writeCart(memory); // regrava já sem itens malformados

  const save = (items) => {
    memory = normalize(items);
    writeCart(memory);
    render();
  };

  function render() {
    const display = readDisplay();
    const count = memory.reduce((n, i) => n + i.quantity, 0);
    if (button) {
      button.setAttribute("aria-label", count ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho");
      badge.hidden = count === 0;
      badge.textContent = String(count);
    }
    let subtotal = 0;
    let missing = 0;
    list.replaceChildren(
      ...memory.map((item) => {
        const info = display[item.productId];
        const li = template.content.firstElementChild.cloneNode(true);
        const field = (n) => li.querySelector(`[data-item="${n}"]`);
        const name = info?.name ?? "Produto";
        field("name").textContent = name;
        if (info?.slug) field("name").href = `/tenis/${encodeURIComponent(info.slug)}`;
        else field("name").removeAttribute("href");
        field("image").src = info?.image ?? "";
        field("image").hidden = !info?.image;
        field("size").textContent = String(item.sizeBR);
        field("qty").textContent = String(item.quantity);
        if (Number.isInteger(info?.priceCents)) {
          subtotal += info.priceCents * item.quantity;
          field("total").textContent = brl.format((info.priceCents * item.quantity) / 100);
        } else {
          missing++;
          field("total").textContent = "—";
        }
        const label = `${name}, numeração ${item.sizeBR}`;
        const [minus, plus] = li.querySelectorAll("[data-item-step]");
        minus.setAttribute("aria-label", `Diminuir quantidade de ${label}`);
        plus.setAttribute("aria-label", `Aumentar quantidade de ${label}`);
        plus.disabled = item.quantity >= MAX_QTY;
        li.querySelector("[data-item-remove]").setAttribute("aria-label", `Remover ${label}`);
        li.dataset.key = `${item.productId}:${item.sizeBR}`;
        return li;
      }),
    );
    const empty = memory.length === 0;
    $("[data-cart-empty]").hidden = !empty;
    list.hidden = empty;
    $("[data-cart-footer]").hidden = empty;
    $("[data-cart-subtotal]").textContent = brl.format(subtotal / 100);
    $("[data-cart-note]").textContent = missing
      ? "Subtotal parcial: abra os produtos sem preço para atualizar. Valores confirmados ao gerar o pedido."
      : "Preço e disponibilidade são confirmados ao gerar o pedido.";
  }

  function update(key, fn) {
    const items = memory.flatMap((i) => (`${i.productId}:${i.sizeBR}` === key ? fn(i) : [i]));
    save(items);
  }

  list.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-key]");
    if (!li) return;
    const key = li.dataset.key;
    const step = e.target.closest("[data-item-step]");
    if (step) {
      const delta = Number(step.dataset.itemStep);
      update(key, (i) => (i.quantity + delta < 1 ? [] : [{ ...i, quantity: Math.min(MAX_QTY, i.quantity + delta) }]));
      const after = memory.find((i) => `${i.productId}:${i.sizeBR}` === key);
      live.textContent = after ? `Quantidade: ${after.quantity}` : "Item removido";
      list.querySelector(`li[data-key="${key}"] [data-item-step="${delta}"]`)?.focus();
    } else if (e.target.closest("[data-item-remove]")) {
      update(key, () => []);
      live.textContent = "Item removido do carrinho";
      (list.querySelector("[data-item-remove]") ?? $("[data-cart-close]")).focus();
    }
  });

  button?.addEventListener("click", () => {
    render();
    drawer.showModal();
  });
  $("[data-cart-close]").addEventListener("click", () => drawer.close());
  drawer.addEventListener("click", (e) => e.target === drawer && drawer.close()); // clique no fundo

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-add-to-cart]");
    if (!form) return;
    e.preventDefault();
    const data = new FormData(form);
    const sizeBR = Number(data.get("sizeBR"));
    const quantity = Math.min(MAX_QTY, Math.max(1, Number(data.get("quantity")) || 1));
    const { productId, slug, name, priceCents, image } = form.dataset;
    try {
      const display = readDisplay();
      display[productId] = { slug, name, image, priceCents: Number(priceCents) };
      sessionStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
    } catch {
      /* sem sessionStorage: item aparece sem preço */
    }
    save([...memory, { productId, sizeBR, quantity }]);
    drawer.showModal();
    live.textContent = `${name}, numeração ${sizeBR}, adicionado ao carrinho`;
  });

  addEventListener("storage", (e) => {
    if (e.key === CART_KEY) {
      memory = readCart();
      render();
    }
  });
  render();
}
