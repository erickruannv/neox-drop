import json
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import timedelta
from unittest.mock import AsyncMock

import httpx


async def test_cache_revalidates_version_and_survives_invalidation_failure(
    catalog_app, monkeypatch
):
    app, collection, doc, _ = catalog_app
    payloads = {}
    cache = AsyncMock()
    cache.get.side_effect = lambda key: payloads.get(key)

    async def save(key, value, ex):
        assert ex == 300
        payloads[key] = value

    cache.set.side_effect = save
    cache.delete.side_effect = RuntimeError("test-only redis failure")

    @asynccontextmanager
    async def redis(settings):
        yield cache

    monkeypatch.setattr("app.services.catalog.redis_client", redis)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        first = await client.get(f"/api/products/{doc['slug']}")
        assert first.status_code == 200
        assert payloads, "Cache must be populated"
        calls = collection.find_one.await_count
        second = await client.get(f"/api/products/{doc['slug']}")
        assert second.json() == first.json()
        assert collection.find_one.await_count == calls + 1  # probe Mongo em cache hit
        changed = {
            **deepcopy(doc),
            "priceCents": 20000,
            "updatedAt": doc["updatedAt"] + timedelta(milliseconds=1),
        }
        from app.services.catalog import update_product

        collection.find_one_and_update.return_value = changed
        await update_product(collection, str(doc["_id"]), {"priceCents": 20000}, app.state.settings)
        cache.delete.assert_awaited_once()
        collection.find_one.return_value = changed
        third = await client.get(f"/api/products/{doc['slug']}")
        assert third.json()["priceCents"] == 20000
        collection.find_one.return_value = None
        assert (await client.get(f"/api/products/{doc['slug']}")).status_code == 404


async def test_corrupt_cache_and_redis_failure_fall_back(catalog_app, monkeypatch):
    app, collection, doc, _ = catalog_app
    cache = AsyncMock()
    cache.get.return_value = json.dumps(
        {"version": doc["updatedAt"].isoformat(), "payload": {"active": False}}
    )

    @asynccontextmanager
    async def redis(settings):
        yield cache

    monkeypatch.setattr("app.services.catalog.redis_client", redis)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        assert (await client.get(f"/api/products/{doc['slug']}")).status_code == 200
        cache.get.side_effect = RuntimeError("secret://redis")
        response = await client.get(f"/api/products/{doc['slug']}")
        assert response.status_code == 200
        assert "secret" not in response.text


async def test_legacy_cached_credit_cannot_restore_unsafe_link(catalog_app, monkeypatch):
    from app.services.catalog import public_product

    app, collection, doc, _ = catalog_app
    payload = public_product(doc)
    payload["attributes"] = {"imageCredit": "Autor", "imageCreditUrl": "javascript:alert(1)"}
    cache = AsyncMock()
    cache.get.return_value = json.dumps(
        {"version": doc["updatedAt"].isoformat(), "payload": payload}
    )

    @asynccontextmanager
    async def redis(settings):
        yield cache

    monkeypatch.setattr("app.services.catalog.redis_client", redis)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get(f"/api/products/{doc['slug']}")
        assert response.status_code == 200
        assert response.json()["attributes"] == {"imageCredit": "Autor"}
        assert collection.find_one.await_count == 1


async def test_mutation_success_not_rolled_back_by_redis_failure(
    catalog_app, examples, monkeypatch
):
    from starlette.responses import Response

    from app.core.security import issue_csrf

    app, collection, _, _ = catalog_app
    cache = AsyncMock()
    cache.delete.side_effect = RuntimeError("test redis down")

    @asynccontextmanager
    async def redis(settings):
        yield cache

    monkeypatch.setattr("app.services.catalog.redis_client", redis)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        token = issue_csrf(app.state.settings, Response())
        client.cookies.set("neox_csrf", token, domain="test.local")
        response = await client.post(
            "/api/admin/products",
            json=examples["ProductCreate"],
            headers={
                "Origin": app.state.settings.allowed_origin,
                "X-CSRF-Token": token,
            },
        )
        assert response.status_code == 201
        cache.delete.assert_awaited_once()
        collection.insert_one.assert_awaited_once()
