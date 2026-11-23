from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.templating import Jinja2Templates

from app.api.products import featured
from app.core.exceptions import ApiFault
from app.core.security import issue_csrf
from app.schemas.auth import AdminProfile
from app.schemas.product import AdminFilters, PublicFilters
from app.services.admin import require_admin
from app.services.catalog import list_products, product_detail, products_collection
from app.services.recent import recent_ids, resolve_recent

router = APIRouter(include_in_schema=False)
templates = Jinja2Templates(directory=Path(__file__).resolve().parents[1] / "templates")
Collection = Annotated[object, Depends(products_collection)]
HOME_EXCLUDED_SKUS = ("NEOX-AM90-INFRARED",)


def render(request: Request, response: Response, name: str, *, status_code=200, **context):
    session = getattr(request.state, "admin_access_token", None)
    token = (
        issue_csrf(
            request.app.state.settings,
            response,
            session if session is not None else request.cookies.get("neox_admin_session", ""),
        )
        if request.app.state.settings.cookie_secret
        else ""
    )
    page = templates.TemplateResponse(
        request=request,
        name=name,
        context={"siteName": "NEOX drop", "csrfToken": token, **context},
        status_code=status_code,
        headers={"Cache-Control": "no-store"},
    )
    page.raw_headers.extend((k, v) for k, v in response.raw_headers if k == b"set-cookie")
    return page


def unavailable(request: Request):
    context = {
        "serviceMessage": "Catálogo temporariamente indisponível. Tente novamente mais tarde.",
        "message": "Não foi possível consultar o catálogo.",
    }
    name = "error.html"
    if request.url.path == "/":
        name = "home.html"
        context.update(
            featured={"items": []},
            recent={"items": []},
            launches={"items": [], "page": 1, "limit": 6, "total": 0},
        )
    elif request.url.path == "/tenis":
        name = "catalog.html"
        context.update(
            catalog={"items": [], "page": 1, "limit": 12, "total": 0},
            filters=dict(request.query_params),
        )
    return render(request, Response(), name, status_code=503, **context)


@router.get("/")
async def home(request: Request, response: Response, collection: Collection):
    identifiers = await recent_ids(request.cookies.get("neox_visitor"), request.app.state.settings)
    highlights = await featured(collection)
    recent = await resolve_recent(collection, identifiers) if identifiers else {"items": []}
    # Curadoria exclusiva da home: catálogo, detalhe e histórico Redis continuam completos.
    for group in (highlights, recent):
        group["items"] = [p for p in group["items"] if p["sku"] not in HOME_EXCLUDED_SKUS]
    return render(
        request,
        response,
        "home.html",
        featured=highlights,
        launches=await list_products(
            collection, PublicFilters(limit=6), public=True, excluded_skus=HOME_EXCLUDED_SKUS
        ),
        recent=recent,
    )


@router.get("/tenis")
async def catalog(
    request: Request,
    response: Response,
    collection: Collection,
    filters: Annotated[PublicFilters, Query()],
):
    return render(
        request,
        response,
        "catalog.html",
        catalog=await list_products(collection, filters, public=True),
        filters=filters.model_dump(),
    )


@router.get("/tenis/{slug}")
async def product(slug: str, request: Request, response: Response, collection: Collection):
    try:
        detail = await product_detail(collection, slug, request.app.state.settings)
    except ApiFault as exc:
        if exc.status != 404:
            raise
        return render(
            request, response, "error.html", status_code=404, message="Produto não encontrado."
        )
    return render(request, response, "product.html", product=detail)


@router.get("/admin/login")
async def login(request: Request, response: Response):
    settings = request.app.state.settings
    message = ""
    if not (
        settings.test_connections_enabled
        and settings.supabase_url
        and settings.supabase_key
        and settings.cookie_secret
    ):
        message = "A autenticação administrativa aguarda configuração do ambiente de teste."
    return render(request, response, "admin/login.html", serviceMessage=message)


@router.get("/admin")
@router.get("/admin/produtos")
async def admin_products(
    request: Request,
    response: Response,
    admin: Annotated[AdminProfile, Depends(require_admin)],
    collection: Collection,
    filters: Annotated[AdminFilters, Query()],
):
    return render(
        request,
        response,
        "admin/products.html",
        products=await list_products(collection, filters, public=False),
        admin=admin.model_dump(),
    )
