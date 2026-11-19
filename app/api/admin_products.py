from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from app.core.security import require_csrf
from app.schemas.product import AdminProduct, AdminProductList, ProductCreate, ProductPatch
from app.services.admin import require_admin
from app.services.catalog import create_product, list_products, products_collection, update_product

router = APIRouter(
    prefix="/api/admin/products", tags=["Admin"], dependencies=[Depends(require_admin)]
)
Collection = Annotated[object, Depends(products_collection)]


class PublicFilters(BaseModel):
    q: str | None = Query(default=None, max_length=100)
    brand: str | None = Query(default=None, max_length=120)
    category: str | None = Query(default=None, max_length=120)
    sizeBR: int | None = Query(default=None, ge=15, le=60)
    sort: Literal["recent", "price_asc", "price_desc"] = "recent"
    page: int = Query(default=1, ge=1)
    limit: int = Query(default=12, ge=1, le=24)


class AdminFilters(PublicFilters):
    active: bool | None = None


@router.get(
    "",
    operation_id="listAdminProducts",
    response_model=AdminProductList,
    response_model_exclude_unset=True,
)
async def listing(
    response: Response, collection: Collection, filters: Annotated[AdminFilters, Query()]
):
    response.headers["Cache-Control"] = "no-store"
    return await list_products(collection, filters, public=False)


@router.post(
    "",
    operation_id="createProduct",
    status_code=201,
    response_model=AdminProduct,
    response_model_exclude_unset=True,
    dependencies=[Depends(require_csrf)],
)
async def create(body: ProductCreate, request: Request, response: Response, collection: Collection):
    response.headers["Cache-Control"] = "no-store"
    return await create_product(
        collection, body.model_dump(exclude_unset=True), request.app.state.settings
    )


@router.patch(
    "/{id}",
    operation_id="updateProduct",
    response_model=AdminProduct,
    response_model_exclude_unset=True,
    dependencies=[Depends(require_csrf)],
)
async def update(
    id: str, body: ProductPatch, request: Request, response: Response, collection: Collection
):
    response.headers["Cache-Control"] = "no-store"
    return await update_product(
        collection, id, body.model_dump(exclude_unset=True), request.app.state.settings
    )


@router.delete(
    "/{id}", operation_id="deactivateProduct", status_code=204, dependencies=[Depends(require_csrf)]
)
async def deactivate(id: str, request: Request, collection: Collection):
    await update_product(collection, id, {"active": False}, request.app.state.settings)
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
