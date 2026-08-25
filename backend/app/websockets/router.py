import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.websockets.manager import connection_manager
from app.core.security import decode_access_token

logger = logging.getLogger("hqms.websockets.router")
ws_router = APIRouter()


@ws_router.websocket("/ws/v1/queues/{queue_id}")
async def websocket_queue_endpoint(
    websocket: WebSocket,
    queue_id: str,
    channel: str = Query("public"),
    token: str | None = Query(None),
):
    """
    Real-time WebSocket connection for live queue updates.
    - Public channel (default): unauthenticated, sanitized privacy-safe queue events.
    - Staff channel: authenticated via JWT query parameter, enriched queue events.
    """
    resolved_channel = "public"

    # Authenticate staff channel if requested
    if channel == "staff":
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        try:
            payload = decode_access_token(token)
            if not payload.get("sub"):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            resolved_channel = "staff"
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await connection_manager.connect(websocket, queue_id, resolved_channel)

    try:
        # Send initial connected greeting
        await websocket.send_json({
            "event": "CONNECTED",
            "queue_id": queue_id,
            "channel": resolved_channel,
        })

        while True:
            # Client heartbeat and command listener
            data_str = await websocket.receive_text()
            try:
                msg = json.loads(data_str)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, queue_id, resolved_channel)
    except Exception as exc:
        logger.warning(f"WebSocket unexpected connection termination: {exc}")
        connection_manager.disconnect(websocket, queue_id, resolved_channel)
