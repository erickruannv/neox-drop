// Catálogo: aplica filtros via GET /api/products (contrato) sem recarregar a página.
// Sem JS o form GET /tenis continua funcionando. Filtro vazio é omitido; page volta a 1.

const form = document.querySelector("[data-catalog-form]");
if (form) init(form);

function init(form) {
  const $ = (s) => document.querySelector(s);
  const list = $("[data-catalog-list]");
  const results = $("[data-catalog-results]");
  const empty = $("[data-catalog-empty]");
  const error = $("[data-catalog-error]");
  const status = $("[data-catalog-status]");
  const pager = $("[data-catalog-pager]");
  const template = $("#product-card-template");
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  let lastParams = new URLSearchParams(location.search);
  let requestSeq = 0;

  // Celular: painel de filtros começa recolhido para mostrar resultados primeiro.
  if (!matchMedia("(min-width: 1024px)").matches) $("[data-filters-panel]")?.removeAttribute("open");

  function paramsFromForm(page) {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      const v = String(value).trim();
      if (v && !(key === "sort" && v === "recent")) params.set(key, v);
    }
    if (page > 1) params.set("page", String(page));
    return params;
  }

  async function load(params) {
    const seq = ++requestSeq;
    lastParams = params;
    results.setAttribute("aria-busy", "true");
    list.classList.add("opacity-50");
    error.hidden = true;
    try {
      const res = await fetch(`/api/products?${params}`, { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => null);
      if (seq !== requestSeq) return; // resposta antiga: descarta
      if (!res.ok || !body?.items) throw new Error(body?.error?.message ?? "");
      render(body);
      history.replaceState(null, "", `/tenis${params.size ? `?${params}` : ""}`);
    } catch (err) {
      if (seq !== requestSeq) return;
      error.querySelector("[data-catalog-error-message]").textContent = err.message || "Verifique sua conexão e tente de novo.";
      error.hidden = false;
      status.textContent = "Erro ao carregar o catálogo";
    } finally {
      if (seq === requestSeq) {
        results.setAttribute("aria-busy", "false");
        list.classList.remove("opacity-50");
      }
    }
  }

  function render({ items, page, limit, total }) {
    list.replaceChildren(...items.map(card));
    empty.hidden = items.length > 0;
    status.textContent = `${total} ${total === 1 ? "tênis encontrado" : "tênis encontrados"}`;
    // Faixa Marcas/Coleções acompanha os filtros aplicados sem recarregar.
    for (const chip of document.querySelectorAll("[data-chip]")) {
      const [key, value] = chip.dataset.chip.split("=");
      chip.toggleAttribute("aria-current", (lastParams.get(key) ?? "").toLowerCase() === value.toLowerCase());
      if (chip.hasAttribute("aria-current")) chip.setAttribute("aria-current", "true");
    }
    const pages = Math.max(1, Math.ceil(total / limit));
    pager.hidden = pages <= 1;
    pager.querySelector("[data-page-label]").textContent = `Página ${page} de ${pages}`;
    for (const link of pager.querySelectorAll("[data-page]")) {
      const target = page + Number(link.dataset.dir);
      const enabled = target >= 1 && target <= pages;
      link.dataset.page = String(target);
      link.toggleAttribute("aria-disabled", !enabled);
      if (enabled) {
        const p = new URLSearchParams(lastParams);
        p.set("page", String(target));
        link.href = `/tenis?${p}`;
      } else link.removeAttribute("href");
    }
  }

  function card(p) {
    const li = template.content.firstElementChild.cloneNode(true);
    const set = (name, fn) => fn(li.querySelector(`[data-card="${name}"]`));
    set("category", (el) => (el.textContent = p.category));
    set("image", (el) => (el.src = p.mainImageUrl));
    set("brand", (el) => (el.textContent = p.brand));
    set("link", (el) => {
      el.textContent = p.name;
      el.href = `/tenis/${encodeURIComponent(p.slug)}`;
    });
    set("price", (el) => (el.textContent = brl.format(p.priceCents / 100)));
    return li;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    load(paramsFromForm(1));
  });
  form.addEventListener("change", (e) => {
    if (e.target.matches("select")) load(paramsFromForm(1));
  });
  pager.addEventListener("click", (e) => {
    const link = e.target.closest("[data-page]");
    if (!link || link.hasAttribute("aria-disabled")) return;
    e.preventDefault();
    const p = new URLSearchParams(lastParams);
    p.set("page", link.dataset.page);
    load(p).then(() => results.scrollIntoView({ block: "start" }));
  });
  document.querySelector("[data-catalog-retry]").addEventListener("click", () => load(lastParams));
}
