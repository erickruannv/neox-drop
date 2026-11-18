from copy import deepcopy

import pytest
from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate
from pydantic import ValidationError

from app.schemas import auth, checkout, common, product

MODELS = {
    name: getattr(module, name)
    for module in (auth, checkout, common, product)
    for name in dir(module)
    if isinstance(getattr(module, name), type) and hasattr(getattr(module, name), "model_validate")
}


def validator(contract, name):
    return Draft202012Validator(
        {"$ref": f"#/components/schemas/{name}", "components": contract["components"]},
        format_checker=FormatChecker(),
    )


def test_approved_contract_is_valid(contract):
    validate(contract)
    assert set(contract["components"]["schemas"]) - {"ProductId"} <= MODELS.keys()


def test_all_canonical_examples_roundtrip(contract, examples):
    for name, payload in examples.items():
        validator(contract, name).validate(payload)
        result = MODELS[name].model_validate(payload).model_dump(mode="json", exclude_unset=True)
        assert result == payload, name
        validator(contract, name).validate(result)


@pytest.mark.parametrize(
    ("name", "patch"),
    [
        ("ProductCreate", {"priceCents": -1}),
        ("ProductCreate", {"priceCents": 1.5}),
        ("ProductCreate", {"priceCents": True}),
        ("ProductCreate", {"id": "64aabbccddeeff0011223344"}),
        ("ProductCreate", {"sizes": []}),
        ("ProductCreate", {"mainImageUrl": "javascript:alert(1)"}),
        ("ProductCreate", {"model3dUrl": None}),
        ("ProductPatch", {}),
        ("ProductPatch", {"name": None}),
        ("ProductPatch", {"featured": {}}),
        ("ProductSummary", {"active": False}),
        ("ProductSummary", {"sizesAvailable": [40, 40]}),
        ("ProductSummary", {"sizes": [{"sizeBR": 40, "stock": 1}]}),
        ("AdminProfile", {"isActive": False}),
        ("AdminProfile", {"role": "buyer"}),
        ("LoginRequest", {"password": ""}),
        ("LoginRequest", {"email": "invalid"}),
        ("RecentRequest", {"productId": {"$gt": ""}}),
        ("CheckoutRequest", {"items": []}),
    ],
)
def test_invalid_wire_payloads_rejected(contract, examples, name, patch):
    payload = deepcopy(examples[name])
    if name == "ProductPatch":
        payload = patch
    else:
        payload.update(patch)
    assert not validator(contract, name).is_valid(payload)
    with pytest.raises(ValidationError):
        MODELS[name].model_validate(payload)


def test_partial_patch_and_explicit_model_removal():
    payload = {"featured": {"enabled": False}, "model3dUrl": None}
    assert product.ProductPatch.model_validate(payload).model_dump(exclude_unset=True) == payload


def test_checkout_discards_untrusted_extras(examples):
    payload = deepcopy(examples["CheckoutRequest"])
    payload["priceCents"] = 1
    payload["items"][0]["unitPriceCents"] = 1
    assert (
        checkout.CheckoutRequest.model_validate(payload).model_dump() == examples["CheckoutRequest"]
    )


def test_login_password_not_in_repr(examples):
    model = auth.LoginRequest.model_validate(examples["LoginRequest"])
    assert examples["LoginRequest"]["password"] not in repr(model)


@pytest.mark.parametrize(
    "url", ["javascript:alert(1)", "https://evil.invalid/", "https://wa.me/1?text=x"]
)
def test_checkout_response_rejects_invalid_destinations(url):
    with pytest.raises(ValidationError):
        checkout.CheckoutResponse.model_validate(
            {
                "items": [
                    {
                        "productId": "64aabbccddeeff0011223344",
                        "name": "Demonstração",
                        "sizeBR": 40,
                        "quantity": 1,
                        "unitPriceCents": 100,
                        "lineTotalCents": 100,
                    }
                ],
                "totalCents": 100,
                "currency": "BRL",
                "waUrl": url,
            }
        )
