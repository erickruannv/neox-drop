"""Renderiza app/templates com Jinja2 real e fixtures validadas no OpenAPI (preview/E2E de UI).

Não é servidor da aplicação: só gera HTML estático em tests/e2e/.preview para o Playwright.
Também grava as respostas fictícias da API em .preview/mock-api.json para os testes.
"""

import copy
import json
from types import SimpleNamespace
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "tests/e2e/.preview"
FIXTURES = ROOT / "tests/e2e/fixtures"
SCHEMA_FOR = {
    "featured": "FeaturedList",
    "launches": "ProductList",
    "recent": "RecentList",
    "catalog": "ProductList",
    "product": "ProductDetail",
    "products": "AdminProductList",
    "admin": "AdminProfile",
}
SUMMARY_KEYS = ["id", "sku", "slug", "name", "brand", "category", "priceCents", "mainImageUrl", "sizesAvailable", "active"]

openapi = json.loads((ROOT / "docs/contracts/openapi.json").read_text())
registry = Registry().with_resource("urn:openapi", Resource.from_contents(openapi, default_specification=DRAFT202012))


def validate_as(name: str, value) -> None:
    schema = {"$ref": f"urn:openapi#/components/schemas/{name}"}
    Draft202012Validator(schema, registry=registry).validate(value)


def validate(context: dict) -> None:
    for key, name in SCHEMA_FOR.items():
        if key in context:
            validate_as(name, context[key])


def summary(detail: dict) -> dict:
    return {k: detail[k] for k in SUMMARY_KEYS}


def admin_product(detail: dict, n: int) -> dict:
    item = {k: v for k, v in detail.items() if k not in ("sizesAvailable",)}
    item["sizes"] = [{"sizeBR": s, "stock": 2 + (s + n) % 4} for s in detail["sizesAvailable"]] or [{"sizeBR": 40, "stock": 0}]
    item["createdAt"] = item["updatedAt"] = "2026-11-18T12:00:00Z"
    return item


def pages() -> tuple[dict[str, tuple[str, dict]], dict]:
    home = json.loads((FIXTURES / "home.json").read_text())
    extra = json.loads((FIXTURES / "products.json").read_text())
    details = home["featured"]["items"] + extra["extraDetails"]
    catalog = {"items": [summary(d) for d in details], "page": 1, "limit": 12, "total": len(details)}
    inactive = admin_product({**details[0], "id": "6740a1b2c3d4e5f6010000ff", "sku": "NEOX-DEMO-199", "slug": "arquivado-exemplo", "active": False}, 9)
    # Só para testar o estado "esgotado": não entra no catálogo nem na vitrine.
    sold_out = {**details[-1], "id": "6740a1b2c3d4e5f6010000fe", "sku": "NEOX-DEMO-198", "slug": "esgotado-exemplo", "sizesAvailable": []}
    admin_items = [admin_product(d, i) for i, d in enumerate(details)] + [inactive]
    empty = {"featured": {"items": []}, "launches": {"items": [], "page": 1, "limit": 4, "total": 0}, "recent": {"items": []}}
    model = copy.deepcopy(home)
    # GLB inexistente: exercita o caminho Model Viewer -> erro -> fallback 2D, sem ativo 3D.
    model["featured"]["items"][0]["model3dUrl"] = "/static/models/nao-existe.glb"

    no3d = copy.deepcopy(home)
    for item in no3d["featured"]["items"]:
        item.pop("model3dUrl", None)

    # Banco com um único destaque ativo: carrossel sem miniaturas, contador ou setas.
    single = copy.deepcopy(home)
    single["featured"]["items"] = single["featured"]["items"][:1]

    out = {
        "": ("home.html", home),
        "um-destaque": ("home.html", single),
        "sem-3d": ("home.html", no3d),
        "empty": ("home.html", empty),
        "model": ("home.html", model),
        "tenis": ("catalog.html", {"catalog": catalog, "filters": {}}),
        "admin/login": ("admin/login.html", {}),
        "admin/produtos": ("admin/products.html", {"products": {"items": admin_items, "page": 1, "limit": 24, "total": len(admin_items)}, "admin": extra["admin"]}),
    }
    for d in details + [sold_out]:
        out[f"tenis/{d['slug']}"] = ("product.html", {"product": d})
    mock = {"details": details, "catalog": catalog["items"], "adminProduct": admin_items[0]}
    validate_as("ProductList", catalog)
    validate_as("AdminProduct", mock["adminProduct"])
    return out, mock


def main() -> None:
    env = Environment(loader=FileSystemLoader(ROOT / "app/templates"), autoescape=True, undefined=StrictUndefined)
    OUT.mkdir(parents=True, exist_ok=True)
    static = OUT / "static"
    if not static.exists():
        static.symlink_to(ROOT / "app/static")
    routes, mock = pages()
    for route, (template, ctx) in routes.items():
        validate(ctx)
        html = env.get_template(template).render(request=SimpleNamespace(url=SimpleNamespace(path=f"/{route}")), csrfToken="preview-csrf", siteName="NEOX drop", **ctx)
        target = OUT / route / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html)
        print(f"ok /{route}")
    (OUT / "mock-api.json").write_text(json.dumps(mock, ensure_ascii=False))


if __name__ == "__main__":
    main()
