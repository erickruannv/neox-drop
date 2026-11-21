import re
from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore", hide_input_in_errors=True
    )

    app_env: Literal["local", "test"] = "local"
    allowed_origin: str = "http://127.0.0.1:8000"
    test_connections_enabled: bool = False
    cookie_secret: SecretStr | None = Field(default=None, min_length=32)
    admin_refresh_max_age_seconds: int = Field(default=604800, ge=3600, le=604800)
    csrf_ttl_seconds: int = Field(default=3600, ge=60, le=86400)
    supabase_url: SecretStr | None = None
    supabase_key: SecretStr | None = None
    supabase_secret_key: SecretStr | None = None
    mongodb_uri: SecretStr | None = None
    mongodb_database: str = "neox_drop_test"
    upstash_redis_rest_url: SecretStr | None = None
    upstash_redis_rest_token: SecretStr | None = None
    request_timeout_seconds: float = Field(default=3.0, ge=0.001, le=30)
    redis_timeout_seconds: float = Field(default=1.0, gt=0, le=5)
    max_request_bytes: int = Field(default=65536, gt=0, le=1048576)
    rate_limit_requests: int = Field(default=60, gt=0)
    rate_limit_window_seconds: int = Field(default=60, gt=0)
    login_rate_limit_requests: int = Field(default=5, gt=0)
    cache_ttl_seconds: int = Field(default=300, ge=300, le=300)
    recent_ttl_seconds: int = Field(default=604800, ge=604800, le=604800)
    media_allowed_origins: list[str] = []

    @field_validator("allowed_origin")
    @classmethod
    def validate_origin(cls, value):
        url = urlsplit(value)
        if (
            url.scheme not in {"http", "https"}
            or not url.hostname
            or url.username
            or url.password
            or url.path not in {"", "/"}
            or url.query
            or url.fragment
        ):
            raise ValueError("Origem inválida.")
        return value.rstrip("/")

    @field_validator("media_allowed_origins")
    @classmethod
    def validate_media_origins(cls, values):
        origins = [cls.validate_origin(value) for value in values]
        if any(
            not re.fullmatch(r"https://(?:[A-Za-z0-9.-]+|\[[0-9a-fA-F:]+\])(?::[0-9]{1,5})?", value)
            for value in origins
        ):
            raise ValueError("Origem de mídia exige HTTPS.")
        for value in origins:
            _ = urlsplit(value).port
        return origins

    @field_validator("supabase_url", "upstash_redis_rest_url")
    @classmethod
    def validate_service_url(cls, value):
        if value is None:
            return value
        url = urlsplit(value.get_secret_value())
        if (
            not url.hostname
            or url.username
            or url.password
            or url.query
            or url.fragment
            or (
                url.scheme != "https"
                and not (url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1", "::1"})
            )
        ):
            raise ValueError("Serviço exige HTTPS ou loopback local.")
        return value

    @field_validator("mongodb_uri")
    @classmethod
    def validate_mongodb_uri(cls, value):
        if value is not None:
            url = urlsplit(value.get_secret_value())
            if url.scheme not in {"mongodb", "mongodb+srv"} or not url.netloc:
                raise ValueError("URI MongoDB inválida.")
            options = [(k.lower(), v.lower()) for k, v in parse_qsl(url.query)]
            for key, option in options:
                if key in {
                    "tlsinsecure",
                    "tlsallowinvalidcertificates",
                    "tlsallowinvalidhostnames",
                }:
                    if option != "false":
                        raise ValueError("Não desative a verificação TLS do MongoDB.")
            # A exceção loopback é só para seed único, nunca para lista que começa em localhost.
            remote = "," in url.netloc.rsplit("@", 1)[-1] or url.hostname not in {
                "localhost",
                "127.0.0.1",
                "::1",
            }
            tls = [v for k, v in options if k in {"tls", "ssl"}]
            if remote and (
                any(v != "true" for v in tls) or (url.scheme != "mongodb+srv" and not tls)
            ):
                raise ValueError("MongoDB remoto exige TLS verificado.")
        return value

    @model_validator(mode="after")
    def test_connections_only(self):
        if self.test_connections_enabled and self.app_env != "test":
            raise ValueError("Conexões exigem APP_ENV=test e autorização de ambiente de teste.")
        if (
            self.test_connections_enabled
            and self.mongodb_uri
            and not self.mongodb_database.endswith("_test")
        ):
            raise ValueError("Banco MongoDB autorizado nesta etapa precisa terminar em _test.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
