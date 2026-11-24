from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable
from app.db.health import check_connections
from app.db.mongodb import mongodb_client
from app.db.redis import redis_client
from app.db.supabase import supabase_client


async def test_adapters_block_network_without_test_opt_in():
    settings = Settings(_env_file=None)
    for factory in (mongodb_client, redis_client, supabase_client):
        with pytest.raises(ServiceUnavailable):
            async with factory(settings):
                pytest.fail("Unconfigured adapter must not open")
    assert await check_connections(settings) == {
        "supabase": False,
        "mongodb": False,
        "redis": False,
    }


async def test_mongodb_client_reused_across_requests(monkeypatch):
    client = MagicMock(close=AsyncMock())
    factory = MagicMock(return_value=client)
    monkeypatch.setattr("app.db.mongodb.AsyncMongoClient", factory)
    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        mongodb_uri="mongodb://localhost:27017",
        request_timeout_seconds=2,
    )
    with pytest.raises(RuntimeError):
        async with mongodb_client(settings) as actual:
            assert actual is client
            raise RuntimeError("query failed")
    async with mongodb_client(settings) as again:
        assert again is client
    factory.assert_called_once()
    client.close.assert_not_awaited()
    assert factory.call_args.kwargs["serverSelectionTimeoutMS"] == 2000
    assert factory.call_args.kwargs["timeoutMS"] == 2000


async def test_supabase_auth_state_isolated_per_request(monkeypatch):
    requests = []

    async def handle(request):
        requests.append(request)
        return httpx.Response(200, json={})

    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        supabase_url="http://localhost:54321",
        supabase_key="test-not-a-credential",
    )
    transport = httpx.MockTransport(handle)
    from functools import partial

    monkeypatch.setattr(
        "app.db.supabase.AsyncClient", partial(httpx.AsyncClient, transport=transport)
    )
    async with supabase_client(settings) as first:
        async with supabase_client(settings) as second:
            assert first is not second
            assert first.auth is not second.auth
            assert first.options.auto_refresh_token is False
            assert first.options.persist_session is False
    assert not requests  # Creating SDKs must not contact Auth or start refresh.


async def test_redis_cleanup_and_disabled_telemetry(monkeypatch):
    client = MagicMock(close=AsyncMock())
    factory = MagicMock(return_value=client)
    monkeypatch.setattr("app.db.redis.Redis", factory)
    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        upstash_redis_rest_url="https://redis.example.invalid",
        upstash_redis_rest_token="test-not-a-credential",
    )
    async with redis_client(settings) as actual:
        assert actual is client
    client.close.assert_awaited_once()
    assert factory.call_args.kwargs["allow_telemetry"] is False
    assert factory.call_args.kwargs["rest_retries"] == 0


async def test_checks_timeout_and_redact_failures(monkeypatch, caplog):
    async def fail(settings):
        raise RuntimeError("secret://test-password")

    async def ok(settings):
        return True

    monkeypatch.setattr("app.db.health.check_supabase", fail)
    monkeypatch.setattr("app.db.health.check_mongodb", ok)
    monkeypatch.setattr("app.db.health.check_redis", ok)
    settings = Settings(_env_file=None, app_env="test", test_connections_enabled=True)
    assert await check_connections(settings) == {
        "supabase": False,
        "mongodb": True,
        "redis": True,
    }
    assert "test-password" not in caplog.text


async def test_primary_probe_deadline(monkeypatch):
    import asyncio

    async def hangs(settings):
        await asyncio.Event().wait()

    async def ok(settings):
        return True

    monkeypatch.setattr("app.db.health.check_supabase", hangs)
    monkeypatch.setattr("app.db.health.check_mongodb", ok)
    monkeypatch.setattr("app.db.health.check_redis", ok)
    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        request_timeout_seconds=0.01,
    )
    assert await check_connections(settings) == {
        "supabase": False,
        "mongodb": True,
        "redis": True,
    }


async def test_redis_adapter_enforces_deadline_and_closes(monkeypatch):
    import asyncio

    client = MagicMock(close=AsyncMock())
    monkeypatch.setattr("app.db.redis.Redis", MagicMock(return_value=client))
    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        upstash_redis_rest_url="https://redis.example.invalid",
        upstash_redis_rest_token="test-not-a-credential",
        redis_timeout_seconds=0.01,
    )
    async with asyncio.timeout(0.1):
        with pytest.raises(TimeoutError):
            async with redis_client(settings):
                await asyncio.Event().wait()
    client.close.assert_awaited_once()


def test_connection_script_refuses_without_opt_in(monkeypatch, capsys):
    from scripts.check_connections import main

    monkeypatch.setattr("scripts.check_connections.Settings", lambda: Settings(_env_file=None))
    assert main() == 2
    assert "Recusado" in capsys.readouterr().out


async def test_supabase_health_uses_no_private_table(monkeypatch):
    from functools import partial

    from app.db.supabase import check_supabase

    paths = []

    async def handle(request):
        paths.append(request.url.path)
        assert "store_settings" not in request.url.path
        return httpx.Response(200, json={})

    monkeypatch.setattr(
        "app.db.supabase.AsyncClient",
        partial(
            httpx.AsyncClient,
            transport=httpx.MockTransport(handle),
        ),
    )
    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        supabase_url="http://localhost:54321",
        supabase_key="test-public-key",
    )
    assert await check_supabase(settings) is True
    assert paths == ["/auth/v1/health", "/auth/v1/settings"]


async def test_store_contact_uses_only_server_key_and_no_public_fallback(monkeypatch):
    from functools import partial

    from app.db.supabase import store_contact

    seen = []

    async def handle(request):
        assert request.url.path == "/rest/v1/store_settings"
        assert request.headers["apikey"] == "sb_secret_test-not-real"
        assert "sb_secret" not in str(request.url)
        assert request.url.params["id"] == "eq.1"
        seen.append(True)
        return httpx.Response(200, json=[{"whatsapp_e164_digits": ""}])

    monkeypatch.setattr(
        "app.db.supabase.AsyncClient",
        partial(
            httpx.AsyncClient,
            transport=httpx.MockTransport(handle),
        ),
    )
    settings = Settings(
        _env_file=None,
        app_env="test",
        test_connections_enabled=True,
        supabase_url="http://localhost:54321",
        supabase_key="public-test",
    )
    assert await store_contact(settings) == ""
    assert not seen
    settings = Settings(
        **{**settings.model_dump(), "supabase_secret_key": "sb_secret_test-not-real"},
        _env_file=None,
    )
    assert await store_contact(settings) == ""
    assert seen
