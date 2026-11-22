"""Supabase/Mongo reais + dois processos FastAPI sucessivos; sem dependency_overrides."""

import secrets

from bson import ObjectId
from httpx import AsyncClient

from app.db.mongodb import mongodb_client
from scripts.run_real_e2e import running_test_server
from scripts.seed_products import verify


def headers(client):
    return {
        "Origin": str(client.base_url).rstrip("/"),
        "X-CSRF-Token": client.cookies.get("neox_csrf", ""),
    }


async def login(client, account):
    assert (await client.get("/admin/login")).status_code == 200
    response = await client.post("/api/admin/auth/login", headers=headers(client), json=account)
    assert response.status_code == 200
    assert all("HttpOnly" in value for value in response.headers.get_list("set-cookie"))


async def logout(client):
    if not (client.cookies.get("neox_admin_session") or client.cookies.get("neox_admin_refresh")):
        return
    assert (await client.post("/api/admin/auth/logout", headers=headers(client))).status_code == 204
    assert (await client.get("/api/admin/me")).status_code == 401


async def test_real_admin_product_persists_and_appears_in_catalog(
    real_settings, real_account, examples
):
    assert real_settings.mongodb_database == "neox_drop_test"
    assert real_settings.cookie_secret, "COOKIE_SECRET local obrigatório."
    suffix = secrets.token_hex(12)
    payload = {
        **examples["ProductCreate"],
        "sku": f"NEOX-HTTP-{suffix}",
        "slug": f"http-{suffix}",
        "name": f"TESTE ACADÊMICO {suffix}",
        "description": "Dados fictícios exclusivos de validação; sem oferta real.",
    }
    identifier = None
    async with mongodb_client(real_settings) as mongo:
        database = mongo[real_settings.mongodb_database]
        await verify(database)
        collection = database["products"]
        assert await collection.find_one({"sku": payload["sku"]}) is None
        try:
            async with running_test_server(real_settings) as origin:
                async with AsyncClient(base_url=origin, timeout=20) as client:
                    try:
                        await login(client, real_account("admin"))
                        response = await client.post(
                            "/api/admin/products", json=payload, headers=headers(client)
                        )
                        assert response.status_code == 201
                        identifier = response.json()["id"]
                        # Cliente fora do processo HTTP: comprova gravação no Atlas.
                        stored = await collection.find_one({"sku": payload["sku"]})
                        assert stored and str(stored["_id"]) == identifier
                        assert stored["priceCents"] == payload["priceCents"]
                        listing = await client.get("/api/products", params={"q": suffix})
                        assert [p["id"] for p in listing.json()["items"]] == [identifier]
                        page = await client.get("/tenis", params={"q": suffix})
                        assert page.status_code == 200 and payload["name"] in page.text
                    finally:
                        await logout(client)
            # O primeiro Uvicorn já foi encerrado; novo processo lê o mesmo documento persistido.
            async with running_test_server(real_settings) as origin:
                async with AsyncClient(base_url=origin, timeout=20) as client:
                    detail = await client.get(f"/api/products/{payload['slug']}")
                    assert detail.status_code == 200 and detail.json()["id"] == identifier
                    assert detail.json()["priceCents"] == payload["priceCents"]
                    try:
                        await login(client, real_account("admin"))
                        # Simula expiração do cookie de acesso, não espera expiração real do JWT.
                        client.cookies.delete("neox_admin_session")
                        assert (await client.get("/admin/produtos")).status_code == 200
                        assert client.cookies.get("neox_admin_session")
                        changed = await client.patch(
                            f"/api/admin/products/{identifier}",
                            json={"priceCents": 17000},
                            headers=headers(client),
                        )
                        assert changed.status_code == 200
                        assert (await collection.find_one({"sku": payload["sku"]}))[
                            "priceCents"
                        ] == 17000
                        removed = await client.delete(
                            f"/api/admin/products/{identifier}", headers=headers(client)
                        )
                        assert removed.status_code == 204
                        assert (
                            await client.get(f"/api/products/{payload['slug']}")
                        ).status_code == 404
                        assert not (await client.get("/api/products", params={"q": suffix})).json()[
                            "items"
                        ]
                        assert (await collection.find_one({"sku": payload["sku"]}))[
                            "active"
                        ] is False
                    finally:
                        await logout(client)
        finally:
            if identifier:
                # Preserva evidência; não exclui documentos. Só desativa o registro criado acima.
                await collection.update_one(
                    {"_id": ObjectId(identifier), "sku": payload["sku"]},
                    {"$set": {"active": False}, "$currentDate": {"updatedAt": True}},
                )
