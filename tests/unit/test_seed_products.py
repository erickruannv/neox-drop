from unittest.mock import AsyncMock

import pytest

from scripts.seed_products import initialize, seed_document


def test_seed_document_uses_integer_cents_and_bson_dates():
    from datetime import datetime

    doc = seed_document()
    assert type(doc["priceCents"]) is int
    assert isinstance(doc["createdAt"], datetime)
    assert doc["sku"].startswith("NEOX-DEMO-")


async def test_initialize_creates_strict_collection_and_indexes():
    from unittest.mock import MagicMock

    collection = MagicMock(create_index=AsyncMock())
    db = MagicMock(list_collection_names=AsyncMock(return_value=[]), create_collection=AsyncMock())
    db.__getitem__.return_value = collection
    await initialize(db)
    assert db.create_collection.call_args.kwargs["validationAction"] == "error"
    assert db.create_collection.call_args.kwargs["validationLevel"] == "strict"
    assert collection.create_index.await_count >= 6


async def test_initialize_refuses_existing_collection():
    from unittest.mock import MagicMock

    db = MagicMock(list_collection_names=AsyncMock(return_value=["products"]))
    with pytest.raises(ValueError):
        await initialize(db)


@pytest.mark.parametrize(
    "change", [None, "missing_index", "wrong_key", "partial_index", "validator"]
)
async def test_verify_schema_is_read_only_and_rejects_drift(change):
    import json
    from unittest.mock import MagicMock

    from scripts.seed_products import ROOT, verify

    config = json.loads((ROOT / "mongo/products_schema.json").read_text())
    indexes = {i["name"]: {**i, "key": list(i["key"].items())} for i in config["indexes"]}
    options = {
        "validator": config["validator"],
        "validationLevel": "strict",
        "validationAction": "error",
    }
    if change == "missing_index":
        del indexes["uniq_sku"]
    if change == "wrong_key":
        indexes["uniq_sku"]["key"] = [("name", 1)]
    if change == "partial_index":
        indexes["uniq_sku"]["partialFilterExpression"] = {"active": True}
    if change == "validator":
        options["validationAction"] = "warn"
    collection = MagicMock(
        options=AsyncMock(return_value=options), index_information=AsyncMock(return_value=indexes)
    )
    db = MagicMock()
    db.__getitem__.return_value = collection
    if change:
        with pytest.raises(ValueError):
            await verify(db)
    else:
        await verify(db)
    db.create_collection.assert_not_called()
    collection.create_index.assert_not_called()
    collection.update_one.assert_not_called()
