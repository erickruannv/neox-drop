// Checkout (ui.md / T022): POST /api/checkout revalida no servidor; a UI mostra o resumo
// devolvido, destaca preço alterado e só abre waUrl por clique explícito no link.
// Nada é enviado automaticamente: o WhatsApp abre com a mensagem pronta.

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? "";

const MESSAGES = {
  403: "Sessão expirada. Recarregue a página e tente de novo.",
  429: "Muitas tentativas seguidas. Aguarde um instante.",
  503: "Pedido pelo WhatsApp indisponível no momento.",
};

export function initCheckout(root, { getItems, getDisplay, setPrices }) {
  const $ = (s) => root.querySelector(s);
  const button = $("[data-checkout]");
  const summary = $("[data-checkout-summary]");
  const error = $("[data-checkout-error]");
  if (!button || !summary || !error) return { invalidate() {} };
  const link = $("[data-checkout-link]");
  const hint = $("#cart-checkout-hint");
  let version = 0; // muda a cada edição do carrinho: resposta antiga não vale

  function reset() {
    summary.hidden = true;
    button.hidden = false;
    if (hint) hint.hidden = false;
    error.hidden = true;
    link.removeAttribute("href");
  }

  function fail(message, details = []) {
    error.querySelector("[data-checkout-error-message]").textContent = message;
    const list = error.querySelector("[data-checkout-error-details]");
    list.replaceChildren(...details.map((d) => Object.assign(document.createElement("li"), { textContent: d.message })));
    list.hidden = details.length === 0;
    error.hidden = false;
    error.focus();
  }

  button.addEventListener("click", async () => {
    const items = getItems();
    if (!items.length || button.getAttribute("aria-busy") === "true") return;
    const sent = ++version;
    const before = getDisplay();
    reset();
    button.setAttribute("aria-busy", "true");
    button.disabled = true;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-Token": csrf() },
        body: JSON.stringify({ items }),
      });
      const body = await res.json().catch(() => null);
      if (sent !== version) return; // carrinho mudou durante a requisição
      if (!res.ok || !body?.waUrl) {
        return fail(body?.error?.message ?? MESSAGES[res.status] ?? "Não foi possível gerar o pedido.", body?.error?.details ?? []);
      }
      show(body, before);
    } catch {
      if (sent === version) fail("Verifique sua conexão e tente de novo.");
    } finally {
      button.removeAttribute("aria-busy");
      button.disabled = false;
    }
  });

  function show({ items, totalCents, waUrl }, before) {
    const changed = items.filter((l) => {
      const old = before[l.productId]?.priceCents;
      return Number.isInteger(old) && old !== l.unitPriceCents;
    });
    setPrices(Object.fromEntries(items.map((l) => [l.productId, l.unitPriceCents])));
    $("[data-checkout-total]").textContent = brl.format(totalCents / 100);
    const notes = $("[data-checkout-changes]");
    notes.replaceChildren(
      ...changed.map((l) =>
        Object.assign(document.createElement("li"), {
          textContent: `${l.name} nº ${l.sizeBR}: de ${brl.format(before[l.productId].priceCents / 100)} para ${brl.format(l.unitPriceCents / 100)}`,
        }),
      ),
    );
    $("[data-checkout-changed]").hidden = changed.length === 0;
    link.textContent = changed.length ? "Aceitar novo valor e abrir WhatsApp" : "Abrir WhatsApp com o pedido";
    link.href = waUrl;
    summary.hidden = false;
    if (hint) hint.hidden = true;
    button.hidden = true; // um único CTA: o link (segundo clique = confirmação)
    link.focus();
  }

  return {
    invalidate() {
      version++;
      reset();
    },
  };
}
