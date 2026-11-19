from typing import Annotated

from fastapi import Depends, Request, Response
from pydantic import ValidationError
from supabase_auth.errors import AuthApiError

from app.core.exceptions import ApiFault, ServiceUnavailable
from app.core.security import issue_csrf
from app.db.supabase import supabase_client
from app.schemas.auth import AdminProfile


async def admin_client(request: Request):
    if request.url.path != "/api/admin/auth/login" and not (
        request.cookies.get("neox_admin_session") or request.cookies.get("neox_admin_refresh")
    ):
        raise ApiFault(401, "AUTHENTICATION_FAILED", "Autenticação necessária.")
    async with supabase_client(request.app.state.settings) as client:
        yield client


async def authorize(client, token: str) -> AdminProfile:
    user = (await client.auth.get_user(token)).user
    if user is None:
        raise ApiFault(401, "AUTHENTICATION_FAILED", "Autenticação necessária.")
    client.postgrest.auth(token)
    result = (
        await client.table("admin_profiles")
        .select("user_id,display_name,role,is_active")
        .eq("user_id", str(user.id))
        .limit(1)
        .execute()
    )
    rows = result.data
    if (
        not rows
        or rows[0]["user_id"] != str(user.id)
        or rows[0].get("role") != "admin"
        or rows[0].get("is_active") is not True
    ):
        raise ApiFault(403, "FORBIDDEN", "Acesso administrativo não autorizado.")
    row = rows[0]
    try:
        return AdminProfile(
            userId=row["user_id"],
            displayName=row["display_name"],
            role=row["role"],
            isActive=row["is_active"],
        )
    except (ValidationError, KeyError) as exc:
        raise ServiceUnavailable() from exc


def session_cookies(settings, response: Response, session):
    ttl = max(1, min(session.expires_in or 3600, 3600))
    for name, value in (
        ("neox_admin_session", session.access_token),
        ("neox_admin_refresh", session.refresh_token),
    ):
        response.set_cookie(
            name,
            value,
            max_age=(
                ttl if name == "neox_admin_session" else settings.admin_refresh_max_age_seconds
            ),
            httponly=True,
            samesite="lax",
            secure=settings.allowed_origin.startswith("https://"),
        )
    issue_csrf(settings, response, session.access_token)


async def require_admin(
    request: Request,
    response: Response,
    client: Annotated[object, Depends(admin_client)],
) -> AdminProfile:
    token = request.cookies.get("neox_admin_session")
    refresh = request.cookies.get("neox_admin_refresh")
    renewed = None
    if not token:
        if not refresh:
            raise ApiFault(401, "AUTHENTICATION_FAILED", "Autenticação necessária.")
        renewed = (await client.auth.refresh_session(refresh)).session
        if not renewed:
            raise ApiFault(401, "AUTHENTICATION_FAILED", "Autenticação necessária.")
        token = renewed.access_token
    try:
        profile = await authorize(client, token)
    except AuthApiError as exc:
        if exc.status not in {400, 401, 403} or not refresh or renewed:
            raise
        renewed = (await client.auth.refresh_session(refresh)).session
        if not renewed:
            raise ApiFault(401, "AUTHENTICATION_FAILED", "Autenticação necessária.") from exc
        token = renewed.access_token
        profile = await authorize(client, token)
    if renewed:
        session_cookies(request.app.state.settings, response, renewed)
        # A sessão já girou no Auth; falhas posteriores não podem perder o refresh novo.
        request.state.renewed_session_cookies = [
            (key, value) for key, value in response.raw_headers if key == b"set-cookie"
        ]
    request.state.admin_access_token = token
    return profile
