from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from starlette.responses import Response

from app.core.security import issue_csrf


@pytest.mark.parametrize("prefix", ["", "NEOX QA:"])
async def test_visit_atomic_script_and_safe_visitor_cookie(catalog_app, monkeypatch, prefix):
    app, collection, doc, _ = catalog_app
    app.state.settings = app.state.settings.model_copy(update={"redis_key_prefix": prefix})
    redis = AsyncMock()

    @asynccontextmanager
    async def connection(settings):
        yield redis

    monkeypatch.setattr("app.services.recent.redis_client", connection)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        token = issue_csrf(app.state.settings, Response())
        client.cookies.set("neox_csrf", token, domain="test.local")
        response = await client.post(
            "/api/recent",
            json={"productId": str(doc["_id"]).upper()},
            headers={
                "Origin": app.state.settings.allowed_origin,
                "X-CSRF-Token": token,
            },
        )
        assert response.status_code == 204 and not response.content
        visitor = client.cookies.get("neox_visitor")
        assert visitor and len(visitor) == 32
        assert "HttpOnly" in response.headers["set-cookie"]
        call = redis.eval.call_args
        assert all(command in call.args[0] for command in ("LREM", "LPUSH", "LTRIM", "EXPIRE"))
        assert call.kwargs["keys"] == [f"{prefix}recent:visitor:{visitor}"]
        assert call.kwargs["args"] == [str(doc["_id"]), "604800", "4"]


@pytest.mark.parametrize("prefix", ["", "NEOX QA:"])
async def test_recent_get_resolves_current_active_products_without_writing(
    catalog_app, monkeypatch, prefix
):
    app, collection, doc, cursor = catalog_app
    app.state.settings = app.state.settings.model_copy(update={"redis_key_prefix": prefix})
    redis = AsyncMock()
    redis.lrange.return_value = [str(doc["_id"]), "bad", str(doc["_id"])]
    cursor.to_list.return_value = [doc]

    @asynccontextmanager
    async def connection(settings):
        yield redis

    client_db = MagicMock()
    client_db.__getitem__.return_value.__getitem__.return_value = collection

    @asynccontextmanager
    async def mongo(settings):
        yield client_db

    monkeypatch.setattr("app.services.recent.redis_client", connection)
    monkeypatch.setattr("app.api.recent.mongodb_client", mongo)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        client.cookies.set("neox_visitor", "a" * 32, domain="test.local")
        response = await client.get("/api/recent")
        assert response.status_code == 200
        assert [item["id"] for item in response.json()["items"]] == [str(doc["_id"])]
        assert "sizes" not in response.json()["items"][0]
        redis.lrange.assert_awaited_once_with(f"{prefix}recent:visitor:{'a' * 32}", 0, 4)
        redis.eval.assert_not_awaited()
        redis.expire.assert_not_awaited()
        redis.lrange.side_effect = RuntimeError("secret://redis")
        assert (await client.get("/api/recent")).json() == {"items": []}


async def test_recent_missing_cookie_and_redis_failure(catalog_app, monkeypatch):
    app, collection, doc, _ = catalog_app

    @asynccontextmanager
    async def failure(settings):
        raise RuntimeError("secret://redis")
        yield

    monkeypatch.setattr("app.services.recent.redis_client", failure)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/recent")).json() == {"items": []}
        token = issue_csrf(app.state.settings, Response())
        client.cookies.set("neox_csrf", token, domain="test.local")
        headers = {"Origin": app.state.settings.allowed_origin, "X-CSRF-Token": token}
        response = await client.post(
            "/api/recent", headers=headers, json={"productId": str(doc["_id"])}
        )
        assert response.status_code == 204
        collection.find_one.return_value = None
        response = await client.post(
            "/api/recent", headers=headers, json={"productId": str(doc["_id"])}
        )
        assert response.status_code == 404


@pytest.mark.parametrize("path", ["/api/products", "/tenis"])
async def test_search_is_remembered_per_visitor_normalized_and_capped(
    catalog_app, monkeypatch, path
):
    app, _, _, _ = catalog_app
    redis = AsyncMock()

    @asynccontextmanager
    async def connection(settings):
        yield redis

    monkeypatch.setattr("app.services.recent.redis_client", connection)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get(path, params={"q": "  Air   MAX  "})
        assert response.status_code == 200
        visitor = client.cookies.get("neox_visitor")
        assert visitor and len(visitor) == 32
        call = redis.eval.call_args
        assert call.kwargs["keys"] == [f"searches:visitor:{visitor}"]
        assert call.kwargs["args"] == ["air max", "604800", "2"]
        # sem termo não grava nem cria cookie novo
        redis.eval.reset_mock()
        await client.get(path)
        await client.get(path, params={"q": "   "})
        redis.eval.assert_not_awaited()


async def test_recent_searches_reads_three_and_degrades_to_empty(catalog_app, monkeypatch):
    app, _, _, _ = catalog_app
    redis = AsyncMock()
    redis.lrange.return_value = ["nike", "samba", 7]

    @asynccontextmanager
    async def connection(settings):
        yield redis

    monkeypatch.setattr("app.services.recent.redis_client", connection)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/recent/searches")).json() == {"items": []}
        redis.lrange.assert_not_awaited()  # sem cookie válido não consulta o Redis
        client.cookies.set("neox_visitor", "b" * 32, domain="test.local")
        assert (await client.get("/api/recent/searches")).json() == {"items": ["nike", "samba"]}
        redis.lrange.assert_awaited_once_with(f"searches:visitor:{'b' * 32}", 0, 2)
        redis.lrange.side_effect = RuntimeError("secret://redis")
        assert (await client.get("/api/recent/searches")).json() == {"items": []}
