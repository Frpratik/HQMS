from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Info
    PROJECT_NAME: str = "HQMS - Smart Hospital Virtual Queue"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "hqms-development-secret-key-must-be-at-least-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for staff sessions

    # Database Configuration (SQLite local standalone / PostgreSQL in Docker)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "hqms_admin"
    POSTGRES_PASSWORD: str = "hqms_secure_password"
    POSTGRES_DB: str = "hqms_db"
    DATABASE_URL: str | None = None


    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str) and v:
            url = v.strip()
            # Normalize driver for async SQLAlchemy
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

            # asyncpg requires ssl=require rather than sslmode=require
            if "sslmode=" in url:
                url = url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer")
            if "channel_binding=" in url:
                # Remove channel_binding parameter
                import re
                url = re.sub(r"[?&]channel_binding=[^&]+", "", url)
                if "?" not in url and "&" in url:
                    url = url.replace("&", "?", 1)
            return url
        data = info.data
        server = data.get("POSTGRES_SERVER", "localhost")
        if server and server != "localhost":
            user = data.get("POSTGRES_USER", "hqms_admin")
            password = data.get("POSTGRES_PASSWORD", "hqms_secure_password")
            port = data.get("POSTGRES_PORT", 5432)
            db = data.get("POSTGRES_DB", "hqms_db")
            return f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db}"
        return "sqlite+aiosqlite:///./hqms_local.db"



    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None
    REDIS_DB: int = 0
    REDIS_URL: str | None = None

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str) and v:
            return v
        data = info.data
        host = data.get("REDIS_HOST", "localhost")
        port = data.get("REDIS_PORT", 6379)
        db = data.get("REDIS_DB", 0)
        password = data.get("REDIS_PASSWORD")
        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    # Queue Engine Defaults
    DEFAULT_CONSULTATION_TIME_MINUTES: int = 10
    DEFAULT_REJOIN_OFFSET: int = 2
    DEFAULT_AWAY_TIMEOUT_MINUTES: int = 30
    ETA_CONFIDENCE_INTERVAL_PERCENTAGE: int = 20

    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    # Notification Providers
    NOTIFICATION_PROVIDER: str = "mock"  # mock | twilio | fast2sms | whatsapp
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None

    FAST2SMS_API_KEY: str | None = None

    WHATSAPP_API_TOKEN: str | None = None
    WHATSAPP_PHONE_NUMBER_ID: str | None = None

    # Email & SMTP Settings
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "notifications@hqms.health"
    EMAILS_FROM_NAME: str = "HQMS Healthcare Network"
    RESEND_API_KEY: str | None = None
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
