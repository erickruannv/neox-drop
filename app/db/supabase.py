from contextlib import asynccontextmanager

from httpx import AsyncClient
from supabase import AsyncClientOptions, acreate_client

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable


@asynccontextmanager
async def supabase_client(settings: Settings):
    if (
        not settings.test_connections_enabled
        or not settings.supabase_url
        or not settings.supabase_key
    ):
        raise ServiceUnavailable()
    async with AsyncClient(timeout=settings.request_timeout_seconds) as http:
        client = await acreate_client(
            settings.supabase_url.get_secret_value(),
            settings.supabase_key.get_secret_value(),
            options=AsyncClientOptions(
                persist_session=False,
                auto_refresh_token=False,
                postgrest_client_retry=False,
                postgrest_client_timeout=settings.request_timeout_seconds,
                httpx_client=http,
            ),
        )
        yield client


async def check_supabase(settings: Settings) -> bool:
    async with supabase_client(settings) as client:
        response = await client.options.httpx_client.get(
            str(client.auth_url).rstrip("/") + "/health",
            headers={"apikey": settings.supabase_key.get_secret_value()},
        )
        response.raise_for_status()
        # SELECT sem dados pessoais; não comprova RLS ou autorização administrativa.
        await client.table("store_settings").select("id").eq("id", 1).limit(1).execute()
        return True
