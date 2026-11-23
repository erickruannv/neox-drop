"""Vitrine opt-in com fixtures; não comprova integração com bancos reais."""

import pytest
from httpx import ASGITransport, AsyncClient
from jsonschema import Draft202012Validator


async def test_fastapi_showcase_keeps_curated_media_and_contracts_without_remote_writes(contract):
    from scripts.preview_storefront import app

    assert app.state.settings.test_connections_enabled is False
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1:8001") as c:
        home = await c.get("/")
        assert home.status_code == 200 and "data-demo-banner" in home.text
        assert "estoque ilustrativos" in home.text
        assert "category=Performance" not in home.text
        assert "nb9060-web.glb" not in home.text
        featured = (await c.get("/api/featured")).json()
        assert {p["slug"] for p in featured["items"]} == {
            "nike-air-max-95-dark-army",
            "nike-air-max-90-infrared",
            "adidas-samba-og",
        }
        for product in featured["items"]:
            Draft202012Validator(
                {"$ref": "#/components/schemas/ProductDetail", "components": contract["components"]}
            ).validate(product)
            if product.get("model3dUrl"):
                assert product["slug"] == "nike-air-max-95-dark-army"
                assert product["model3dUrl"].startswith("https://sketchfab.com/models/")
            page = await c.get(f"/tenis/{product['slug']}")
            assert page.status_code == 200
            assert product["attributes"]["imageCredit"] in page.text
            for url in product["galleryUrls"]:
                image = await c.get(url)
                assert image.status_code == 200 and image.headers["content-type"] == "image/webp"
        assert (await c.get("/tenis?category=Street")).status_code == 200
        listing = (await c.get("/api/products?category=Street")).json()
        assert listing["total"] == 1 and listing["items"][0]["brand"] == "adidas"
        assert (await c.get("/tenis/inexistente")).status_code == 404
        assert (await c.get("/api/admin/products")).status_code == 401
        assert (await c.get("/admin/produtos")).status_code == 303
        login = await c.get("/admin/login")
        assert "data-demo-login-hint" not in login.text
        assert (await c.post("/api/checkout", json={"items": []})).status_code == 403
        csrf = c.cookies.get("neox_csrf")
        checkout = await c.post(
            "/api/checkout",
            headers={
                "Origin": "http://127.0.0.1:8001",
                "X-CSRF-Token": csrf,
            },
            json={
                "items": [{"productId": featured["items"][0]["id"], "sizeBR": 40, "quantity": 1}]
            },
        )
        assert checkout.status_code == 503
        assert (await c.get("/.env")).status_code == 404


@pytest.mark.parametrize(
    "origin", ["https://cdn.test/path", "https://cdn.test;evil", "http://cdn.test"]
)
def test_csp_media_origins_reject_non_origins(origin):
    from pydantic import ValidationError

    from app.core.config import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None, media_allowed_origins=[origin])
