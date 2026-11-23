from copy import deepcopy

import pytest

from app.core.config import Settings
from app.core.exceptions import ApiFault
from app.services.catalog import merge_patch, public_product, validate_product


@pytest.mark.parametrize(
    "patch",
    [
        {"mainImageUrl": "https://["},
        {"attributes": {"weight": 2**64}},
        {"attributes": {"weight": float("nan")}},
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


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "https://user:password@example.org/source",
        "http://example.org/source",
    ],
)
def test_credit_links_reject_unsafe_urls(examples, url):
    payload = deepcopy(examples["ProductCreate"])
    payload["attributes"] = {"imageCredit": "Autor", "imageCreditUrl": url}
    with pytest.raises(ApiFault):
        validate_product(payload, Settings(_env_file=None))


def test_public_projection_removes_unsafe_legacy_credit_link(examples):
    from bson import ObjectId

    doc = {
        **deepcopy(examples["ProductCreate"]),
        "_id": ObjectId(),
        "attributes": {"imageCredit": "Autor", "imageCreditUrl": "javascript:alert(1)"},
    }
    public = public_product(doc)
    assert public["attributes"] == {"imageCredit": "Autor"}
    assert "imageCreditUrl" in doc["attributes"]


@pytest.mark.parametrize("suffix", ["/embed?autostart=1", "/download", "/embed/extra"])
def test_sketchfab_model_requires_canonical_embed(examples, suffix):
    payload = deepcopy(examples["ProductCreate"])
    payload["model3dUrl"] = "https://sketchfab.com/models/" + "a" * 32 + suffix
    with pytest.raises(ApiFault):
        validate_product(
            payload, Settings(_env_file=None, media_allowed_origins=["https://sketchfab.com"])
        )


def test_brand_category_filters_ignore_case_but_escape_regex():
    import re

    from app.schemas.product import PublicFilters
    from app.services.catalog import catalog_filter

    query = catalog_filter(PublicFilters(brand="adidas", category="Classics"), True)
    assert re.fullmatch(query["brand"]["$regex"], "Adidas", re.IGNORECASE)
    assert query["brand"]["$options"] == "i"
    assert re.fullmatch(query["category"]["$regex"], "classics", re.IGNORECASE)
    escaped = catalog_filter(PublicFilters(brand="ni.*ke"), True)["brand"]["$regex"]
    assert not re.fullmatch(escaped, "Nike", re.IGNORECASE)
    assert not re.fullmatch(query["brand"]["$regex"], "adidas Originals", re.IGNORECASE)
