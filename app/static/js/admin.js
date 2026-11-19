// Painel admin: login/logout e cadastro de produto pelos contratos /api/admin/*.
// Sessão em cookies HttpOnly; o JS só envia o X-CSRF-Token da meta tag. Nenhum token/senha é guardado.

const URL_RE = /^(?:\/static\/[^\s?#]+|https:\/\/[^\s]+)$/; // mesmo padrão do OpenAPI
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? "";

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-Token": csrf() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

// "1.299,90" | "899,9" | "899" -> centavos inteiros, sem ponto flutuante. null se inválido.
export function parsePrice(text) {
  const t = String(text).trim();
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(t)) return null;
  const [reais, cents = ""] = t.replaceAll(".", "").split(",");
  const value = Number(reais) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(value) ? value : null;
}

// ---------- Login ----------
const loginForm = document.querySelector("[data-admin-login]");
if (loginForm) {
  const error = loginForm.querySelector("[data-login-error]");
  const submit = loginForm.querySelector("[data-login-submit]");
  const show = (msg) => {
    error.textContent = msg;
    error.hidden = false;
  };
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.hidden = true;
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    if (!email || !password) return show("Informe e-mail e senha.");
    submit.disabled = true;
    try {
      const res = await api("/api/admin/auth/login", { email, password });
      if (res.ok) return location.assign("/admin/produtos"); // HTML novo traz CSRF rotacionado
      loginForm.password.value = "";
      show(
        res.status === 429 ? "Muitas tentativas. Aguarde um pouco e tente novamente."
        : res.status === 403 ? "Sessão expirada. Recarregue a página e tente novamente."
        : res.status === 401 || res.status === 422 ? "E-mail ou senha inválidos."
        : "Não foi possível entrar agora. Tente novamente em instantes.",
      );
    } catch {
      show("Sem conexão com o servidor. Tente novamente.");
    } finally {
      submit.disabled = false;
    }
  });
}

// ---------- Logout ----------
document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
  await api("/api/admin/auth/logout").catch(() => null);
  location.assign("/admin/login");
});

// ---------- Cadastro de produto ----------
const productForm = document.querySelector("[data-admin-product-form]");
if (productForm) initProductForm(productForm);

