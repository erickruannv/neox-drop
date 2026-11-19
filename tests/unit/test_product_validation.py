from copy import deepcopy

import pytest

from app.core.config import Settings
from app.core.exceptions import ApiFault
from app.services.catalog import merge_patch, public_product, validate_product


@pytest.mark.parametrize(
    "patch",
    [
        {"priceCents": -1},
        {"priceCents": 1.5},
        {"sizes": [{"sizeBR": 40, "stock": 1}, {"sizeBR": 40, "stock": 2}]},
        {"mainImageUrl": "https://unapproved.invalid/shoe.webp"},
        {"mainImageUrl": "/static/../.env"},
        {"mainImageUrl": "/static/%2e%2e/.env"},
        {"attributes": {"$where": "danger"}},
        {"name": "   "},
        {"sizes": [{"sizeBR": 40, "stock": 2**64}]},
    ],
)
def test_product_business_validation(examples, patch):
    payload = deepcopy(examples["ProductCreate"])
    payload.update(patch)
    with pytest.raises(ApiFault) as error:
        validate_product(payload, Settings(_env_file=None))
    assert error.value.status == 422


def test_patch_merges_featured_replaces_arrays_removes_model(examples):
    original = deepcopy(examples["ProductCreate"])
    original["featured"] = {
        "enabled": True,
        "order": 1,
        "backgroundHex": "#000000",
        "accentHex": "#ffffff",
    }
    original["model3dUrl"] = "/static/models/test.glb"
    result = merge_patch(
        original,
        {
            "featured": {"enabled": False},
            "sizes": [{"sizeBR": 41, "stock": 2}],
            "model3dUrl": None,
        },
    )
    assert result["featured"] == {**original["featured"], "enabled": False}
    assert result["sizes"] == [{"sizeBR": 41, "stock": 2}]
    assert "model3dUrl" not in result
    assert original["featured"]["enabled"] is True


def test_public_projection_never_has_raw_stock_or_bson(examples):
    from bson import ObjectId

    doc = deepcopy(examples["ProductCreate"])
    doc["_id"] = ObjectId()
    doc["sizes"] = [{"sizeBR": 39, "stock": 0}, {"sizeBR": 40, "stock": 6}]
    public = public_product(doc)
    assert public["sizesAvailable"] == [40]
    assert "sizes" not in public and "stock" not in str(public)
    assert "_id" not in public and public["id"] == str(doc["_id"])
