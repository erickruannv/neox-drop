from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from httpx import HTTPError
from postgrest.exceptions import APIError
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException
from supabase_auth.errors import AuthError

from app.api.admin_products import router as admin_products_router
from app.api.auth import router as auth_router
from app.api.checkout import router as checkout_router
from app.api.pages import router as pages_router
from app.api.products import router as products_router
from app.api.recent import router as recent_router
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    ApiFault,
    SanitizedErrorsMiddleware,
    ServiceUnavailable,
    api_fault,
    auth_error,
    http_error,
    service_error,
    unexpected_error,
    validation_error,
)
from app.core.security import BodyLimitMiddleware, RateLimitMiddleware
from app.db.health import check_connections
from app.schemas.common import Health

STATIC_DIR = Path(__file__).resolve().parent / "static"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else get_settings()
    application = FastAPI(
        title="NEOX drop", version="0.1.0", docs_url=None, redoc_url=None, openapi_url=None
    )
    application.state.settings = settings
    application.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_request_bytes)
    application.add_middleware(RateLimitMiddleware, settings=settings)
    application.add_middleware(SanitizedErrorsMiddleware)
    application.add_exception_handler(RequestValidationError, validation_error)
    application.add_exception_handler(HTTPException, http_error)
    application.add_exception_handler(ServiceUnavailable, service_error)
    application.add_exception_handler(Exception, unexpected_error)
    application.add_exception_handler(ApiFault, api_fault)
    application.add_exception_handler(AuthError, auth_error)
    for error_type in (HTTPError, APIError, PyMongoError):
        application.add_exception_handler(error_type, service_error)
    application.include_router(pages_router)
    application.include_router(auth_router)
    application.include_router(admin_products_router)
    application.include_router(products_router)
    application.include_router(recent_router)
    application.include_router(checkout_router)
    application.mount("/static", StaticFiles(directory=STATIC_DIR, check_dir=False), name="static")

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
