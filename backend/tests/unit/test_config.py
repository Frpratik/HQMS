from app.core.config import Settings


def test_settings_default_values():
    """Verify settings initialize with expected defaults and assemble URLs dynamically when isolated."""
    settings = Settings(
        _env_file=None,
        POSTGRES_SERVER="db.hospital.internal",
        POSTGRES_PORT=5432,
        POSTGRES_USER="test_user",
        POSTGRES_PASSWORD="test_password",
        POSTGRES_DB="test_db",
        REDIS_HOST="redis.internal",
        REDIS_PORT=6379,
    )

    assert settings.DATABASE_URL == "postgresql+asyncpg://test_user:test_password@db.hospital.internal:5432/test_db"
    assert settings.REDIS_URL == "redis://redis.internal:6379/0"
    assert settings.DEFAULT_CONSULTATION_TIME_MINUTES == 10
    assert settings.DEFAULT_REJOIN_OFFSET == 2
    assert settings.API_V1_STR == "/api/v1"


def test_settings_explicit_database_url():
    """Verify explicit DATABASE_URL takes priority."""
    custom_url = "postgresql+asyncpg://custom:pass@custom-host:5433/custom_db"
    settings = Settings(_env_file=None, DATABASE_URL=custom_url)
    assert settings.DATABASE_URL == custom_url



def test_cors_origins_parsing():
    """Verify CORS origins string is parsed into list."""
    settings = Settings(
        BACKEND_CORS_ORIGINS=["http://localhost:3000", "https://app.hospital.com"]
    )
    assert len(settings.BACKEND_CORS_ORIGINS) == 2
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
