import secrets

from bson import ObjectId

from app.core.exceptions import ApiFault
from app.db.mongodb import mongodb_client
from app.services.catalog import create_product, update_product
from scripts.seed_products import verify


async def test_real_mongo_crud_unique_indexes_and_soft_delete(real_settings, examples):
    assert real_settings.mongodb_database.endswith("_test"), "Banco real precisa terminar em _test."
    suffix = secrets.token_hex(12)
    payload = {**examples["ProductCreate"], "sku": f"NEOX-TEST-{suffix}", "slug": f"teste-{suffix}"}
    async with mongodb_client(real_settings) as client:
        database = client[real_settings.mongodb_database]
        await verify(database)
        collection = database["products"]
        identifier = None
        assert await collection.find_one({"sku": payload["sku"]}) is None
        try:
            created = await create_product(collection, payload, real_settings)
            identifier = created["id"]
            assert created["priceCents"] == 15990
            try:
                await create_product(collection, payload, real_settings)
            except ApiFault as exc:
                assert exc.status == 409
            else:
                raise AssertionError("Índice único não impediu duplicata.")
            updated = await update_product(
                collection, created["id"], {"priceCents": 17000}, real_settings
            )
            assert updated["priceCents"] == 17000
            await update_product(collection, created["id"], {"active": False}, real_settings)
            assert await collection.find_one({"sku": payload["sku"], "active": True}) is None
            assert await collection.find_one({"sku": payload["sku"]}) is not None
        finally:
            if identifier:
                # Mantém evidência inativa; nunca exclui registros existentes.
                await collection.update_one(
                    {"_id": ObjectId(identifier), "sku": payload["sku"]},
                    {"$set": {"active": False}, "$currentDate": {"updatedAt": True}},
                )
