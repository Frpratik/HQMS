from typing import AsyncGenerator
import redis.asyncio as aioredis
from app.core.config import settings

redis_pool = aioredis.ConnectionPool.from_url(
    str(settings.REDIS_URL),
    max_connections=20,
    decode_responses=True,
)

redis_client = aioredis.Redis(connection_pool=redis_pool)


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """
    FastAPI dependency yielding an async Redis connection.
    """
    yield redis_client


async def check_redis_health() -> bool:
    """
    Check if Redis is accessible.
    """
    try:
        response = await redis_client.ping()
        return response is True
    except Exception:
        return False
