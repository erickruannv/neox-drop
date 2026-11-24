import logging
import re
import secrets

from bson import ObjectId

from app.core.exceptions import ApiFault
from app.db.redis import redis_client
from app.services.catalog import public_product

logger = logging.getLogger("neox.recent")
VISIT_SCRIPT = """
redis.call('LREM', KEYS[1], 0, ARGV[1])
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[3] or '4'))
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
"""


def valid_visitor(value: str | None) -> bool:
    return bool(value and re.fullmatch(r"[0-9a-f]{32}", value))


def visitor_cookie(request, response, settings) -> str:
    """Reaproveita o visitante do cookie (ou cria um) e renova o cookie na resposta."""
    visitor = request.cookies.get("neox_visitor")
    if not valid_visitor(visitor):
        visitor = secrets.token_hex(16)
    response.set_cookie(
        "neox_visitor",
        visitor,
        max_age=settings.recent_ttl_seconds,
        httponly=True,
        samesite="lax",
        secure=settings.allowed_origin.startswith("https://"),
    )
    return visitor


async def register_visit(collection, product_id: str, visitor: str, settings):
    identifier = ObjectId(product_id)
    if not await collection.find_one({"_id": identifier, "active": True}, {"_id": 1}):
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    try:
        async with redis_client(settings) as redis:
            await redis.eval(
                VISIT_SCRIPT,
                keys=[f"{settings.redis_key_prefix}recent:visitor:{visitor}"],
                args=[str(identifier), str(settings.recent_ttl_seconds), "4"],
            )
    except Exception as exc:
        logger.warning("event=recent_write_unavailable error=%s", type(exc).__name__)


async def recent_ids(visitor: str | None, settings) -> list[str]:
    if not valid_visitor(visitor):
        return []
    try:
        async with redis_client(settings) as redis:
            values = await redis.lrange(
                f"{settings.redis_key_prefix}recent:visitor:{visitor}", 0, 4
            )
        return list(
            dict.fromkeys(
                str(ObjectId(value))
                for value in values[:5]
                if isinstance(value, str) and ObjectId.is_valid(value)
            )
        )
    except Exception as exc:
        logger.warning("event=recent_read_unavailable error=%s", type(exc).__name__)
        return []


async def resolve_recent(collection, identifiers: list[str]):
    docs = await collection.find(
        {"_id": {"$in": [ObjectId(value) for value in identifiers]}, "active": True}
    ).to_list(length=5)
    products = {
        str(doc["_id"]): public_product(doc, detail=False)
        for doc in docs
        if doc.get("active") is True
    }
    return {"items": [products[value] for value in identifiers if value in products]}


SEARCH_LIMIT = 3


def _search_key(settings, visitor: str) -> str:
    return f"{settings.redis_key_prefix}searches:visitor:{visitor}"


async def track_search(request, response, query: str | None):
    """Guarda no Redis as últimas pesquisas do visitante (mais recente primeiro, sem repetir)."""
    term = " ".join((query or "").split()).lower()
    if not term:
        return
    settings = request.app.state.settings
    visitor = visitor_cookie(request, response, settings)
    try:
        async with redis_client(settings) as redis:
            await redis.eval(
                VISIT_SCRIPT,
                keys=[_search_key(settings, visitor)],
                args=[term, str(settings.recent_ttl_seconds), str(SEARCH_LIMIT - 1)],
            )
    except Exception as exc:
        logger.warning("event=search_write_unavailable error=%s", type(exc).__name__)


async def recent_searches(visitor: str | None, settings) -> list[str]:
    if not valid_visitor(visitor):
        return []
    try:
        async with redis_client(settings) as redis:
            values = await redis.lrange(_search_key(settings, visitor), 0, SEARCH_LIMIT - 1)
        return [v for v in values if isinstance(v, str) and 0 < len(v) <= 100][:SEARCH_LIMIT]
    except Exception as exc:
        logger.warning("event=search_read_unavailable error=%s", type(exc).__name__)
        return []
