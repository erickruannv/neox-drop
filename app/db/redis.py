import asyncio
from contextlib import asynccontextmanager
from weakref import WeakKeyDictionary

from upstash_redis.asyncio import Redis

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable

# Um cliente HTTP por event loop: reaproveita a conexão TLS com o Upstash. Cliente novo por
# chamada estourava o limite de 1 s (medido 0,4–1,8 s) e o histórico sumia da home em silêncio.
_clients: WeakKeyDictionary = WeakKeyDictionary()


@asynccontextmanager
async def redis_client(settings: Settings):
    if (
        not settings.test_connections_enabled
        or not settings.upstash_redis_rest_url
        or not settings.upstash_redis_rest_token
    ):
        raise ServiceUnavailable()
    key = (
        settings.upstash_redis_rest_url.get_secret_value(),
        settings.upstash_redis_rest_token.get_secret_value(),
    )
    clients = _clients.setdefault(asyncio.get_running_loop(), {})
    if key not in clients:
        clients[key] = Redis(url=key[0], token=key[1], rest_retries=0, allow_telemetry=False)
    async with asyncio.timeout(settings.redis_timeout_seconds):
        yield clients[key]


async def check_redis(settings: Settings) -> bool:
    async with redis_client(settings) as client:
        return await client.ping() == "PONG"
