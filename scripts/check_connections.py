"""Diagnóstico somente leitura para bancos de teste explicitamente autorizados."""

import asyncio
import json

from pydantic import ValidationError

from app.core.config import Settings
from app.db.health import check_connections


def main() -> int:
    try:
        settings = Settings()
    except ValidationError:
        print("Configuração inválida; revise as variáveis sem expor seus valores.")
        return 2
    if settings.app_env != "test" or not settings.test_connections_enabled:
        print("Recusado: APP_ENV=test e TEST_CONNECTIONS_ENABLED=true exigem autorização de teste.")
        return 2
    statuses = asyncio.run(check_connections(settings))
    print(json.dumps(statuses))
    return 0 if all(statuses.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
