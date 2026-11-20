"""Fatia real: Supabase Auth/RLS + HTTP FastAPI/Jinja + MongoDB, sem overrides de dependências."""

import secrets

from httpx import ASGITransport, AsyncClient

from app.db.mongodb import mongodb_client
from app.main import create_app
from scripts.seed_products import verify


async def test_real_admin_product_persists_and_appears_in_catalog(
    real_settings, real_account, examples
):
    assert real_settings.mongodb_database.endswith("_test")
    assert real_settings.cookie_secret, "COOKIE_SECRET local obrigatório."
    suffix = secrets.token_hex(12)
    payload = {
        **examples["ProductCreate"],
        "sku": f"NEOX-HTTP-{suffix}",
        "slug": f"http-{suffix}",
        "name": f"Validação HTTP {suffix}",
    }
    app = create_app(real_settings)
    async with mongodb_client(real_settings) as mongo:
        database = mongo[real_settings.mongodb_database]
        await verify(database)
        collection = database["products"]
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url=real_settings.allowed_origin
        ) as client:

            def headers():
                return {
                    "Origin": real_settings.allowed_origin,
                    "X-CSRF-Token": client.cookies.get("neox_csrf", ""),
                }

            page = await client.get("/admin/login")
            assert page.status_code == 200
            response = await client.post(
                "/api/admin/auth/login", headers=headers(), json=real_account("admin")
            )
            assert response.status_code == 200
            try:
                response = await client.post("/api/admin/products", json=payload, headers=headers())
                assert response.status_code == 201
                identifier = response.json()["id"]
                # Cliente Mongo separado do request comprova persistência, não apenas resposta HTTP.
                stored = await collection.find_one({"sku": payload["sku"]})
                assert stored and str(stored["_id"]) == identifier
                assert stored["priceCents"] == payload["priceCents"]
                listing = await client.get("/api/products", params={"q": suffix})
                assert listing.status_code == 200
                assert [p["id"] for p in listing.json()["items"]] == [identifier]
                assert payload["name"] in (await client.get("/tenis", params={"q": suffix})).text
                assert (await client.get(f"/tenis/{payload['slug']}")).status_code == 200
                client.cookies.delete("neox_admin_session")
                panel = await client.get("/admin/produtos")
                assert panel.status_code == 200
                assert client.cookies.get("neox_admin_session")
                changed = await client.patch(
                    f"/api/admin/products/{identifier}",
                    json={"priceCents": 17000},
                    headers=headers(),
                )
                assert changed.status_code == 200
                assert (await client.get(f"/api/products/{payload['slug']}")).json()[
                    "priceCents"
                ] == 17000
                removed = await client.delete(
                    f"/api/admin/products/{identifier}", headers=headers()
                )
                assert removed.status_code == 204
                assert (await client.get(f"/api/products/{payload['slug']}")).status_code == 404
                assert not (await client.get("/api/products", params={"q": suffix})).json()["items"]
                assert (await collection.find_one({"sku": payload["sku"]}))["active"] is False
            finally:
                # Limpa somente o SKU imprevisível criado por este teste, nunca a coleção.
                await collection.delete_many({"sku": payload["sku"]})
                logout = await client.post("/api/admin/auth/logout", headers=headers())
                assert logout.status_code == 204
            assert (await client.get("/api/admin/me")).status_code == 401
