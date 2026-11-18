import secrets
from time import monotonic

from fastapi import HTTPException, Request

from app.core.exceptions import error_response


def require_csrf(request: Request) -> None:
    settings = request.app.state.settings
    cookie = request.cookies.get("neox_csrf")
    token = request.headers.get("x-csrf-token")
    if (
        request.headers.get("origin") != settings.allowed_origin
        or not cookie
        or not token
        or not cookie.isascii()
        or not token.isascii()
        or not secrets.compare_digest(cookie, token)
    ):
        raise HTTPException(status_code=403)


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
