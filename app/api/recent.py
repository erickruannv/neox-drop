from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.core.security import require_csrf
from app.db.mongodb import mongodb_client
from app.schemas.checkout import RecentRequest
from app.schemas.product import RecentList, RecentSearchList
from app.services.catalog import products_collection
from app.services.recent import (
    recent_ids,
    recent_searches,
    register_visit,
    resolve_recent,
    visitor_cookie,
)

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
    response = Response(status_code=204)
    settings = request.app.state.settings
    await register_visit(
        collection, body.productId, visitor_cookie(request, response, settings), settings
    )
    return response


@router.get(
    "/searches",
    operation_id="listRecentSearches",
    response_model=RecentSearchList,
)
async def searches(request: Request):
    visitor = request.cookies.get("neox_visitor")
    return {"items": await recent_searches(visitor, request.app.state.settings)}
