import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mock, errorBody, expectSchemaKeys } from "./helpers/api.js";

const axeSerious = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => v.id);
};

test.describe("login administrativo", () => {
  test("campos vazios: mensagem local, nenhuma requisição", async ({ page }) => {
    let called = false;
    await page.route("**/api/admin/auth/login", (r) => ((called = true), r.fulfill({ status: 500 })));
    await page.goto("/admin/login/");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toHaveText("Informe e-mail e senha.");
    expect(called).toBe(false);
  });

  test("401: erro genérico, senha limpa, CSRF enviado, nada salvo no storage", async ({ page }) => {
    let request;
    await page.route("**/api/admin/auth/login", (r) => {
      request = r.request();
      r.fulfill({ status: 401, json: errorBody("AUTHENTICATION_FAILED", "Credenciais inválidas.") });
    });
    await page.goto("/admin/login/");
    await page.getByLabel("E-mail").fill("admin@example.invalid");
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toHaveText("E-mail ou senha inválidos.");
    await expect(page.getByLabel("Senha")).toHaveValue("");
    expect(request.headers()["x-csrf-token"]).toBe("preview-csrf");
    expect(request.postDataJSON()).toEqual({ email: "admin@example.invalid", password: "senha-errada" });
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  });

  test("429 e 200 → painel", async ({ page }) => {
    let status = 429;
    await page.route("**/api/admin/auth/login", (r) =>
      status === 429
        ? r.fulfill({ status, json: errorBody("RATE_LIMITED", "Aguarde.") })
        : r.fulfill({ status: 200, json: { userId: "00000000-0000-4000-8000-000000000001", displayName: "Admin", role: "admin", isActive: true } }),
    );
    await page.goto("/admin/login/");
    await page.getByLabel("E-mail").fill("admin@example.invalid");
    await page.getByLabel("Senha").fill("x");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toContainText("Muitas tentativas");
    status = 200;
    await page.getByLabel("Senha").fill("x");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin\/produtos\/?$/);
  });

  test("login: sem violações axe sérias", async ({ page }) => {
    await page.goto("/admin/login/");
    expect(await axeSerious(page)).toEqual([]);
  });
});

