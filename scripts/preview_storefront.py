"""Vitrine visual FastAPI opt-in: fixtures aprovadas, APIs/admin reais sem conexões remotas.

uv run uvicorn scripts.preview_storefront:app --host 127.0.0.1 --port 8001
Não comprova estoque, login, checkout ou persistência. Não usar como aplicação publicada.
"""

import json
import secrets
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Query, Request, Response

from app.api.pages import render
from app.core.config import Settings
from app.core.exceptions import ApiFault
from app.main import create_app
from app.schemas.product import ProductDetail, ProductSummary, PublicFilters

settings = Settings(
    _env_file=None,
    test_connections_enabled=False,
    allowed_origin="http://127.0.0.1:8001",
    cookie_secret=secrets.token_urlsafe(48),
)
app = create_app(settings)
source = Path(__file__).resolve().parents[1] / "tests/e2e/fixtures/home.json"
context = json.loads(source.read_text())
items = [
    ProductDetail.model_validate(p).model_dump(exclude_unset=True)
    for p in context["featured"]["items"]
]
preview = APIRouter(include_in_schema=False)


def show(request, response, template, **data):
    return render(request, response, template, demoMode=True, readonlyShowcase=True, **data)


@preview.get("/")
async def home(request: Request, response: Response):
    return show(request, response, "home.html", **context)


@preview.get("/api/products")
async def listing(filters: Annotated[PublicFilters, Query()]):
    found = [
        p
        for p in items
        if (not filters.brand or p["brand"] == filters.brand)
        and (not filters.category or p["category"] == filters.category)
        and (filters.sizeBR is None or filters.sizeBR in p["sizesAvailable"])
        and (
            not filters.q
            or filters.q.casefold()
            in " ".join(p[k] for k in ("name", "brand", "description")).casefold()
        )
    ]
    if filters.sort != "recent":
        found.sort(key=lambda p: p["priceCents"], reverse=filters.sort == "price_desc")
    start = (filters.page - 1) * filters.limit
    return {
        "items": [
            ProductSummary.model_validate(
                {k: p[k] for k in ProductSummary.model_fields}
            ).model_dump()
            for p in found[start : start + filters.limit]
        ],
        "total": len(found),
        "page": filters.page,
        "limit": filters.limit,
    }


@preview.get("/tenis")
async def catalog(request: Request, response: Response, filters: Annotated[PublicFilters, Query()]):
    return show(
        request,
        response,
        "catalog.html",
        filters=filters.model_dump(),
        catalog=await listing(filters),
    )


@preview.get("/api/featured")
async def featured():
    return {"items": items}


@preview.get("/api/products/{slug}")
async def product_data(slug: str):
    product = next((p for p in items if p["slug"] == slug), None)
    if product is None:
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    return product


@preview.get("/tenis/{slug}")
async def detail(slug: str, request: Request, response: Response):
    product = next((p for p in items if p["slug"] == slug), None)
    if product is None:
        return render(
            request, response, "error.html", status_code=404, message="Produto não encontrado."
        )
    return show(request, response, "product.html", product=product)


# Vitrine e GETs públicos usam fixtures explícitas. Escritas, CSRF e admin são os reais.
app.router.routes[0:0] = preview.routes
