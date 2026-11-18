import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

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
    logger.warning("event=service_unavailable")
    return error_response(503, "SERVICE_UNAVAILABLE", "Serviço temporariamente indisponível.")


async def unexpected_error(request: Request, exc: Exception):
    logger.error("event=unexpected_error")
    return error_response(500, "INTERNAL_ERROR", "Erro interno. Tente novamente.")
