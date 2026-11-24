import asyncio
import logging

from app.core.config import Settings
from app.db.mongodb import check_mongodb
from app.db.redis import check_redis
from app.db.supabase import check_supabase

logger = logging.getLogger("neox.connections")


async def check_connections(settings: Settings) -> dict[str, bool]:
    async def probe(name, check, deadline_seconds):
        if not settings.test_connections_enabled:
            return name, False
        try:
            async with asyncio.timeout(deadline_seconds):
                return name, await check(settings)
        except Exception as exc:
            logger.warning(
                "event=connection_unavailable service=%s error=%s", name, type(exc).__name__
            )
            return name, False

    return dict(
        await asyncio.gather(
            probe("supabase", check_supabase, settings.request_timeout_seconds),
            probe("mongodb", check_mongodb, settings.request_timeout_seconds),
            probe("redis", check_redis, settings.redis_timeout_seconds),
        )
    )
