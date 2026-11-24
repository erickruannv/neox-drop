// Pesquisas recentes (Redis, GET /api/recent/searches): ao focar qualquer busca, mostra as três
// últimas do visitante como atalhos. Sem histórico ou Redis fora do ar, nada aparece.

for (const input of document.querySelectorAll('input[type="search"][name="q"]')) attach(input);

function attach(input) {
  const wrap = input.parentElement;
  if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
  const box = document.createElement("div");
  box.dataset.searchHistory = "";
  box.hidden = true;
  box.className =
    "absolute left-0 right-0 top-full z-50 mt-2 min-w-56 rounded-2xl bg-white p-2 text-left text-ink shadow-xl ring-1 ring-ink/10";
  wrap.append(box);
  // mousedown não tira o foco do campo, então o clique no atalho chega ao link
  box.addEventListener("mousedown", (e) => e.preventDefault());

  const hide = () => (box.hidden = true);
  input.addEventListener("focus", async () => {
    if (input.value.trim()) return;
    let items = [];
    try {
      const res = await fetch("/api/recent/searches", { headers: { Accept: "application/json" } });
      if (res.ok) items = (await res.json()).items ?? [];
    } catch {
      return;
    }
    if (!items.length || document.activeElement !== input) return;
    const title = document.createElement("p");
    title.className = "px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted";
    title.textContent = "Pesquisas recentes";
    const list = document.createElement("ul");
    for (const term of items) {
      const a = document.createElement("a");
      a.href = `/tenis?q=${encodeURIComponent(term)}`;
      a.textContent = term;
      a.className = "block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-ink/5 focus:bg-ink/5";
      const li = document.createElement("li");
      li.append(a);
      list.append(li);
    }
    box.replaceChildren(title, list);
    box.hidden = false;
  });
  input.addEventListener("input", hide);
  // Tab leva o foco aos atalhos (vêm logo depois do campo); fecha só quando o foco sai de ambos
  const leave = (e) => wrap.contains(e.relatedTarget) || hide();
  input.addEventListener("blur", leave);
  box.addEventListener("focusout", leave);
  wrap.addEventListener("keydown", (e) => e.key === "Escape" && hide());
}
