import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def contract():
    return json.loads((ROOT / "docs/contracts/openapi.json").read_text())


@pytest.fixture(scope="session")
def examples():
    return json.loads((ROOT / "docs/contracts/examples.json").read_text())


@pytest.fixture(autouse=True)
def isolate_settings_environment(monkeypatch):
    from app.core.config import Settings

    for name in Settings.model_fields:
        monkeypatch.delenv(name.upper(), raising=False)
