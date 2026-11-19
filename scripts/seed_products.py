"""Coleção/seed exclusivamente fictícia e opt-in; não usa scripts importados."""

import argparse
import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import Settings
from app.db.mongodb import mongodb_client
from app.schemas.product import ProductCreate

ROOT = Path(__file__).resolve().parents[1]


def seed_document() -> dict:
    source = json.loads((ROOT / "docs/contracts/examples.json").read_text())["ProductCreate"]
    doc = ProductCreate.model_validate(source).model_dump(exclude_unset=True)
    now = datetime.now(UTC)
    return {**doc, "createdAt": now, "updatedAt": now}


async def initialize(database):
    if "products" in await database.list_collection_names():
        raise ValueError("Coleção existente: migração/collMod requer revisão separada.")
    config = json.loads((ROOT / "mongo/products_schema.json").read_text())
    await database.create_collection(
        "products",
        validator=config["validator"],
        validationLevel="strict",
        validationAction="error",
    )
    for index in config["indexes"]:
        options = {k: v for k, v in index.items() if k != "key"}
        await database["products"].create_index(list(index["key"].items()), **options)


async def run(settings, initialize_collection: bool, seed: bool):
    if not settings.mongodb_database.endswith("_test"):
        raise ValueError("Banco precisa terminar em _test.")
    async with mongodb_client(settings) as client:
        database = client[settings.mongodb_database]
        if initialize_collection:
            await initialize(database)
        if seed:
            indexes = await database["products"].index_information()
            if not all(indexes.get(name, {}).get("unique") for name in ("uniq_sku", "uniq_slug")):
                raise ValueError("Índices únicos obrigatórios ausentes.")
            doc = seed_document()
            await database["products"].update_one(
                {"sku": doc["sku"]},
                {"$setOnInsert": doc},
                upsert=True,
            )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--initialize", action="store_true")
    parser.add_argument("--seed", action="store_true")
    args = parser.parse_args()
    if not args.initialize and not args.seed:
        parser.print_help()
        return 2
    try:
        settings = Settings()
        if settings.app_env != "test" or not settings.test_connections_enabled:
            raise ValueError("Opt-in de teste obrigatório.")
        asyncio.run(run(settings, args.initialize, args.seed))
    except Exception:
        print(
            "Operação recusada/falhou; conferir configuração e estado de teste sem expor segredos."
        )
        return 1
    print("Operação de teste concluída. Seed não substitui produtos existentes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
