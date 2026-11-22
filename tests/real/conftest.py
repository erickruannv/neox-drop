import os

import pytest
from dotenv import dotenv_values

from app.core.config import Settings


@pytest.fixture
def real_settings():
    if os.getenv("RUN_REAL_INTEGRATION") != "1":
        pytest.skip("Bancos reais não autorizados/configurados: RUN_REAL_INTEGRATION=1 ausente.")
    settings = Settings()
    if settings.app_env != "test" or not settings.test_connections_enabled:
        pytest.fail("Testes reais exigem APP_ENV=test e TEST_CONNECTIONS_ENABLED=true.")
    if settings.mongodb_database != "neox_drop_test":
        pytest.fail("Esta rodada permite apenas o banco neox_drop_test.")
    return settings


@pytest.fixture
def real_account(real_settings):
    # Lido somente depois do opt-in; não carrega .env em os.environ nem habilita testes.
    local = dotenv_values(".env")

    def account(kind):
        prefix = f"NEOX_TEST_{kind.upper()}"
        email = os.environ.get(f"{prefix}_EMAIL", local.get(f"{prefix}_EMAIL"))
        password = os.environ.get(f"{prefix}_PASSWORD", local.get(f"{prefix}_PASSWORD"))
        if not email or not password:
            pytest.fail(
                "Configure a conta de teste no .env privado; não envie credenciais no chat."
            )
        return {"email": email, "password": password}

    return account
