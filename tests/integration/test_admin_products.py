from copy import deepcopy

import httpx
import pytest
from jsonschema import Draft202012Validator
from pymongo.errors import DuplicateKeyError
from starlette.responses import Response

from app.core.config import Settings
from app.core.security import issue_csrf
from app.main import create_app


def csrf(client, app):
    token = issue_csrf(app.state.settings, Response())
    client.cookies.set("neox_csrf", token, domain="test.local")
    return {"Origin": app.state.settings.allowed_origin, "X-CSRF-Token": token}


def validate_response(contract, name, response):
    Draft202012Validator(
        {"$ref": f"#/components/schemas/{name}", "components": contract["components"]}
    ).validate(response.json())


async def test_create_schema_and_conflict(catalog_app, examples, contract):
    app, collection, _, _ = catalog_app
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        headers = csrf(client, app)
        result = await client.post(
            "/api/admin/products", headers=headers, json=examples["ProductCreate"]
        )
        assert result.status_code == 201, result.text
        validate_response(contract, "AdminProduct", result)
        assert result.json()["priceCents"] == 15990
        collection.insert_one.side_effect = DuplicateKeyError("duplicate secret details")
        result = await client.post(
            "/api/admin/products", headers=headers, json=examples["ProductCreate"]
        )
        assert result.status_code == 409
        assert "secret" not in result.text


async def test_patch_merge_and_soft_delete(catalog_app, contract):
    app, collection, doc, _ = catalog_app
    doc["featured"] = {
        "enabled": True,
        "order": 1,
        "backgroundHex": "#000000",
        "accentHex": "#ffffff",
    }
    doc["model3dUrl"] = "/static/models/demo.glb"

    async def update(query, change, **kwargs):
        assert query["updatedAt"] == doc["updatedAt"]
        merged = {**doc, **change["$set"]}
        for key in change.get("$unset", {}):
            merged.pop(key, None)
        return merged

    collection.find_one_and_update.side_effect = update
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        headers = csrf(client, app)
        result = await client.patch(
            f"/api/admin/products/{doc['_id']}",
            headers=headers,
            json={
                "featured": {"enabled": False},
                "model3dUrl": None,
                "priceCents": 17000,
            },
        )
        assert result.status_code == 200, result.text
        validate_response(contract, "AdminProduct", result)
        assert result.json()["featured"]["order"] == 1
        assert result.json()["featured"]["enabled"] is False
        assert "model3dUrl" not in result.json()
        assert result.json()["updatedAt"] > doc["updatedAt"].isoformat()
        result = await client.delete(f"/api/admin/products/{doc['_id']}", headers=headers)
        assert result.status_code == 204 and not result.content
        assert collection.find_one_and_update.call_args.args[1]["$set"]["active"] is False


async def test_concurrent_patch_conflicts(catalog_app):
    app, collection, doc, _ = catalog_app
    collection.find_one_and_update.return_value = None
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        result = await client.patch(
            f"/api/admin/products/{doc['_id']}", headers=csrf(client, app), json={"priceCents": 100}
        )
        assert result.status_code == 409


async def test_admin_denies_missing_session_before_database():
    app = create_app(Settings(_env_file=None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/admin/products")).status_code == 401
        assert (await client.post("/api/admin/products", json={})).status_code == 401


@pytest.mark.parametrize(
    "change",
    [
        {"priceCents": True},
        {"priceCents": 1.5},
        {"id": "64aabbccddeeff0011223344"},
        {"createdAt": "2026-11-19T00:00:00Z"},
        {"attributes": {"nested": {"$gt": 1}}},
        {"sizes": [{"sizeBR": 40, "stock": 1}, {"sizeBR": 40, "stock": 5}]},
        {"mainImageUrl": "https://untrusted.invalid/shoe.webp"},
    ],
)
async def test_invalid_create_never_writes(catalog_app, examples, change):
    app, collection, _, _ = catalog_app
    body = {**deepcopy(examples["ProductCreate"]), **change}
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.post("/api/admin/products", headers=csrf(client, app), json=body)
        assert response.status_code == 422
        collection.insert_one.assert_not_awaited()


async def test_admin_listing_and_not_found(catalog_app, contract):
    app, collection, doc, cursor = catalog_app
    cursor.to_list.return_value = [doc]
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get("/api/admin/products")
        assert response.status_code == 200, response.text
        validate_response(contract, "AdminProductList", response)
        assert response.json()["items"][0]["sizes"][0]["stock"] == 3
        assert (await client.get("/api/admin/products?limit=25")).status_code == 422
        headers = csrf(client, app)
        response = await client.patch(
            "/api/admin/products/invalid", headers=headers, json={"active": False}
        )
        assert response.status_code == 422
        collection.find_one.return_value = None
        response = await client.patch(
            f"/api/admin/products/{doc['_id']}", headers=headers, json={"active": False}
        )
        assert response.status_code == 404
