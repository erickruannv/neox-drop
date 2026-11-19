from functools import partial

import httpx
import pytest

from app.core.config import Settings
from app.core.security import issue_csrf
from app.main import create_app

UID = "00000000-0000-4000-8000-000000000001"
USER = {
    "id": UID,
    "aud": "authenticated",
    "app_metadata": {},
    "user_metadata": {},
    "created_at": "2026-11-19T00:00:00Z",
}
PROFILE = {"user_id": UID, "display_name": "Teste", "role": "admin", "is_active": True}


@pytest.fixture
def auth_app(monkeypatch):
    state = {"profile": dict(PROFILE), "invalid": False, "revoked": False, "requests": []}

    async def handle(request):
        state["requests"].append(
            (request.method, request.url.path, request.headers.get("authorization"))
        )
        path = request.url.path
        if path.endswith("/token"):
            if state["invalid"]:
                return httpx.Response(
                    400, json={"error_code": "invalid_credentials", "msg": "secret"}
                )
            return httpx.Response(
                200,
                json={
                    "access_token": "access-test-only",
                    "refresh_token": (
                        "refresh-rotated"
                        if request.url.params.get("grant_type") == "refresh_token"
                        else "refresh-test-only"
                    ),
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "user": USER,
                },
            )
        if path.endswith("/user"):
            return httpx.Response(200, json=USER)
        if path.endswith("/logout"):
            state["revoked"] = True
            return httpx.Response(204)
        if path.endswith("/admin_profiles"):
            assert request.headers["authorization"] == "Bearer access-test-only"
            assert request.url.params["user_id"] == "eq." + UID
            return httpx.Response(200, json=[] if state["revoked"] else [state["profile"]])
        raise AssertionError(f"Unexpected SDK request {path}")

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
        cookie_secret="test-only-" * 8,
    )
    return create_app(settings), state


def seed_csrf(client, app, session=""):
    from starlette.responses import Response

    response = Response()
    token = issue_csrf(app.state.settings, response, session)
    client.cookies.set("neox_csrf", token, domain="test.local", path="/")
    return {"Origin": app.state.settings.allowed_origin, "X-CSRF-Token": token}


async def test_login_me_logout_and_revoked_jwt(auth_app, contract):
    app, state = auth_app
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        headers = seed_csrf(client, app)
        result = await client.post(
            "/api/admin/auth/login",
            headers=headers,
            json={
                "email": "admin@example.invalid",
                "password": "test-not-real",
            },
        )
        assert result.status_code == 200, result.text
        assert result.json() == {
            "userId": UID,
            "displayName": "Teste",
            "role": "admin",
            "isActive": True,
        }
        assert "access-test-only" not in result.text
        cookies = result.headers.get_list("set-cookie")
        assert all("HttpOnly" in c and "SameSite=lax" in c for c in cookies)
        assert client.cookies.get("neox_admin_session") == "access-test-only"
        assert any("neox_admin_refresh=" in c and "Max-Age=604800" in c for c in cookies)
        assert (await client.get("/api/admin/me")).status_code == 200
        headers = {
            "Origin": app.state.settings.allowed_origin,
            "X-CSRF-Token": client.cookies.get("neox_csrf"),
        }
        result = await client.post("/api/admin/auth/logout", headers=headers)
        assert result.status_code == 204 and not result.content
        assert state["revoked"] is True
        assert client.cookies.get("neox_admin_session") is None
        client.cookies.set("neox_admin_session", "access-test-only")
        assert (await client.get("/api/admin/me")).status_code == 403


@pytest.mark.parametrize("change", [{"is_active": False}, {"role": "buyer"}])
async def test_valid_auth_does_not_grant_admin(auth_app, change):
    app, state = auth_app
    state["profile"].update(change)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/admin/auth/login",
            headers=seed_csrf(client, app),
            json={
                "email": "admin@example.invalid",
                "password": "test-not-real",
            },
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
        assert client.cookies.get("neox_admin_session") is None
        assert state["revoked"]


async def test_invalid_password_and_missing_auth(auth_app):
    app, state = auth_app
    state["invalid"] = True
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/admin/me")).status_code == 401
        response = await client.post(
            "/api/admin/auth/login",
            headers=seed_csrf(client, app),
            json={
                "email": "admin@example.invalid",
                "password": "test-not-real",
            },
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "AUTHENTICATION_FAILED"
        assert "secret" not in response.text


async def test_csrf_tampering_missing_and_cross_origin_never_reaches_auth(auth_app):
    app, state = auth_app
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        payload = {"email": "admin@example.invalid", "password": "test-not-real"}
        assert (await client.post("/api/admin/auth/login", json=payload)).status_code == 403
        headers = seed_csrf(client, app)
        headers["Origin"] = "https://foreign.invalid"
        assert (
            await client.post("/api/admin/auth/login", headers=headers, json=payload)
        ).status_code == 403
        client.cookies.set("neox_csrf", "forged")
        headers.update({"Origin": app.state.settings.allowed_origin, "X-CSRF-Token": "forged"})
        assert (
            await client.post("/api/admin/auth/login", headers=headers, json=payload)
        ).status_code == 403
        assert state["requests"] == []


async def test_refresh_rotates_session_and_checks_active_profile(auth_app):
    app, state = auth_app
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        client.cookies.set("neox_admin_refresh", "refresh-test-only", domain="test.local")
        response = await client.get("/api/admin/me")
        assert response.status_code == 200
        assert client.cookies.get("neox_admin_refresh") == "refresh-rotated"
        state["profile"]["is_active"] = False
        assert (await client.get("/api/admin/me")).status_code == 403


async def test_csrf_bound_to_session_and_expiry(auth_app, monkeypatch):
    app, state = auth_app
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        headers = seed_csrf(client, app, session="another-session")
        body = {"email": "admin@example.invalid", "password": "test-not-real"}
        assert (
            await client.post("/api/admin/auth/login", headers=headers, json=body)
        ).status_code == 403
        monkeypatch.setattr("app.core.security.time", lambda: 1.0)
        headers = seed_csrf(client, app)
        monkeypatch.setattr("app.core.security.time", lambda: 10000.0)
        assert (
            await client.post("/api/admin/auth/login", headers=headers, json=body)
        ).status_code == 403
        assert not state["requests"]
