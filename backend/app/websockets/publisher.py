import json
import logging
from typing import Dict, Any, Optional
from app.core.redis import redis_client
from app.websockets.manager import connection_manager

logger = logging.getLogger("hqms.publisher")


class EventPublisher:
    """
    Publishes real-time queue domain events via Redis Pub/Sub and WebSocket manager.
    """

    @staticmethod
    async def publish_event(
        queue_id: str,
        event_type: str,
        public_data: Dict[str, Any],
        staff_data: Optional[Dict[str, Any]] = None,
        hospital_id: Optional[str] = None,
    ) -> None:
        """
        Broadcasts event to both Redis channel and active local WebSocket connections with tenant namespacing.
        """
        public_payload = {
            "event": event_type,
            "queue_id": queue_id,
            "hospital_id": hospital_id,
            "data": public_data,
        }
        staff_payload = {
            "event": event_type,
            "queue_id": queue_id,
            "hospital_id": hospital_id,
            "data": staff_data or public_data,
        }

        # 1. Local WebSocket Manager broadcast
        await connection_manager.broadcast_to_channel(queue_id, "public", public_payload)
        await connection_manager.broadcast_to_channel(queue_id, "staff", staff_payload)

        # 2. Redis Pub/Sub broadcast across cluster instances with tenant channel namespacing
        try:
            if hospital_id:
                public_channel = f"tenant:{hospital_id}:queue:{queue_id}:public"
                staff_channel = f"tenant:{hospital_id}:queue:{queue_id}:staff"
            else:
                public_channel = f"queue:{queue_id}:public"
                staff_channel = f"queue:{queue_id}:staff"

            await redis_client.publish(public_channel, json.dumps(public_payload))
            await redis_client.publish(staff_channel, json.dumps(staff_payload))
        except Exception as exc:
            # Fallback gracefully if Redis is temporarily unavailable in dev/test
            logger.debug(f"Redis publish skipped or failed: {exc}")



event_publisher = EventPublisher()
