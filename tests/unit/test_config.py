import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_empty_local_config_is_safe():
    settings = Settings(_env_file=None)
    assert settings.app_env == "local"
    assert settings.test_connections_enabled is False
    assert settings.mongodb_uri is None
    assert settings.cache_ttl_seconds == 300
    assert settings.recent_ttl_seconds == 604800


def test_settings_from_environment_and_redaction(monkeypatch):
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017/neox_test")
    monkeypatch.setenv("SUPABASE_KEY", "test-only-secret")
    settings = Settings(_env_file=None)
    assert settings.mongodb_uri.get_secret_value().startswith("mongodb://")
    assert "test-only-secret" not in repr(settings)
    assert "localhost" not in repr(settings)


@pytest.mark.parametrize(
    "values",
    [
        {"request_timeout_seconds": 0},
        {"request_timeout_seconds": 0.0001},
        {"cookie_secret": "short"},
        {"max_request_bytes": 0},
        {"rate_limit_requests": 0},
        {"app_env": "production"},
        {"test_connections_enabled": True},
        {"allowed_origin": "https://example.invalid/path"},
        {"mongodb_uri": "https://example.invalid"},
        {"mongodb_uri": "mongodb://external.invalid/db"},
        {"mongodb_uri": "mongodb://localhost:27017,external.invalid:27017/?tls=false"},
        {"mongodb_uri": "mongodb+srv://cluster.invalid/?tls=false"},
        {"mongodb_uri": "mongodb+srv://cluster.invalid/?ssl=false"},
        {"mongodb_uri": "mongodb+srv://cluster.invalid/?tlsInsecure=true"},
        {"mongodb_uri": "mongodb+srv://cluster.invalid/?tlsAllowInvalidCertificates=true"},
        {"mongodb_uri": "mongodb+srv://cluster.invalid/?tlsAllowInvalidHostnames=true"},
        {"mongodb_uri": "mongodb+srv://cluster.invalid/?tls=true&TLS=false"},
        {
            "mongodb_uri": "mongodb+srv://cluster.invalid",
            "mongodb_database": "shop",
            "app_env": "test",
            "test_connections_enabled": True,
        },
        {"supabase_url": "http://external.invalid"},
    ],
)
def test_unsafe_configuration_rejected(values):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)


def test_example_env_loads_without_credentials():
    settings = Settings(_env_file=".env.example")
    assert settings.test_connections_enabled is False
    assert settings.supabase_key is None
    assert settings.mongodb_uri is None


@pytest.mark.parametrize(
    "uri", ["mongodb+srv://cluster.invalid/", "mongodb://host.invalid/?tls=true"]
)
def test_secure_remote_mongodb_configuration(uri):
    assert Settings(_env_file=None, mongodb_uri=uri).mongodb_uri
