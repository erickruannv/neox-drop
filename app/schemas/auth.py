from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, Field, StrictBool, StrictStr

from app.schemas.common import NonEmpty, WireModel


def require_true(value):
    if value is not True:
        raise ValueError("Valor deve ser true.")
    return value


class AdminProfile(WireModel):
    userId: UUID
    displayName: NonEmpty
    role: Literal["admin"]
    isActive: Annotated[StrictBool, AfterValidator(require_true)]


class LoginRequest(WireModel):
    email: Annotated[
        StrictStr, Field(pattern=r"^[^\s@]+@[^\s@]+$", json_schema_extra={"format": "email"})
    ]
    password: NonEmpty = Field(min_length=1, repr=False, json_schema_extra={"writeOnly": True})
