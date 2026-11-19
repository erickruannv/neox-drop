// Respostas fictícias da API a partir das fixtures validadas no OpenAPI (render_preview.py).
import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";

export const mock = JSON.parse(readFileSync(new URL("../.preview/mock-api.json", import.meta.url)));
export const openapi = JSON.parse(readFileSync(new URL("../../../docs/contracts/openapi.json", import.meta.url)));

// GET /api/products com os filtros do contrato aplicados sobre as fixtures.
export function productList(params, items = mock.catalog) {
  let out = items.filter(
    (p) =>
      (!params.get("category") || p.category === params.get("category")) &&
      (!params.get("brand") || p.brand.toLowerCase().includes(params.get("brand").toLowerCase())) &&
      (!params.get("q") || p.name.toLowerCase().includes(params.get("q").toLowerCase())) &&
      (!params.get("sizeBR") || p.sizesAvailable.includes(Number(params.get("sizeBR")))),
  );
  if (params.get("sort") === "price_asc") out = [...out].sort((a, b) => a.priceCents - b.priceCents);
  if (params.get("sort") === "price_desc") out = [...out].sort((a, b) => b.priceCents - a.priceCents);
  const page = Number(params.get("page") ?? 1);
  const limit = Number(params.get("limit") ?? 12);
  return { items: out.slice((page - 1) * limit, page * limit), page, limit, total: out.length };
}

export const errorBody = (code, message, details = []) => ({ error: { code, message, details } });

// Checa chaves contra o schema (required + additionalProperties:false), sem dependência extra.
export function expectSchemaKeys(name, value) {
  const schema = openapi.components.schemas[name];
  for (const key of schema.required) expect(value, `${name}.${key} obrigatório`).toHaveProperty(key);
  for (const key of Object.keys(value)) expect(Object.keys(schema.properties), `${name}.${key} não existe no contrato`).toContain(key);
}
