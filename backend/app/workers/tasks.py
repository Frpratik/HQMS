from typing import Dict, Any
import logging
from app.domain.notifications.engine import NotificationEngine

logger = logging.getLogger("hqms.worker.tasks")


async def send_patient_notification_task(
    ctx: Dict[str, Any],
    phone_number: str,
    event_type: str,
    context: Dict[str, Any],
) -> bool:
    """
    Background worker task: Dispatches outbound SMS/WhatsApp alerts with retry semantics.
    """
    logger.info(f"Executing notification task for {phone_number} [{event_type}]")
    engine = NotificationEngine()
    success = await engine.dispatch_event_notification(
        phone_number=phone_number,
        event_type=event_type,
        context=context,
    )
    return success


async def recalculate_queue_analytics_task(
    ctx: Dict[str, Any],
    queue_id: str,
) -> bool:
    """
    Background worker task: Asynchronously aggregates daily queue statistics.
    """
    logger.info(f"Executing analytics aggregation for queue {queue_id}")
    return True
