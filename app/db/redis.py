import asyncio
from contextlib import asynccontextmanager

from upstash_redis.asyncio import Redis

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable


@asynccontextmanager
async def redis_client(settings: Settings):
    if (
        not settings.test_connections_enabled
        or not settings.upstash_redis_rest_url
        or not settings.upstash_redis_rest_token
    ):
        raise ServiceUnavailable()
    client = Redis(
        url=settings.upstash_redis_rest_url.get_secret_value(),
        token=settings.upstash_redis_rest_token.get_secret_value(),
        rest_retries=0,
        allow_telemetry=False,
    )
    try:
        async with asyncio.timeout(settings.redis_timeout_seconds):
            yield client
    finally:
        await client.close()


async def check_redis(settings: Settings) -> bool:
    async with redis_client(settings) as client:
        return await client.ping() == "PONG"
