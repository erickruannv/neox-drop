import asyncio
import secrets

from bson import ObjectId

from app.db.redis import redis_client
from app.services.recent import VISIT_SCRIPT


async def test_real_atomic_recent_order_uniqueness_ttl(real_settings):
    visitor = secrets.token_hex(16)
    key = f"NEOX QA:recent:visitor:{visitor}"
    identifiers = [str(ObjectId()) for _ in range(7)]
    settings = real_settings.model_copy(update={"redis_timeout_seconds": 5})
    created = False
    try:
        async with redis_client(settings) as redis:
            assert not await redis.exists(key)
            await redis.eval(VISIT_SCRIPT, keys=[key], args=[identifiers[0], "604800"])
            created = True
            await asyncio.gather(
                *(
                    redis.eval(VISIT_SCRIPT, keys=[key], args=[value, "604800"])
                    for value in identifiers
                )
            )
            for value in (identifiers[0], identifiers[1], identifiers[0]):
                await redis.eval(VISIT_SCRIPT, keys=[key], args=[value, "604800"])
            values = await redis.lrange(key, 0, -1)
            assert values[:2] == identifiers[:2]
            assert len(values) == 5 and len(set(values)) == 5
            assert 0 < await redis.ttl(key) <= 604800
        async with redis_client(settings) as redis:
            # Só encurta a chave temporária própria; TTL da aplicação permanece 7 dias.
            assert await redis.expire(key, 1)
        await asyncio.sleep(1.2)
        async with redis_client(settings) as redis:
            assert not await redis.exists(key)
    finally:
        if created:
            async with redis_client(settings) as redis:
                await redis.delete(key)
