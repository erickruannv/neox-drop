import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.core.security import require_csrf
from app.db.mongodb import mongodb_client
from app.schemas.checkout import RecentRequest
from app.schemas.product import RecentList
from app.services.catalog import products_collection
from app.services.recent import recent_ids, register_visit, resolve_recent, valid_visitor

router = APIRouter(prefix="/api/recent", tags=["Público"])


@router.get(
    "", operation_id="listRecent", response_model=RecentList, response_model_exclude_unset=True
)
async def listing(request: Request):
    settings = request.app.state.settings
    identifiers = await recent_ids(request.cookies.get("neox_visitor"), settings)
    if not identifiers:
        return {"items": []}
    async with mongodb_client(settings) as client:
        return await resolve_recent(client[settings.mongodb_database]["products"], identifiers)


@router.post(
    "", operation_id="registerRecent", status_code=204, dependencies=[Depends(require_csrf)]
)
async def visit(
    body: RecentRequest,
    request: Request,
    collection: Annotated[object, Depends(products_collection)],
):
    settings = request.app.state.settings
    visitor = request.cookies.get("neox_visitor")
    if not valid_visitor(visitor):
        visitor = secrets.token_hex(16)
    await register_visit(collection, body.productId, visitor, settings)
    response = Response(status_code=204)
    response.set_cookie(
        "neox_visitor",
        visitor,
        max_age=settings.recent_ttl_seconds,
        httponly=True,
        samesite="lax",
        secure=settings.allowed_origin.startswith("https://"),
    )
    return response
