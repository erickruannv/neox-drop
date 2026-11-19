"""Renderiza app/templates com Jinja2 real e fixtures validadas no OpenAPI (preview/E2E de UI).

Não é servidor da aplicação: só gera HTML estático em tests/e2e/.preview para o Playwright.
"""

import copy
import json
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "tests/e2e/.preview"
SCHEMA_FOR = {"featured": "FeaturedList", "launches": "ProductList", "recent": "RecentList"}

openapi = json.loads((ROOT / "docs/contracts/openapi.json").read_text())
registry = Registry().with_resource("urn:openapi", Resource.from_contents(openapi, default_specification=DRAFT202012))


def validate(context: dict) -> None:
    for key, name in SCHEMA_FOR.items():
        schema = {"$ref": f"urn:openapi#/components/schemas/{name}"}
        Draft202012Validator(schema, registry=registry).validate(context[key])


def variants(base: dict) -> dict[str, dict]:
    empty = {"featured": {"items": []}, "launches": {"items": [], "page": 1, "limit": 4, "total": 0}, "recent": {"items": []}}
    model = copy.deepcopy(base)
    # GLB inexistente: exercita o caminho Model Viewer -> erro -> fallback 2D, sem ativo 3D.
    model["featured"]["items"][0]["model3dUrl"] = "/static/models/nao-existe.glb"
    return {"": base, "empty": empty, "model": model}


def main() -> None:
    env = Environment(loader=FileSystemLoader(ROOT / "app/templates"), autoescape=True, undefined=StrictUndefined)
    base = json.loads((ROOT / "tests/e2e/fixtures/home.json").read_text())
    static = OUT / "static"
    OUT.mkdir(parents=True, exist_ok=True)
    if not static.exists():
        static.symlink_to(ROOT / "app/static")
    for name, ctx in variants(base).items():
        validate(ctx)
        html = env.get_template("home.html").render(request=None, csrfToken="preview-csrf", siteName="NEOX drop", **ctx)
        target = OUT / name / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html)
        print(f"ok {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
