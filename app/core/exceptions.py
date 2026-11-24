import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.responses import HTMLResponse, JSONResponse, RedirectResponse

logger = logging.getLogger("neox.errors")


class ServiceUnavailable(Exception):
    pass


def error_response(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": []}},
    )


async def validation_error(request: Request, exc: RequestValidationError):
    malformed = any(error["type"] == "json_invalid" for error in exc.errors())
    return error_response(
        400 if malformed else 422,
        "BAD_REQUEST" if malformed else "VALIDATION_ERROR",
        "JSON inválido." if malformed else "Revise os campos informados.",
    )


async def http_error(request: Request, exc: HTTPException):
    return error_response(exc.status_code, "HTTP_ERROR", "Requisição não atendida.")


async def service_error(request: Request, exc: ServiceUnavailable):
    logger.warning("event=service_unavailable error=%s", type(exc).__name__)
    if request is not None and (
        request.url.path in {"/", "/tenis", "/admin", "/admin/login", "/admin/produtos"}
        or request.url.path.startswith("/tenis/")
    ):
        from app.api.pages import unavailable

        return unavailable(request)
    return error_response(503, "SERVICE_UNAVAILABLE", "Serviço temporariamente indisponível.")


async def unexpected_error(request: Request, exc: Exception):
    logger.error("event=unexpected_error")
    return error_response(500, "INTERNAL_ERROR", "Erro interno. Tente novamente.")


class ApiFault(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        self.message = message


async def api_fault(request: Request, exc: ApiFault):
    if request.url.path in {"/admin", "/admin/produtos"}:
        if exc.status == 401:
            return RedirectResponse(
                "/admin/login", status_code=303, headers={"Cache-Control": "no-store"}
            )
        if exc.status == 403:
            return HTMLResponse(
                "<h1>Acesso administrativo não autorizado.</h1>",
                status_code=403,
                headers={"Cache-Control": "no-store"},
            )
    return error_response(exc.status, exc.code, exc.message)


async def auth_error(request: Request, exc):
    from supabase_auth.errors import AuthRetryableError

    status = getattr(exc, "status", 401)
    if isinstance(exc, AuthRetryableError) or status >= 500:
        return await service_error(request, ServiceUnavailable())
    if status == 429:
        response = error_response(429, "RATE_LIMITED", "Limite de requisições excedido.")
        response.headers["Retry-After"] = "60"
        return response
    if request.url.path in {"/admin", "/admin/produtos"}:
        return RedirectResponse(
            "/admin/login", status_code=303, headers={"Cache-Control": "no-store"}
        )
    return error_response(401, "AUTHENTICATION_FAILED", "Autenticação necessária ou inválida.")


class SanitizedErrorsMiddleware:
    """Sanitiza falhas e preserva a renovação de sessão nas respostas de erro."""

    def __init__(self, app, media_origins=()):
        self.app = app
        media = " ".join(media_origins)
        self.policy = (
            "default-src 'self'; script-src 'self' https://static.sketchfab.com; "
            "style-src 'self' 'unsafe-inline'; "
            f"img-src 'self' data: blob: {media}; connect-src 'self' {media}; "
            "font-src 'self'; frame-src https://sketchfab.com; worker-src 'self' blob:; "
            "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        ).encode("ascii")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = False

        async def tracked_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                message["headers"].extend(
                    [
                        (b"content-security-policy", self.policy),
                        (b"x-content-type-options", b"nosniff"),
                        (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    ]
                )
                renewed = scope.get("state", {}).get("renewed_session_cookies", [])
                if message["status"] >= 400 and renewed:
                    headers = message["headers"]
                    cookies = {v.split(b"=", 1)[0] for k, v in headers if k == b"set-cookie"}
                    headers[:] = [(k, v) for k, v in headers if k != b"cache-control"]
                    headers.extend((k, v) for k, v in renewed if v.split(b"=", 1)[0] not in cookies)
                    headers.append((b"cache-control", b"no-store"))
                started = True
            await send(message)

        try:
            await self.app(scope, receive, tracked_send)
        except Exception:
            if started:
                raise RuntimeError("Resposta interrompida.") from None
            response = await unexpected_error(None, None)
            await response(scope, receive, tracked_send)
