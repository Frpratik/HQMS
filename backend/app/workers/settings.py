from typing import Any, Dict
from arq.connections import RedisSettings
from app.core.config import settings
from app.workers.tasks import send_patient_notification_task, recalculate_queue_analytics_task


async def startup(ctx: Dict[str, Any]) -> None:
    """Worker process initialization."""
    pass


async def shutdown(ctx: Dict[str, Any]) -> None:
    """Worker process graceful shutdown."""
    pass


class WorkerSettings:
    """
    arq Worker configuration.
    Run with: arq app.workers.settings.WorkerSettings
    """

    functions = [
        send_patient_notification_task,
        recalculate_queue_analytics_task,
    ]

    redis_settings = RedisSettings(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        database=settings.REDIS_DB,
    )

    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 20
    job_timeout = 60
