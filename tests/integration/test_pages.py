import pytest
from httpx import ASGITransport, AsyncClient
from jinja2 import DictLoader

from app.api.pages import templates
from app.core.config import Settings
from app.main import create_app
from tests.integration.test_auth import auth_app as auth_app


@pytest.fixture
def page_templates(monkeypatch):
    # Exercise the loader boundary without taking ownership of Claude's templates.
    monkeypatch.setattr(
        templates.env,
        "loader",
        DictLoader(
            {
                "home.html": (
                    '{{ featured["items"]|length }} {{ launches.total }} '
                    '{{ recent["items"]|length }}'
                ),
                "catalog.html": "{{ catalog.total }} {{ filters.q }}",
                "product.html": "{{ product.name }}",
                "error.html": "<h1>{{ message }}</h1>",
                "admin/login.html": '<meta name="csrf-token" content="{{ csrfToken }}">',
                "admin/products.html": (
                    "{{ admin.displayName }} {{ products.total }} {{ csrfToken }}"
                ),
            }
        ),
    )
    templates.env.cache.clear()
    yield
    templates.env.cache.clear()


async def test_public_pages_use_catalog_context_and_keep_api_contract(catalog_app, page_templates):
    app, collection, doc, cursor = catalog_app
    cursor.to_list.return_value = [doc]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        home = await client.get("/")
        assert home.status_code == 200
        assert home.text == "1 1 0"
        assert home.headers["cache-control"] == "no-store"
        assert client.cookies.get("neox_csrf")
        catalog = await client.get("/tenis?q=teste")
        assert catalog.status_code == 200
        assert catalog.text == "1 teste"
        detail = await client.get(f"/tenis/{doc['slug']}")
        assert detail.status_code == 200
        assert doc["name"] in detail.text
        collection.find_one.return_value = None
        missing = await client.get("/tenis/inexistente")
        assert missing.status_code == 404
        assert missing.headers["content-type"].startswith("text/html")
        api_missing = await client.get("/api/products/inexistente")
        assert api_missing.status_code == 404
        assert api_missing.headers["content-type"].startswith("application/json")


async def test_home_can_render_six_launches(catalog_app, page_templates):
    from copy import deepcopy

    from bson import ObjectId

    app, collection, doc, cursor = catalog_app
    documents = [{**deepcopy(doc), "_id": ObjectId(), "name": f"Tênis local {i}"} for i in range(6)]

    async def rows(length=None):
        return documents if length is None else documents[:length]

    cursor.to_list.side_effect = rows
    collection.count_documents.return_value = 6
    templates.env.loader.mapping["home.html"] = '{{ launches["items"]|length }}'
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        home = await client.get("/")
        assert home.status_code == 200
        assert home.text == "6"


async def test_admin_html_requires_auth_before_mongodb(page_templates):
    app = create_app(Settings(_env_file=None, cookie_secret="local-test-" * 8))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.get("/admin/login")
        assert login.status_code == 200
        assert client.cookies.get("neox_csrf") in login.text
        assert "HttpOnly" in login.headers["set-cookie"]
        for path in ("/admin", "/admin/produtos"):
            response = await client.get(path)
            assert response.status_code == 303
            assert response.headers["location"] == "/admin/login"
        assert (await client.get("/api/admin/products")).status_code == 401


async def test_admin_page_reuses_authorization_and_denies_inactive(catalog_app, page_templates):
    from app.core.exceptions import ApiFault
    from app.services.admin import require_admin

    app, _, _, _ = catalog_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        authorized = await client.get("/admin/produtos")
        assert authorized.status_code == 200
        assert authorized.headers["cache-control"] == "no-store"
        assert client.cookies.get("neox_csrf") in authorized.text

        async def denied():
            raise ApiFault(403, "FORBIDDEN", "Acesso administrativo não autorizado.")

        app.dependency_overrides[require_admin] = denied
        response = await client.get("/admin/produtos")
        assert response.status_code == 403
        assert response.headers["content-type"].startswith("text/html")
        assert "csrf-token" not in response.text


async def test_static_files_are_served(tmp_path, monkeypatch):
    import app.main

    static = tmp_path / "static"
    static.mkdir()
    (static / "probe.txt").write_text("asset")
    monkeypatch.setattr(app.main, "STATIC_DIR", static, raising=False)
    async with AsyncClient(
        transport=ASGITransport(app=create_app(Settings(_env_file=None))), base_url="http://test"
    ) as client:
        response = await client.get("/static/probe.txt")
        assert response.status_code == 200
        assert response.text == "asset"


