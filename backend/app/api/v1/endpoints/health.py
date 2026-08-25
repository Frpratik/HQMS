from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis

router = APIRouter()


@router.get("/health", summary="System Health & Connectivity Check")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> Dict[str, Any]:
    """
    Performs live connectivity checks against PostgreSQL and Redis.
    """
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    redis_status = "healthy"
    try:
        pong = await redis.ping()
        if not pong:
            redis_status = "unhealthy: ping returned False"
    except Exception as exc:
        redis_status = f"unhealthy: {str(exc)}"

    overall_healthy = db_status == "healthy" and redis_status == "healthy"

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
        "components": {
            "database": db_status,
            "redis": redis_status,
        },
    }
