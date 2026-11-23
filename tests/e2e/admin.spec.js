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

  test("painel: sem rolagem horizontal da página e sem violações axe sérias", async ({ page }) => {
    await page.goto("/admin/produtos/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await axeSerious(page)).toEqual([]);
  });
});
