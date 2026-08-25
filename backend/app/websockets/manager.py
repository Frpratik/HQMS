import json
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket

logger = logging.getLogger("hqms.websockets")


class ConnectionManager:
    """
    Manages active WebSocket connections grouped by queue_id and channel partition (public vs staff).
    """

    def __init__(self):
        # { queue_id: { "public": {ws1, ws2}, "staff": {ws3, ws4} } }
        self._connections: Dict[str, Dict[str, Set[WebSocket]]] = {}

    async def connect(self, websocket: WebSocket, queue_id: str, channel: str = "public") -> None:
        """Accept WebSocket connection and register under the designated queue channel."""
        await websocket.accept()
        if queue_id not in self._connections:
            self._connections[queue_id] = {"public": set(), "staff": set()}
        
        target_channel = "staff" if channel == "staff" else "public"
        self._connections[queue_id][target_channel].add(websocket)
        logger.info(f"WebSocket client connected to queue '{queue_id}' on channel '{target_channel}'. Active: {len(self._connections[queue_id][target_channel])}")

    def disconnect(self, websocket: WebSocket, queue_id: str, channel: str = "public") -> None:
        """Unregister a disconnected WebSocket."""
        target_channel = "staff" if channel == "staff" else "public"
        if queue_id in self._connections and target_channel in self._connections[queue_id]:
            self._connections[queue_id][target_channel].discard(websocket)
            if not self._connections[queue_id]["public"] and not self._connections[queue_id]["staff"]:
                del self._connections[queue_id]
        logger.info(f"WebSocket client disconnected from queue '{queue_id}' [{target_channel}].")

    async def broadcast_to_channel(self, queue_id: str, channel: str, message: dict) -> None:
        """Broadcast JSON message to all connected clients in a specific queue channel."""
        if queue_id not in self._connections:
            return

        target_sockets = set(self._connections[queue_id].get(channel, set()))
        if not target_sockets:
            return

        payload_str = json.dumps(message)
        disconnected = set()

        for ws in target_sockets:
            try:
                await ws.send_text(payload_str)
            except Exception as exc:
                logger.warning(f"Error sending to websocket client: {exc}")
                disconnected.add(ws)

        for dead_ws in disconnected:
            self.disconnect(dead_ws, queue_id, channel)

    async def broadcast_to_queue(self, queue_id: str, public_message: dict, staff_message: Optional[dict] = None) -> None:
        """Broadcast appropriate payloads to both public and staff subscribers of a queue."""
        await self.broadcast_to_channel(queue_id, "public", public_message)
        await self.broadcast_to_channel(queue_id, "staff", staff_message or public_message)


connection_manager = ConnectionManager()
