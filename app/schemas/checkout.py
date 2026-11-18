from typing import Annotated, Literal

from pydantic import (
    ConfigDict,
    Field,
    StrictStr,
)

from app.schemas.common import Cents, NonEmpty, ProductId, Quantity, SizeBR, WireModel


class RecentRequest(WireModel):
    productId: ProductId


class CartItem(WireModel):
    model_config = ConfigDict(extra="ignore", hide_input_in_errors=True)
    productId: ProductId
    sizeBR: SizeBR
    quantity: Quantity


class CheckoutRequest(WireModel):
    model_config = ConfigDict(extra="ignore", hide_input_in_errors=True)
    items: Annotated[list[CartItem], Field(min_length=1, max_length=50)]


class CheckoutLine(WireModel):
    productId: ProductId
    name: NonEmpty
    sizeBR: SizeBR
    quantity: Quantity
    unitPriceCents: Cents
    lineTotalCents: Cents


class CheckoutResponse(WireModel):
    items: Annotated[list[CheckoutLine], Field(min_length=1, max_length=50)]
    totalCents: Cents
    currency: Literal["BRL"]
    waUrl: StrictStr
