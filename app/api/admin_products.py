from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response

from app.core.security import require_csrf
from app.schemas.product import (
    AdminFilters,
    AdminProduct,
    AdminProductList,
    ProductCreate,
    ProductPatch,
)
from app.services.admin import require_admin
from app.services.catalog import create_product, list_products, products_collection, update_product

router = APIRouter(
    prefix="/api/admin/products", tags=["Admin"], dependencies=[Depends(require_admin)]
)
Collection = Annotated[object, Depends(products_collection)]


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
