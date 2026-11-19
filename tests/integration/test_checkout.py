from unittest.mock import AsyncMock

import httpx
from jsonschema import Draft202012Validator


async def test_checkout_http_revalidates_and_matches_contract(catalog_app, monkeypatch, contract):
    app, collection, doc, cursor = catalog_app
    cursor.to_list.return_value = [doc]
    monkeypatch.setattr("app.services.cart.store_contact", AsyncMock(return_value="1" * 8))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        page = await client.get(f"/tenis/{doc['slug']}")
        assert page.status_code == 200
        token = client.cookies.get("neox_csrf")
        assert token and token in page.text
        headers = {"Origin": app.state.settings.allowed_origin, "X-CSRF-Token": token}
        body = {
            "items": [{"productId": str(doc["_id"]), "sizeBR": 40, "quantity": 2, "priceCents": 1}],
            "totalCents": 1,
        }
        response = await client.post("/api/checkout", headers=headers, json=body)
        assert response.status_code == 200, response.text
        assert response.json()["totalCents"] == 31980
        Draft202012Validator(
            {"$ref": "#/components/schemas/CheckoutResponse", "components": contract["components"]}
        ).validate(response.json())
        body["items"] *= 51
        assert (await client.post("/api/checkout", headers=headers, json=body)).status_code == 422
        assert (await client.post("/api/checkout", json={})).status_code == 403
        collection.insert_one.assert_not_awaited()
        collection.find_one_and_update.assert_not_awaited()
