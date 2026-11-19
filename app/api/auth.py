from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.core.exceptions import ApiFault
from app.core.security import issue_csrf, require_csrf
from app.schemas.auth import AdminProfile, LoginRequest
from app.services.admin import admin_client, authorize, require_admin, session_cookies

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.post(
    "/auth/login",
    operation_id="login",
    response_model=AdminProfile,
    dependencies=[Depends(require_csrf)],
)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    client: Annotated[object, Depends(admin_client)],
):
    result = await client.auth.sign_in_with_password(body.model_dump())
    if not result.session:
        raise ApiFault(401, "AUTHENTICATION_FAILED", "Autenticação inválida.")
    try:
        profile = await authorize(client, result.session.access_token)
    except ApiFault:
        await client.auth.admin.sign_out(result.session.access_token, scope="local")
        raise
    session_cookies(request.app.state.settings, response, result.session)
    response.headers["Cache-Control"] = "no-store"
    return profile


@router.get("/me", operation_id="getAdminProfile", response_model=AdminProfile)
async def me(response: Response, admin: Annotated[AdminProfile, Depends(require_admin)]):
    response.headers["Cache-Control"] = "no-store"
    return admin


@router.post(
    "/auth/logout",
    operation_id="logout",
    status_code=204,
    dependencies=[Depends(require_csrf), Depends(require_admin)],
)
async def logout(
    request: Request,
    client: Annotated[object, Depends(admin_client)],
):
    await client.auth.admin.sign_out(request.state.admin_access_token, scope="local")
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    for name in ("neox_admin_session", "neox_admin_refresh"):
        response.delete_cookie(
            name,
            httponly=True,
            samesite="lax",
            secure=request.app.state.settings.allowed_origin.startswith("https://"),
        )
    issue_csrf(request.app.state.settings, response)
    return response
