import secrets
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response

from app.core.exceptions import ApiFault
from app.core.security import require_csrf
from app.schemas.product import (
    AdminFilters,
    AdminProduct,
    AdminProductList,
    ImageUpload,
    ProductCreate,
    ProductPatch,
)
from app.services.admin import require_admin
from app.services.catalog import create_product, list_products, products_collection, update_product

router = APIRouter(
    prefix="/api/admin/products", tags=["Admin"], dependencies=[Depends(require_admin)]
)
Collection = Annotated[object, Depends(products_collection)]
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "static" / "uploads"
# Tipo declarado deve bater com a assinatura do arquivo; o painel converte a foto antes.
IMAGE_TYPES = {
    "image/webp": (b"RIFF", ".webp"),
    "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
    "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
}


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
async def deactivate(id: str, request: Request, response: Response, collection: Collection):
    await update_product(collection, id, {"active": False}, request.app.state.settings)
    response.status_code = 204
    response.headers["Cache-Control"] = "no-store"
    return response


@router.post(
    "/images",
    operation_id="uploadProductImage",
    status_code=201,
    response_model=ImageUpload,
    dependencies=[Depends(require_csrf)],
)
async def upload_image(request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    kind = IMAGE_TYPES.get(request.headers.get("content-type", "").split(";")[0].strip().lower())
    body = await request.body()
    if not kind or not body.startswith(kind[0]) or (kind[1] == ".webp" and body[8:12] != b"WEBP"):
        raise ApiFault(422, "VALIDATION_ERROR", "Envie uma foto JPG, PNG ou WebP.")
    UPLOAD_DIR.mkdir(exist_ok=True)
    name = f"{secrets.token_hex(16)}{kind[1]}"
    (UPLOAD_DIR / name).write_bytes(body)
    return {"url": f"/static/uploads/{name}"}
