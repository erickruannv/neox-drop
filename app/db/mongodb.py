import asyncio
from contextlib import asynccontextmanager
from weakref import WeakKeyDictionary

from pymongo import AsyncMongoClient

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable

# Um cliente (pool) por event loop: evita SRV+TCP+TLS+SCRAM a cada requisição dentro do timeout.
# shortcut: fechado só ao fim do loop/processo; adicionar lifespan se houver reload frequente.
_clients: WeakKeyDictionary = WeakKeyDictionary()


@asynccontextmanager
async def mongodb_client(settings: Settings):
    if not settings.test_connections_enabled or not settings.mongodb_uri:
        raise ServiceUnavailable()
    timeout_ms = int(settings.request_timeout_seconds * 1000)
    uri = settings.mongodb_uri.get_secret_value()
    clients = _clients.setdefault(asyncio.get_running_loop(), {})
    if (uri, timeout_ms) not in clients:
        clients[(uri, timeout_ms)] = AsyncMongoClient(
            uri,
            connect=False,
            tz_aware=True,
            serverSelectionTimeoutMS=timeout_ms,
            connectTimeoutMS=timeout_ms,
            socketTimeoutMS=timeout_ms,
            timeoutMS=timeout_ms,
        )
    yield clients[(uri, timeout_ms)]


async def check_mongodb(settings: Settings) -> bool:
    async with mongodb_client(settings) as client:
        await client[settings.mongodb_database].command("ping")
        return True
