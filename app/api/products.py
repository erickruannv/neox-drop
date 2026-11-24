from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response

from app.schemas.product import FeaturedList, ProductDetail, ProductList, PublicFilters
from app.services.catalog import list_products, product_detail, products_collection, public_product
from app.services.recent import track_search

router = APIRouter(prefix="/api", tags=["Público"])
Collection = Annotated[object, Depends(products_collection)]


@router.get(
    "/products",
    operation_id="listProducts",
    response_model=ProductList,
    response_model_exclude_unset=True,
)
async def listing(
    request: Request,
    response: Response,
    collection: Collection,
    filters: Annotated[PublicFilters, Query()],
):
    result = await list_products(collection, filters, public=True)
    await track_search(request, response, filters.q)
    return result


@router.get(
    "/products/{slug}",
    operation_id="getProduct",
    response_model=ProductDetail,
    response_model_exclude_unset=True,
)
async def detail(slug: str, request: Request, collection: Collection):
    return await product_detail(collection, slug, request.app.state.settings)


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