function initProductForm(form) {
  const rows = form.querySelector("[data-size-rows]");
  const rowTemplate = document.getElementById("size-row-template");
  const errors = document.querySelector("[data-form-errors]");
  const status = document.querySelector("[data-admin-status]");
  const submit = form.querySelector("[data-product-submit]");
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const addRow = () => rows.append(rowTemplate.content.firstElementChild.cloneNode(true));
  addRow();
  form.querySelector("[data-size-add]").addEventListener("click", () => {
    addRow();
    rows.lastElementChild.querySelector("input").focus();
  });
  rows.addEventListener("click", (e) => {
    if (!e.target.closest("[data-size-remove]") || rows.children.length === 1) return;
    e.target.closest("li").remove();
    rows.querySelector("input")?.focus();
  });

  function collect() {
    const problems = [];
    const v = (name) => form.elements[name].value.trim();
    const need = (name, label) => v(name) || problems.push({ input: form.elements[name], message: `${label}: obrigatório.` });
    need("name", "Nome");
    need("brand", "Marca");
    need("sku", "SKU");
    need("category", "Categoria");
    need("colorName", "Cor");
    need("description", "Descrição");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v("slug")))
      problems.push({ input: form.elements.slug, message: "Slug: use minúsculas, números e hífens." });
    const priceCents = parsePrice(v("price"));
    if (priceCents === null) problems.push({ input: form.elements.price, message: "Preço: use o formato 899,90." });
    if (!URL_RE.test(v("mainImageUrl")))
      problems.push({ input: form.elements.mainImageUrl, message: "Imagem principal: caminho /static/… ou URL https." });
    const gallery = v("galleryUrls").split(/\s*\n\s*/).filter(Boolean);
    if (gallery.some((u) => !URL_RE.test(u)))
      problems.push({ input: form.elements.galleryUrls, message: "Galeria: cada linha deve ser /static/… ou https." });
    const model = v("model3dUrl");
    if (model && !URL_RE.test(model))
      problems.push({ input: form.elements.model3dUrl, message: "Modelo 3D: caminho /static/… ou URL https." });

    const sizes = [];
    const seen = new Set();
    for (const li of rows.children) {
      const [sizeInput, stockInput] = li.querySelectorAll("input");
      const sizeBR = Number(sizeInput.value);
      const stock = Number(stockInput.value);
      if (!Number.isInteger(sizeBR) || sizeBR < 15 || sizeBR > 60 || seen.has(sizeBR))
        problems.push({ input: sizeInput, message: "Numeração: inteiro de 15 a 60, sem repetir." });
      if (stockInput.value === "" || !Number.isInteger(stock) || stock < 0)
        problems.push({ input: stockInput, message: "Estoque: inteiro maior ou igual a zero." });
      seen.add(sizeBR);
      sizes.push({ sizeBR, stock });
    }

    const payload = {
      sku: v("sku"), slug: v("slug"), name: v("name"), brand: v("brand"), category: v("category"),
      priceCents, mainImageUrl: v("mainImageUrl"), description: v("description"), currency: "BRL",
      galleryUrls: gallery.length ? gallery : [v("mainImageUrl")], colorName: v("colorName"),
      active: form.elements.active.checked, sizes,
    };
    if (model) payload.model3dUrl = model;
    if (form.elements.featuredEnabled.checked) {
      const order = Number(v("featuredOrder"));
      if (!Number.isInteger(order) || order < 1)
        problems.push({ input: form.elements.featuredOrder, message: "Ordem do destaque: inteiro a partir de 1." });
      payload.featured = {
        enabled: true, order,
        backgroundHex: v("backgroundHex").toUpperCase(), accentHex: v("accentHex").toUpperCase(),
      };
    }
    return { payload, problems };
  }

  function showErrors(title, problems) {
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    errors.querySelector("[data-form-errors-title]").textContent = title;
    errors.querySelector("[data-form-errors-list]").replaceChildren(
      ...problems.map((p) => {
        p.input?.setAttribute("aria-invalid", "true");
        const li = document.createElement("li");
        li.textContent = p.message;
        return li;
      }),
    );
    errors.hidden = false;
    errors.focus();
  }

  // details[].field do servidor -> campo do formulário
  const inputFor = (field = "") => {
    const head = field.split(/[.[]/)[0];
    const map = { priceCents: "price", sizes: null, featured: "featuredOrder" };
    if (head === "sizes") return rows.querySelector("input");
    return form.elements[map[head] ?? head] ?? null;
  };

  function addRowToTable(p) {
    const tbody = document.querySelector("[data-admin-rows]");
    tbody.querySelector("td[colspan]")?.closest("tr").remove();
    const tr = document.createElement("tr");
    const td = (cls, ...children) => {
      const cell = document.createElement("td");
      cell.className = `px-3 py-3 ${cls}`;
      cell.append(...children);
      return cell;
    };
    const img = Object.assign(document.createElement("img"), { src: p.mainImageUrl, alt: "", width: 64, height: 31, className: "h-10 w-16 rounded-lg bg-paper object-contain" });
    const name = Object.assign(document.createElement("p"), { className: "font-bold", textContent: p.name });
    const meta = Object.assign(document.createElement("p"), { className: "text-xs text-muted", textContent: `${p.sku} · ${p.brand}` });
    const info = document.createElement("div");
    info.append(name, meta);
    const wrap = Object.assign(document.createElement("div"), { className: "flex items-center gap-3" });
    wrap.append(img, info);
    const badge = Object.assign(document.createElement("span"), {
      className: `rounded-full px-2.5 py-1 text-xs font-bold text-ink ${p.active ? "bg-lime" : "bg-sand"}`,
      textContent: p.active ? "Ativo" : "Inativo",
    });
    tr.append(
      td("", wrap),
      td("", p.category),
      td("text-right font-bold tabular-nums", brl.format(p.priceCents / 100)),
      td("text-right tabular-nums", String(p.sizes.reduce((n, s) => n + s.stock, 0))),
      td("", badge),
    );
    tbody.prepend(tr);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.hidden = true;
    const { payload, problems } = collect();
    if (problems.length) return showErrors("Revise os campos destacados:", problems);
    errors.hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    submit.disabled = true;
    try {
      const res = await api("/api/admin/products", payload);
      if (res.status === 201 && res.data) {
        addRowToTable(res.data);
        form.reset();
        rows.replaceChildren();
        addRow();
        status.textContent = `Produto “${res.data.name}” cadastrado.`;
        status.hidden = false;
        return;
      }
      if (res.status === 401) return location.assign("/admin/login");
      const details = res.data?.error?.details ?? [];
      if (res.status === 409)
        return showErrors("Já existe um produto com este SKU ou slug.", [
          { input: form.elements.sku, message: "SKU: confira se já está em uso." },
          { input: form.elements.slug, message: "Slug: confira se já está em uso." },
        ]);
      if (res.status === 422 || res.status === 400)
        return showErrors(res.data?.error?.message ?? "Revise os campos informados.",
          details.map((d) => ({ input: inputFor(d.field), message: d.message ?? "Valor inválido." })));
      showErrors(
        res.status === 403 ? "Sessão expirada ou sem permissão. Recarregue a página."
        : res.status === 429 ? "Muitas requisições. Aguarde e tente novamente."
        : "Não foi possível salvar agora. Tente novamente.",
        [],
      );
    } catch {
      showErrors("Sem conexão com o servidor. Tente novamente.", []);
    } finally {
      submit.disabled = false;
    }
  });
}
