import asyncio
import secrets

from bson import ObjectId

from app.db.redis import redis_client
from app.services.recent import VISIT_SCRIPT


async def test_real_atomic_recent_order_uniqueness_ttl(real_settings):
    visitor = secrets.token_hex(16)
    key = f"recent:visitor:{visitor}"
    identifiers = [str(ObjectId()) for _ in range(7)]
    # Várias operações de diagnóstico no mesmo contexto; app continua com deadline curto.
    settings = real_settings.model_copy(update={"redis_timeout_seconds": 5})
    async with redis_client(settings) as redis:
        try:
            await asyncio.gather(
                *(
                    redis.eval(VISIT_SCRIPT, keys=[key], args=[value, "604800"])
                    for value in identifiers
                )
            )
            await redis.eval(VISIT_SCRIPT, keys=[key], args=[identifiers[0], "604800"])
            await redis.eval(VISIT_SCRIPT, keys=[key], args=[identifiers[1], "604800"])
            await redis.eval(VISIT_SCRIPT, keys=[key], args=[identifiers[0], "604800"])
            values = await redis.lrange(key, 0, -1)
            assert values[:2] == identifiers[:2]
            assert len(values) == 5 and len(set(values)) == 5
            assert 0 < await redis.ttl(key) <= 604800
        finally:
            await redis.delete(key)
