from contextlib import asynccontextmanager

from pymongo import AsyncMongoClient

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable


@asynccontextmanager
async def mongodb_client(settings: Settings):
    if not settings.test_connections_enabled or not settings.mongodb_uri:
        raise ServiceUnavailable()
    timeout_ms = int(settings.request_timeout_seconds * 1000)
    client = AsyncMongoClient(
        settings.mongodb_uri.get_secret_value(),
        connect=False,
        tz_aware=True,
        serverSelectionTimeoutMS=timeout_ms,
        connectTimeoutMS=timeout_ms,
        socketTimeoutMS=timeout_ms,
        timeoutMS=timeout_ms,
    )
    try:
        yield client
    finally:
        await client.close()


async def check_mongodb(settings: Settings) -> bool:
    async with mongodb_client(settings) as client:
        await client[settings.mongodb_database].command("ping")
        return True
