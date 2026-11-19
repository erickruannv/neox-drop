import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app
from app.schemas.auth import LoginRequest


def make_client(app):
    return AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://testserver"
    )


async def test_health_without_services_is_unavailable(contract):
    app = create_app(Settings(_env_file=None))
    async with make_client(app) as client:
        response = await client.get("/health")
        assert response.status_code == 503
        assert response.json() == {"status": "unavailable"}
        assert (await client.get("/docs")).status_code == 404
        assert (await client.get("/openapi.json")).status_code == 404
        assert (await client.get("/api/products")).status_code == 503
        assert set(app.openapi()["paths"]) <= set(contract["paths"])
        assert app.openapi()["paths"]["/health"]["get"]["operationId"] == "health"


@pytest.mark.parametrize(
    ("statuses", "code", "status"),
    [
        ({"supabase": True, "mongodb": True, "redis": True}, 200, "ok"),
        ({"supabase": True, "mongodb": True, "redis": False}, 200, "degraded"),
        ({"supabase": False, "mongodb": True, "redis": True}, 503, "unavailable"),
        ({"supabase": True, "mongodb": False, "redis": True}, 503, "unavailable"),
    ],
)
async def test_health_statuses(monkeypatch, statuses, code, status):
    async def check(_):
        return statuses

    monkeypatch.setattr("app.main.check_connections", check)
    async with make_client(create_app(Settings(_env_file=None))) as client:
        response = await client.get("/health")
        assert response.status_code == code
        assert response.json() == {"status": status}


async def test_errors_never_echo_input_or_exception(caplog):
    app = create_app(Settings(_env_file=None))

    @app.post("/test-validation")
    async def validate(body: LoginRequest):
        return {}

    @app.get("/test-error")
    async def error():
        raise RuntimeError("secret://do-not-expose")

    async with make_client(app) as client:
        response = await client.post("/test-validation", json={"password": "sensitive-password"})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
        assert "sensitive-password" not in response.text
        response = await client.post(
            "/test-validation", content="{bad-json", headers={"content-type": "application/json"}
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "BAD_REQUEST"
        response = await client.get("/test-error")
        assert response.status_code == 500
        assert "secret://" not in response.text
        assert set(response.json()["error"]) == {"code", "message", "details"}
        assert "sensitive-password" not in caplog.text
        assert "secret://" not in caplog.text


async def test_body_limit_counts_actual_bytes():
    app = create_app(Settings(_env_file=None, max_request_bytes=32))

    @app.post("/test-body")
    async def echo(body: dict):
        return body

    async def chunks():
        for chunk in [b'{"a":"', b"x" * 64, b'"}']:
            yield chunk

    async with make_client(app) as client:
        assert (await client.post("/test-body", json={"a": "short"})).status_code == 200
        response = await client.post("/test-body", content=chunks())
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "REQUEST_TOO_LARGE"


async def test_csrf_origin_and_cookie_required():
    from fastapi import Request

    from app.core.security import require_csrf

    app = create_app(Settings(_env_file=None, cookie_secret="test-only" * 8))

    @app.post("/test-csrf")
    async def protected(request: Request):
        require_csrf(request)
        return {}

    async with make_client(app) as client:
        response = await client.post("/test-csrf")
        assert response.status_code == 403
        from starlette.responses import Response

        from app.core.security import issue_csrf

        token = issue_csrf(app.state.settings, Response())
        client.cookies.set("neox_csrf", token)
        headers = {"origin": "https://foreign.invalid", "x-csrf-token": token}
        assert (await client.post("/test-csrf", headers=headers)).status_code == 403
        headers["origin"] = "http://127.0.0.1:8000"
        assert (await client.post("/test-csrf", headers=headers)).status_code == 200
        headers["x-csrf-token"] = "wrong"
        assert (await client.post("/test-csrf", headers=headers)).status_code == 403


async def test_rate_limit_window_and_forwarded_ip_ignored(monkeypatch):
    now = 0.0
    monkeypatch.setattr("app.core.security.monotonic", lambda: now)
    app = create_app(Settings(_env_file=None, rate_limit_requests=2))

    @app.get("/api/test-rate")
    async def endpoint():
        return {}

    async with make_client(app) as client:
        assert (await client.get("/api/test-rate")).status_code == 200
        assert (await client.get("/api/test-rate")).status_code == 200
        response = await client.get("/api/test-rate", headers={"x-forwarded-for": "1.2.3.4"})
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "RATE_LIMITED"
        now = 61.0
        assert (await client.get("/api/test-rate")).status_code == 200


async def test_login_has_separate_stricter_limit():
    from fastapi import FastAPI

    from app.core.security import RateLimitMiddleware

    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware, settings=Settings(_env_file=None, login_rate_limit_requests=1)
    )

    @app.post("/api/admin/auth/login")
    async def endpoint():
        return {}

    async with make_client(app) as client:
        assert (await client.post("/api/admin/auth/login")).status_code == 200
        assert (await client.post("/api/admin/auth/login")).status_code == 429


async def test_non_ascii_csrf_is_rejected_safely():
    from fastapi import Request

    from app.core.security import require_csrf

    app = create_app(Settings(_env_file=None))

    @app.post("/test-csrf")
    async def protected(request: Request):
        require_csrf(request)
        return {}

    async with make_client(app) as client:
        response = await client.post(
            "/test-csrf",
            headers=[
                (b"origin", b"http://127.0.0.1:8000"),
                (b"cookie", b"neox_csrf=test-random-token"),
                (b"x-csrf-token", b"\xe9"),
            ],
        )
        assert response.status_code == 403