async def test_html_refresh_preserves_cookies_and_binds_csrf(auth_app, catalog_app, page_templates):
    from app.services.catalog import products_collection

    app, state = auth_app
    app.dependency_overrides[products_collection] = catalog_app[0].dependency_overrides[
        products_collection
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("neox_admin_refresh", "refresh-test-only", domain="test.local", path="/")
        page = await client.get("/admin/produtos")
        assert page.status_code == 200
        assert client.cookies.get("neox_admin_session") == "access-test-only"
        assert client.cookies.get("neox_admin_refresh") == "refresh-rotated"
        assert "access-test-only" not in page.text
        assert "refresh-rotated" not in page.text
        csrf = client.cookies.get("neox_csrf")
        assert csrf in page.text
        logout = await client.post(
            "/api/admin/auth/logout",
            headers={"origin": app.state.settings.allowed_origin, "x-csrf-token": csrf},
        )
        assert logout.status_code == 204
        assert state["revoked"]


@pytest.mark.parametrize("path", ["/admin/produtos", "/api/admin/products"])
@pytest.mark.parametrize("unexpected", [False, True])
async def test_refresh_cookies_survive_catalog_failure(auth_app, path, unexpected):
    from pymongo.errors import PyMongoError

    from app.services.catalog import products_collection

    app, _ = auth_app

    async def unavailable():
        raise (RuntimeError if unexpected else PyMongoError)("secret://not-for-logs")

    app.dependency_overrides[products_collection] = unavailable
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("neox_admin_refresh", "refresh-test-only", domain="test.local", path="/")
        response = await client.get(path)
        assert response.status_code == (500 if unexpected else 503)
        assert client.cookies.get("neox_admin_refresh") == "refresh-rotated"
        assert client.cookies.get("neox_admin_session") == "access-test-only"
        assert all("HttpOnly" in c for c in response.headers.get_list("set-cookie"))
        assert response.headers["cache-control"] == "no-store"
        if response.headers["content-type"].startswith("text/html"):
            assert client.cookies.get("neox_csrf") in response.text
        assert "access-test-only" not in response.text
        assert "secret://" not in response.text
        assert (await client.get("/api/admin/me")).status_code == 200


async def test_real_templates_without_database_show_unavailability_not_demo():
    app = create_app(Settings(_env_file=None, cookie_secret="local-test-" * 8))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for path in ("/", "/tenis", "/tenis/qualquer-produto"):
            response = await client.get(path)
            assert response.status_code == 503
            assert response.headers["content-type"].startswith("text/html")
            assert "data-service-unavailable" in response.text
            assert "Catálogo temporariamente indisponível" in response.text
            assert "data-demo-banner" not in response.text
            assert '"priceCents"' not in response.text
            assert response.headers["cache-control"] == "no-store"
        login = await client.get("/admin/login")
        assert login.status_code == 200
        assert client.cookies.get("neox_csrf") in login.text
        assert "autenticação administrativa aguarda" in login.text
        assert (await client.get("/admin/produtos")).status_code == 303
        assert (await client.get("/api/products")).status_code == 503


async def test_integrated_home_shows_approved_collections_and_keeps_photo_credits():
    app = create_app(Settings(_env_file=None))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        page = await client.get("/")
        for category in ("Street", "Classics", "Performance"):
            assert f"/tenis?category={category}" in page.text
        assert "/static/images/products/nike-air-max-90-infrared/main.webp" in page.text
        assert "Christian H." in page.text
        assert "CC BY 2.0" in page.text
        assert "Andre Bond Sr." in page.text and "CC BY 4.0" in page.text


async def test_security_policy_allows_only_required_3d_hosts_and_survives_errors():
    app = create_app(Settings(_env_file=None))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for path in ("/", "/admin/login", "/api/products", "/static/not-found"):
            response = await client.get(path)
            policy = response.headers.get("content-security-policy", "")
            assert "script-src 'self' https://static.sketchfab.com" in policy
            assert "frame-src https://sketchfab.com" in policy
            assert "object-src 'none'" in policy
            assert "frame-ancestors 'none'" in policy
            assert "'unsafe-eval'" not in policy
            assert response.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize("history", [False, True])
async def test_home_exposes_recent_history_only_when_provided(catalog_app, monkeypatch, history):
    from unittest.mock import AsyncMock

    # Teste local do loader/template; não é comprovação do Upstash real.
    app, _, doc, cursor = catalog_app
    cursor.to_list.return_value = [doc]
    monkeypatch.setattr(
        "app.api.pages.recent_ids", AsyncMock(return_value=[str(doc["_id"])] if history else [])
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert ("data-recent-products" in response.text) is history
        if history:
            section = response.text.split("data-recent-products", 1)[1].split("</section>", 1)[0]
            assert "Vistos recentemente" in section
            assert doc["slug"] in section
