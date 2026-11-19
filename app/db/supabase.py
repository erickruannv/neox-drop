from contextlib import asynccontextmanager

from httpx import AsyncClient

from app.core.config import Settings
from app.core.exceptions import ServiceUnavailable
from supabase import AsyncClientOptions, acreate_client


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
        # /rest/v1/ exige Secret key; esta sonda só comprova Auth, não schema/RLS PostgreSQL.
        response = await client.options.httpx_client.get(
            str(client.auth_url).rstrip("/") + "/settings",
            headers={"apikey": settings.supabase_key.get_secret_value()},
        )
        response.raise_for_status()
        return True


async def store_contact(settings: Settings) -> str:
    if (
        not settings.test_connections_enabled
        or not settings.supabase_url
        or not settings.supabase_secret_key
    ):
        return ""
    secret = settings.supabase_secret_key.get_secret_value()
    headers = {"apikey": secret}
    if not secret.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {secret}"
    async with AsyncClient(timeout=settings.request_timeout_seconds) as http:
        response = await http.get(
            settings.supabase_url.get_secret_value().rstrip("/") + "/rest/v1/store_settings",
            params={"select": "whatsapp_e164_digits", "id": "eq.1"},
            headers=headers,
        )
        response.raise_for_status()
        rows = response.json()
        if not isinstance(rows, list) or len(rows) > 1 or (rows and not isinstance(rows[0], dict)):
            raise ServiceUnavailable()
        return rows[0].get("whatsapp_e164_digits", "") if rows else ""
