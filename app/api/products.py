from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import ApiFault
from app.schemas.product import FeaturedList, ProductDetail, ProductList, PublicFilters
from app.services.catalog import list_products, products_collection, public_product

router = APIRouter(prefix="/api", tags=["Público"])
Collection = Annotated[object, Depends(products_collection)]


@router.get(
    "/products",
    operation_id="listProducts",
    response_model=ProductList,
    response_model_exclude_unset=True,
)
async def listing(collection: Collection, filters: Annotated[PublicFilters, Query()]):
    return await list_products(collection, filters, public=True)


@router.get(
    "/products/{slug}",
    operation_id="getProduct",
    response_model=ProductDetail,
    response_model_exclude_unset=True,
)
async def detail(slug: str, collection: Collection):
    doc = await collection.find_one({"slug": slug, "active": True})
    if not doc or doc.get("active") is not True:
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    return public_product(doc)


@router.get(
    "/featured",
    operation_id="listFeatured",
    response_model=FeaturedList,
    response_model_exclude_unset=True,
)
async def featured(collection: Collection):
    docs = (
        await collection.find({"active": True, "featured.enabled": True})
        .sort([("featured.order", 1), ("_id", 1)])
        .to_list(length=None)
    )
    return {"items": [public_product(doc) for doc in docs]}
