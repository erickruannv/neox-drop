from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.core.security import require_csrf
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.cart import checkout_summary
from app.services.catalog import products_collection

router = APIRouter(tags=["Público"])


@router.post(
    "/api/checkout",
    operation_id="checkout",
    response_model=CheckoutResponse,
    dependencies=[Depends(require_csrf)],
)
async def checkout(
    body: CheckoutRequest,
    request: Request,
    collection: Annotated[object, Depends(products_collection)],
):
    return await checkout_summary(collection, body.model_dump(), request.app.state.settings)
