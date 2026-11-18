from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.api.pages import router as pages_router
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    ServiceUnavailable,
    http_error,
    service_error,
    unexpected_error,
    validation_error,
)
from app.core.security import BodyLimitMiddleware, RateLimitMiddleware
from app.db.health import check_connections
from app.schemas.common import Health


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else get_settings()
    application = FastAPI(
        title="NEOX drop", version="0.1.0", docs_url=None, redoc_url=None, openapi_url=None
    )
    application.state.settings = settings
    application.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_request_bytes)
    application.add_middleware(RateLimitMiddleware, settings=settings)
    application.add_exception_handler(RequestValidationError, validation_error)
    application.add_exception_handler(HTTPException, http_error)
    application.add_exception_handler(ServiceUnavailable, service_error)
    application.add_exception_handler(Exception, unexpected_error)
    application.include_router(pages_router)

    @application.get(
        "/health",
        operation_id="health",
        response_model=Health,
        responses={503: {"model": Health}},
    )
    async def health():
        statuses = await check_connections(settings)
        if not statuses["supabase"] or not statuses["mongodb"]:
            return JSONResponse(status_code=503, content={"status": "unavailable"})
        return Health(status="ok" if statuses["redis"] else "degraded")

    return application


app = create_app()
