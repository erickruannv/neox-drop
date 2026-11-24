from typing import Annotated, Any, Literal

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    Field,
    StrictBool,
    StrictInt,
    StrictStr,
    model_validator,
)

from app.schemas.common import (
    Cents,
    HexColor,
    MediaPath,
    NonEmpty,
    ProductId,
    SizeBR,
    WireModel,
)


def require_true(value):
    if value is not True:
        raise ValueError("Valor deve ser true.")
    return value


def unique_items(value):
    if len(value) != len(set(value)):
        raise ValueError("Valores duplicados.")
    return value


class SizeStock(WireModel):
    sizeBR: SizeBR
    stock: Annotated[StrictInt, Field(ge=0)]


class Featured(WireModel):
    enabled: StrictBool
    order: Annotated[StrictInt, Field(ge=1)]
    backgroundHex: HexColor
    accentHex: HexColor


class ProductSummary(WireModel):
    id: ProductId
    sku: NonEmpty
    slug: NonEmpty
    name: NonEmpty
    brand: NonEmpty
    category: NonEmpty
    priceCents: Cents
    mainImageUrl: MediaPath
    sizesAvailable: Annotated[list[SizeBR], AfterValidator(unique_items)]
    active: Annotated[StrictBool, AfterValidator(require_true)]


class ProductDetail(ProductSummary):
    description: StrictStr
    currency: Literal["BRL"]
    galleryUrls: Annotated[list[MediaPath], Field(min_length=1)]
    model3dUrl: MediaPath = Field(default=None)
    colorName: NonEmpty
    featured: Featured = Field(default=None)
    attributes: dict[str, Any] = Field(default=None)


class ProductCreate(WireModel):
    sku: NonEmpty
    slug: NonEmpty
    name: NonEmpty
    brand: NonEmpty
    category: NonEmpty
    priceCents: Cents
    mainImageUrl: MediaPath
    description: StrictStr
    currency: Literal["BRL"]
    galleryUrls: Annotated[list[MediaPath], Field(min_length=1)]
    model3dUrl: MediaPath = Field(default=None)
    colorName: NonEmpty
    featured: Featured = Field(default=None)
    attributes: dict[str, Any] = Field(default=None)
    active: StrictBool
    sizes: Annotated[list[SizeStock], Field(min_length=1)]


class FeaturedPatch(WireModel):
    enabled: StrictBool = Field(default=None)
    order: Annotated[StrictInt, Field(ge=1)] = Field(default=None)
    backgroundHex: HexColor = Field(default=None)
    accentHex: HexColor = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def require_changes(cls, value):
        if isinstance(value, dict) and not value:
            raise ValueError("Informe ao menos um campo.")
        return value


class ProductPatch(WireModel):
    sku: NonEmpty = Field(default=None)
    slug: NonEmpty = Field(default=None)
    name: NonEmpty = Field(default=None)
    brand: NonEmpty = Field(default=None)
    category: NonEmpty = Field(default=None)
    priceCents: Cents = Field(default=None)
    mainImageUrl: MediaPath = Field(default=None)
    description: StrictStr = Field(default=None)
    currency: Literal["BRL"] = Field(default=None)
    galleryUrls: Annotated[list[MediaPath], Field(min_length=1)] = Field(default=None)
    model3dUrl: MediaPath | None = Field(default=None)
    colorName: NonEmpty = Field(default=None)
    featured: FeaturedPatch = Field(default=None)
    attributes: dict[str, Any] = Field(default=None)
    active: StrictBool = Field(default=None)
    sizes: Annotated[list[SizeStock], Field(min_length=1)] = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def require_changes(cls, value):
        if isinstance(value, dict) and not value:
            raise ValueError("Informe ao menos um campo.")
        return value


class AdminProduct(ProductCreate):
    id: ProductId
    createdAt: AwareDatetime
    updatedAt: AwareDatetime


class ProductList(WireModel):
    items: Annotated[list[ProductSummary], Field(max_length=24)]
    page: Annotated[StrictInt, Field(ge=1)]
    limit: Annotated[StrictInt, Field(ge=1, le=24)]
    total: Annotated[StrictInt, Field(ge=0)]


class AdminProductList(WireModel):
    items: Annotated[list[AdminProduct], Field(max_length=24)]
    page: Annotated[StrictInt, Field(ge=1)]
    limit: Annotated[StrictInt, Field(ge=1, le=24)]
    total: Annotated[StrictInt, Field(ge=0)]


class FeaturedList(WireModel):
    items: list[ProductDetail]


class RecentList(WireModel):
    items: Annotated[list[ProductSummary], Field(max_length=5)]


class RecentSearchList(WireModel):
    items: Annotated[list[Annotated[str, Field(max_length=100)]], Field(max_length=3)]


class PublicFilters(BaseModel):
    q: str | None = Field(default=None, max_length=100)
    brand: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    sizeBR: int | None = Field(default=None, ge=15, le=60)
    sort: Literal["recent", "price_asc", "price_desc"] = "recent"
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=12, ge=1, le=24)


class AdminFilters(PublicFilters):
    active: bool | None = None