test.describe("produtos (admin)", () => {
  async function fillValid(page) {
    await page.getByLabel("Nome *").fill("Runner Teste");
    await page.getByLabel("Marca *").fill("NEOX Lab");
    await page.getByLabel("SKU *").fill("NEOX-TESTE-001");
    await page.getByLabel("Slug *").fill("runner-teste");
    await page.getByLabel("Categoria *").fill("Performance");
    await page.getByLabel("Preço (R$) *").fill("1.299,90");
    await page.getByLabel("Cor *").fill("Preto/Lima");
    await page.getByLabel("Imagem principal *").fill("/static/images/demo/volt-runner-01.svg");
    await page.getByLabel("Descrição *").fill("Produto fictício de teste.");
    await page.getByLabel("Numeração (BR)").fill("40");
    await page.getByLabel("Estoque").fill("3");
  }

  test("foto do computador: reduz, envia com CSRF e preenche Imagem principal", async ({ page }) => {
    let request;
    const url = "/static/uploads/0123456789abcdef0123456789abcdef.webp";
    await page.route("**/api/admin/products/images", (r) => ((request = r.request()), r.fulfill({ status: 201, json: { url } })));
    await page.goto("/admin/produtos/");
    // PNG grande e ruidoso (2000×1200) para forçar a redução abaixo do limite do servidor
    const png = await page.evaluate(async () => {
      const c = Object.assign(document.createElement("canvas"), { width: 2000, height: 1200 });
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(2000, 1200);
      for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 2654435761) % 251;
      ctx.putImageData(img, 0, 0);
      return Array.from(new Uint8Array(await (await new Promise((r) => c.toBlob(r, "image/png"))).arrayBuffer()));
    });
    await page.route(`**${url}`, (r) => r.fulfill({ status: 200, contentType: "image/png", body: Buffer.from(png) }));
    await page.getByLabel("Foto do tênis").setInputFiles({ name: "tenis.png", mimeType: "image/png", buffer: Buffer.from(png) });
    await expect(page.getByLabel("Imagem principal *")).toHaveValue(url);
    await expect(page.locator("[data-image-preview]")).toBeVisible();
    expect(request.headers()["x-csrf-token"]).toBe("preview-csrf");
    expect(["image/webp", "image/jpeg"]).toContain(request.headers()["content-type"]);
    expect(request.postDataBuffer().length).toBeLessThanOrEqual(60000);
  });

  test("foto recusada: aviso e campo de imagem intacto", async ({ page }) => {
    await page.route("**/api/admin/products/images", (r) => r.fulfill({ status: 422, json: errorBody("VALIDATION_ERROR", "Envie uma foto JPG, PNG ou WebP.") }));
    await page.goto("/admin/produtos/");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.getByLabel("Foto do tênis").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: png });
    await expect(page.locator("[data-image-status]")).toContainText("Não foi possível enviar a foto");
    await expect(page.getByLabel("Imagem principal *")).toHaveValue("");
  });

  test("lista produtos com status e estoque somado", async ({ page }) => {
    await page.goto("/admin/produtos/");
    await expect(page.locator("[data-admin-rows] tr")).toHaveCount(mock.details.length + 1);
    await expect(page.locator("[data-admin-rows]")).toContainText("Inativo");
    await expect(page.getByText("Administrador de demonstração")).toBeAttached();
  });

  test("validação local bloqueia envio e marca campos", async ({ page }) => {
    let called = false;
    await page.route("**/api/admin/products", (r) => ((called = true), r.fulfill({ status: 500 })));
    await page.goto("/admin/produtos/");
    await fillValid(page);
    await page.getByLabel("Preço (R$) *").fill("12,345");
    await page.getByLabel("Slug *").fill("Slug Inválido");
    await page.getByRole("button", { name: "Cadastrar produto" }).click();
    const errors = page.locator("[data-form-errors]");
    await expect(errors).toBeFocused();
    await expect(errors).toContainText("Preço: use o formato 899,90.");
    await expect(page.getByLabel("Slug *")).toHaveAttribute("aria-invalid", "true");
    expect(called).toBe(false);
  });

  test("201: envia ProductCreate do contrato com CSRF e insere a linha", async ({ page }) => {
    let request;
    await page.route("**/api/admin/products", (r) => {
      request = r.request();
      const body = request.postDataJSON();
      r.fulfill({ status: 201, json: { ...body, id: "6740a1b2c3d4e5f6010000aa", createdAt: "2026-11-19T00:00:00Z", updatedAt: "2026-11-19T00:00:00Z" } });
    });
    await page.goto("/admin/produtos/");
    await fillValid(page);
    await page.getByLabel("Exibir no carrossel").check();
    await page.getByRole("button", { name: "Cadastrar produto" }).click();
    await expect(page.locator("[data-admin-status]")).toHaveText("Produto “Runner Teste” cadastrado.");

    const body = request.postDataJSON();
    expect(request.headers()["x-csrf-token"]).toBe("preview-csrf");
    expectSchemaKeys("ProductCreate", body);
    expect(body).toEqual({
      sku: "NEOX-TESTE-001", slug: "runner-teste", name: "Runner Teste", brand: "NEOX Lab", category: "Performance",
      priceCents: 129990, mainImageUrl: "/static/images/demo/volt-runner-01.svg", description: "Produto fictício de teste.",
      currency: "BRL", galleryUrls: ["/static/images/demo/volt-runner-01.svg"], colorName: "Preto/Lima", active: true,
      sizes: [{ sizeBR: 40, stock: 3 }],
      featured: { enabled: true, order: 1, backgroundHex: "#1A1D17", accentHex: "#BDF400" },
    });
    const first = page.locator("[data-admin-rows] tr").first();
    await expect(first).toContainText("Runner Teste");
    await expect(first).toContainText("R$ 1.299,90".replace(" ", " "));
    await expect(page.getByLabel("Nome *")).toHaveValue("");
  });

  test("3D do Sketchfab e créditos vão no ProductCreate (attributes); URL inválida é barrada", async ({ page }) => {
    let body = null;
    await page.route("**/api/admin/products", (r) => {
      body = r.request().postDataJSON();
      r.fulfill({ status: 201, json: { ...body, id: "6740a1b2c3d4e5f6010000ab", createdAt: "2026-11-19T00:00:00Z", updatedAt: "2026-11-19T00:00:00Z" } });
    });
    await page.goto("/admin/produtos/");
    await fillValid(page);
    await page.getByLabel("Modelo 3D", { exact: true }).fill("https://sketchfab.com/3d-models/air-max-c425a652fc59427ba1fcef48ea174c92");
    await page.getByLabel("Fonte das imagens (URL)").fill("http://exemplo.org");
    await page.getByRole("button", { name: "Cadastrar produto" }).click();
    await expect(page.locator("[data-form-errors]")).toContainText("Modelo 3D:");
    await expect(page.locator("[data-form-errors]")).toContainText("Fonte das imagens: URL https://");
    await expect(page.getByLabel("Modelo 3D", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(body).toBeNull();

    const model = "https://sketchfab.com/models/c425a652fc59427ba1fcef48ea174c92/embed";
    const attributes = {
      imageCredit: "Foto: Autor, CC BY 2.0", imageCreditUrl: "https://commons.wikimedia.org/wiki/File:X.jpg",
      model3dCredit: "Scan 3D por Autor, CC BY 4.0, via Sketchfab", model3dCreditUrl: "https://sketchfab.com/3d-models/c425a652fc59427ba1fcef48ea174c92",
    };
    await page.getByLabel("Modelo 3D", { exact: true }).fill(model);
    await page.getByLabel("Crédito das imagens").fill(attributes.imageCredit);
    await page.getByLabel("Fonte das imagens (URL)").fill(attributes.imageCreditUrl);
    await page.getByLabel("Crédito do modelo 3D").fill(attributes.model3dCredit);
    await page.getByLabel("Fonte do modelo 3D (URL)").fill(attributes.model3dCreditUrl);
    await page.getByRole("button", { name: "Cadastrar produto" }).click();
    await expect(page.locator("[data-admin-status]")).toContainText("cadastrado");
    expectSchemaKeys("ProductCreate", body);
    expect(body.model3dUrl).toBe(model);
    expect(body.attributes).toEqual(attributes);
  });

  test("409 e 422 mostram mensagens nos campos", async ({ page }) => {
    let status = 409;
    await page.route("**/api/admin/products", (r) =>
      r.fulfill(status === 409
        ? { status, json: errorBody("PRODUCT_CONFLICT", "Conflito.") }
        : { status, json: errorBody("VALIDATION_ERROR", "Revise os campos informados.", [{ field: "priceCents", code: "min", message: "Preço inválido." }]) }),
    );
    await page.goto("/admin/produtos/");
    await fillValid(page);
    await page.getByRole("button", { name: "Cadastrar produto" }).click();
    await expect(page.locator("[data-form-errors]")).toContainText("Já existe um produto com este SKU ou slug.");
    await expect(page.getByLabel("SKU *")).toHaveAttribute("aria-invalid", "true");
    status = 422;
    await page.getByRole("button", { name: "Cadastrar produto" }).click();
    await expect(page.locator("[data-form-errors]")).toContainText("Preço inválido.");
    await expect(page.getByLabel("Preço (R$) *")).toHaveAttribute("aria-invalid", "true");
  });

  test("sair chama logout com CSRF e volta ao login", async ({ page }) => {
    let csrf;
    await page.route("**/api/admin/auth/logout", (r) => ((csrf = r.request().headers()["x-csrf-token"]), r.fulfill({ status: 204 })));
    await page.goto("/admin/produtos/");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    expect(csrf).toBe("preview-csrf");
  });

  test("Editar: preenche o formulário, envia PATCH com CSRF e atualiza a linha", async ({ page }) => {
    const id = "6740a1b2c3d4e5f601000017"; // New Balance 574 do preview
    let request;
    await page.route(`**/api/admin/products/${id}`, (r) => {
      request = r.request();
      const body = request.postDataJSON();
      r.fulfill({ status: 200, json: { ...body, id, sku: "NEOX-DEMO-207", slug: "new-balance-574-cinza", brand: "New Balance", category: "Classics", mainImageUrl: "/static/images/products/new-balance-574-cinza/main.webp", active: true, sizes: body.sizes, createdAt: "2026-11-19T00:00:00Z", updatedAt: "2026-11-26T00:00:00Z" } });
    });
    await page.goto("/admin/produtos/");
    const row = page.locator(`tr[data-product-id="${id}"]`);
    await row.getByRole("button", { name: /Editar/ }).click();
    await expect(page.locator("[data-form-title]")).toHaveText("Editar: New Balance 574");
    await expect(page.getByLabel("Preço (R$) *")).toHaveValue("699,90");
    await expect(page.getByLabel("SKU *")).toHaveValue("NEOX-DEMO-207");
    await expect(page.getByLabel("Numeração (BR)")).toHaveCount(6);
    await page.getByLabel("Nome *").fill("New Balance 574 Editado");
    await page.getByLabel("Preço (R$) *").fill("649,90");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.locator("[data-admin-status]")).toHaveText("Produto “New Balance 574 Editado” atualizado.");
    expect(request.method()).toBe("PATCH");
    expect(request.headers()["x-csrf-token"]).toBe("preview-csrf");
    expect(request.postDataJSON()).toMatchObject({ name: "New Balance 574 Editado", priceCents: 64990, active: true });
    expect(request.postDataJSON().attributes.imageCredit).toContain("LeDroider");
    await expect(row).toContainText("New Balance 574 Editado");
    await expect(row).toContainText("R$ 649,90");
    await expect(page.locator("[data-form-title]")).toHaveText("Cadastrar produto");
    await expect(page.getByRole("button", { name: "Cancelar edição" })).toBeHidden();
  });

  test("Cancelar edição volta ao cadastro vazio", async ({ page }) => {
    await page.goto("/admin/produtos/");
    await page.locator("[data-admin-rows] tr").first().getByRole("button", { name: /Editar/ }).click();
    await page.getByRole("button", { name: "Cancelar edição" }).click();
    await expect(page.getByLabel("Nome *")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Cadastrar produto" })).toBeVisible();
  });

  test("Excluir: confirma, envia DELETE e tira a linha do painel", async ({ page }) => {
    const id = "6740a1b2c3d4e5f601000017";
    let request;
    await page.route(`**/api/admin/products/${id}`, (r) => ((request = r.request()), r.fulfill({ status: 204 })));
    await page.goto("/admin/produtos/");
    const row = page.locator(`tr[data-product-id="${id}"]`);
    let dialog = "";
    page.once("dialog", (d) => ((dialog = d.message()), d.dismiss()));
    await row.getByRole("button", { name: /Excluir/ }).click();
    expect(dialog).toContain("Excluir “New Balance 574” definitivamente?");
    expect(request).toBeUndefined();
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /Excluir/ }).click();
    await expect(page.locator("[data-admin-status]")).toHaveText("Produto “New Balance 574” excluído.");
    expect(request.method()).toBe("DELETE");
    expect(request.headers()["x-csrf-token"]).toBe("preview-csrf");
    await expect(row).toHaveCount(0);
  });

  test("painel: sem rolagem horizontal da página e sem violações axe sérias", async ({ page }) => {
    await page.goto("/admin/produtos/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await axeSerious(page)).toEqual([]);
  });
});
