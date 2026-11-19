import hashlib
import hmac
import secrets
from time import monotonic, time

from fastapi import Request

from app.core.exceptions import ApiFault, ServiceUnavailable, error_response


def _csrf_signature(settings, value: str, session: str) -> str:
    if not settings.cookie_secret:
        raise ServiceUnavailable()
    binding = hashlib.sha256(session.encode()).hexdigest()
    return hmac.new(
        settings.cookie_secret.get_secret_value().encode(),
        f"{value}:{binding}".encode(),
        hashlib.sha256,
    ).hexdigest()


def issue_csrf(settings, response, session: str = "") -> str:
    value = f"{secrets.token_hex(16)}.{int(time())}"
    token = f"{value}.{_csrf_signature(settings, value, session)}"
    response.set_cookie(
        "neox_csrf",
        token,
        max_age=settings.csrf_ttl_seconds,
        httponly=True,
        secure=settings.allowed_origin.startswith("https://"),
        samesite="lax",
    )
    return token


def require_csrf(request: Request) -> None:
    settings = request.app.state.settings
    cookie = request.cookies.get("neox_csrf", "")
    token = request.headers.get("x-csrf-token", "")
    valid = False
    if (
        request.headers.get("origin") == settings.allowed_origin
        and token
        and len(token) < 160
        and token.isascii()
        and cookie.isascii()
        and secrets.compare_digest(cookie, token)
    ):
        parts = token.split(".")
        if len(parts) == 3 and parts[1].isdigit():
            age = time() - int(parts[1])
            value = ".".join(parts[:2])
            signature = _csrf_signature(
                settings, value, request.cookies.get("neox_admin_session", "")
            )
            valid = 0 <= age <= settings.csrf_ttl_seconds and hmac.compare_digest(
                signature, parts[2]
            )
    if not valid:
        raise ApiFault(403, "FORBIDDEN", "Requisição não autorizada.")


class BodyLimitMiddleware:
    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] in {"GET", "HEAD", "OPTIONS"}:
            await self.app(scope, receive, send)
            return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                await error_response(
                    400, "REQUEST_TOO_LARGE", "Requisição excede o limite permitido."
                )(scope, receive, send)
                return
            if not message.get("more_body", False):
                break
        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


class RateLimitMiddleware:
    def __init__(self, app, settings):
        self.app = app
        self.settings = settings
        self.window_start = monotonic()
        self.counts = {}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/api/"):
            await self.app(scope, receive, send)
            return
        now = monotonic()
        if now - self.window_start >= self.settings.rate_limit_window_seconds:
            self.counts.clear()
            self.window_start = now
        login = scope["path"] == "/api/admin/auth/login"
        limit = (
            self.settings.login_rate_limit_requests if login else self.settings.rate_limit_requests
        )
        # shortcut: contador por processo local; adotar backend compartilhado antes de multiworker.
        key = ((scope.get("client") or ("unknown", 0))[0], login)
        count = self.counts.get(key, 0)
        if count >= limit or (key not in self.counts and len(self.counts) >= 10000):
            response = error_response(429, "RATE_LIMITED", "Limite de requisições excedido.")
            response.headers["Retry-After"] = str(self.settings.rate_limit_window_seconds)
            await response(scope, receive, send)
            return
        self.counts[key] = count + 1
        await self.app(scope, receive, send)
