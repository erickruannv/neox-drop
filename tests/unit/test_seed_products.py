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
