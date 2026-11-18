from typing import Annotated, Literal, get_args

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, model_validator

NonEmpty = Annotated[StrictStr, Field(min_length=1)]
ProductId = Annotated[StrictStr, Field(pattern=r"^[0-9a-fA-F]{24}$")]
Cents = Annotated[StrictInt, Field(ge=0)]
SizeBR = Annotated[StrictInt, Field(ge=15, le=60)]
Quantity = Annotated[StrictInt, Field(ge=1, le=10)]
MediaPath = Annotated[
    StrictStr, Field(min_length=1, pattern=r"^(?:/static/[^\s?#]+|https://[^\s]+)$")
]
HexColor = Annotated[StrictStr, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]


class WireModel(BaseModel):
    # Omitidos usam exclude_unset=True; null explícito só onde o contrato permite.
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, value):
        if isinstance(value, dict):
            for key, item in value.items():
                if (
                    key in cls.model_fields
                    and item is None
                    and type(None) not in get_args(cls.model_fields[key].annotation)
                ):
                    raise ValueError("Campo não aceita null.")
        return value


class ErrorDetail(WireModel):
    field: str = Field(default=None)
    code: str = Field(default=None)
    message: str = Field(default=None)


class ErrorBody(WireModel):
    code: NonEmpty
    message: NonEmpty
    details: list[ErrorDetail]


class Error(WireModel):
    error: ErrorBody


class Health(WireModel):
    status: Literal["ok", "degraded", "unavailable"]
