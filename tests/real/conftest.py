import os

import pytest

from app.core.config import Settings


@pytest.fixture
def real_settings():
    if os.getenv("RUN_REAL_INTEGRATION") != "1":
        pytest.skip("Bancos reais não autorizados/configurados: RUN_REAL_INTEGRATION=1 ausente.")
    settings = Settings()
    if settings.app_env != "test" or not settings.test_connections_enabled:
        pytest.fail("Testes reais exigem APP_ENV=test e TEST_CONNECTIONS_ENABLED=true.")
    return settings
