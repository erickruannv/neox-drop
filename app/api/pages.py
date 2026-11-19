from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import HTMLResponse
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


def render(request: Request, response: Response, name: str, **context):
    session = getattr(request.state, "admin_access_token", None)
    token = issue_csrf(
        request.app.state.settings,
        response,
        session if session is not None else request.cookies.get("neox_admin_session", ""),
    )
    page = templates.TemplateResponse(
        request=request,
        name=name,
        context={"siteName": "NEOX drop", "csrfToken": token, **context},
        headers={"Cache-Control": "no-store"},
    )
    page.raw_headers.extend((k, v) for k, v in response.raw_headers if k == b"set-cookie")
    return page


@router.get("/")
async def home(request: Request, response: Response, collection: Collection):
    identifiers = await recent_ids(request.cookies.get("neox_visitor"), request.app.state.settings)
    return render(
        request,
        response,
        "home.html",
        featured=await featured(collection),
        launches=await list_products(collection, PublicFilters(limit=4), public=True),
        recent=await resolve_recent(collection, identifiers) if identifiers else {"items": []},
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
        return HTMLResponse("<h1>Produto não encontrado.</h1>", status_code=404)
    return render(request, response, "product.html", product=detail)


@router.get("/admin/login")
async def login(request: Request, response: Response):
    return render(request, response, "admin/login.html")


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
