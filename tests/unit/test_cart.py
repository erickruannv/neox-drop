from copy import deepcopy
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from app.core.config import Settings
from app.core.exceptions import ApiFault
from app.services.cart import checkout_summary


@pytest.fixture
def cart_data(examples):
    first = {**deepcopy(examples["ProductCreate"]), "_id": ObjectId()}
    second = {**deepcopy(examples["ProductCreate"]), "_id": ObjectId(), "priceCents": 8990}
    cursor = MagicMock(to_list=AsyncMock(return_value=[first, second]))
    collection = MagicMock()
    collection.find.return_value = cursor
    items = [
        {"productId": str(first["_id"]), "sizeBR": 40, "quantity": 2},
        {"productId": str(second["_id"]), "sizeBR": 40, "quantity": 1},
    ]
    return collection, items, first


async def test_cents_revalidated_and_encoded_link_without_writes(cart_data, monkeypatch):
    from urllib.parse import parse_qs, urlsplit

    collection, items, first = cart_data
    contact = AsyncMock(return_value="1" * 8)
    monkeypatch.setattr("app.services.cart.store_contact", contact)
    items[0]["priceCents"] = 1
    result = await checkout_summary(collection, {"items": items}, Settings(_env_file=None))
    assert result["totalCents"] == 40970
    assert result["items"][0]["unitPriceCents"] == 15990
    text = parse_qs(urlsplit(result["waUrl"]).query)["text"][0]
    assert "409,70" in text and "gostaria de pedir" in text
    assert "Solicitação" in text
    assert collection.method_calls[0][0] == "find"
    assert len(collection.method_calls) == 1


@pytest.mark.parametrize("change", ["duplicate-over-limit", "stock", "inactive", "size"])
async def test_unavailable_cart_rejected(cart_data, monkeypatch, change):
    collection, items, first = cart_data
    if change == "duplicate-over-limit":
        items.extend([{**items[0], "quantity": 10}])
    elif change == "stock":
        first["sizes"] = [{"sizeBR": 40, "stock": 0}]
    elif change == "inactive":
        first["active"] = False
    else:
        items[0]["sizeBR"] = 60
    with pytest.raises(ApiFault) as error:
        await checkout_summary(collection, {"items": items}, Settings(_env_file=None))
    assert error.value.status == 422


async def test_missing_contact_and_message_limit(cart_data, monkeypatch):
    collection, items, first = cart_data
    monkeypatch.setattr("app.services.cart.store_contact", AsyncMock(return_value=""))
    with pytest.raises(ApiFault) as error:
        await checkout_summary(collection, {"items": items}, Settings(_env_file=None))
    assert error.value.code == "STORE_WHATSAPP_NOT_CONFIGURED"
    monkeypatch.setattr("app.services.cart.store_contact", AsyncMock(return_value="1" * 8))
    first["name"] = "x" * 8001
    with pytest.raises(ApiFault) as error:
        await checkout_summary(collection, {"items": items}, Settings(_env_file=None))
    assert error.value.code == "CHECKOUT_LIMIT_EXCEEDED"


async def test_bson_int64_roundtrip_is_valid_money_and_stock(cart_data, monkeypatch):
    from bson import BSON, Int64

    collection, items, first = cart_data
    first["priceCents"] = Int64(2**31)
    first["sizes"][1]["stock"] = Int64(6)
    decoded = BSON.encode(first).decode()
    assert isinstance(decoded["priceCents"], Int64)
    collection.find.return_value.to_list.return_value = [decoded]
    monkeypatch.setattr("app.services.cart.store_contact", AsyncMock(return_value="1" * 8))
    result = await checkout_summary(collection, {"items": items[:1]}, Settings(_env_file=None))
    assert result["totalCents"] == 2 * 2**31


async def test_message_limit_counts_characters_before_url_encoding(cart_data, monkeypatch):
    collection, items, first = cart_data
    first["name"] = "ç" * 1400
    monkeypatch.setattr("app.services.cart.store_contact", AsyncMock(return_value="1" * 8))
    result = await checkout_summary(collection, {"items": items}, Settings(_env_file=None))
    assert result["totalCents"] == 40970
