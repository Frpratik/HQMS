import pytest
import uuid
import json
from starlette.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.security import create_access_token
from app.websockets.manager import connection_manager


def test_websocket_public_connection_and_heartbeat():
    """Verify WebSocket connection to public channel and ping/pong heartbeat."""
    queue_id = str(uuid.uuid4())
    client = TestClient(app)

    with client.websocket_connect(f"/ws/v1/queues/{queue_id}?channel=public") as websocket:
        # Receive initial greeting
        greeting = websocket.receive_json()
        assert greeting["event"] == "CONNECTED"
        assert greeting["queue_id"] == queue_id
        assert greeting["channel"] == "public"

        # Send ping and receive pong
        websocket.send_text(json.dumps({"type": "ping"}))
        pong = websocket.receive_json()
        assert pong["type"] == "pong"


def test_websocket_staff_channel_authentication():
    """Verify staff channel rejects unauthenticated requests and permits valid JWTs."""
    queue_id = str(uuid.uuid4())
    client = TestClient(app)

    # 1. Unauthenticated connection to staff channel rejected
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/v1/queues/{queue_id}?channel=staff") as ws:
            ws.receive_json()

    # 2. Authenticated connection to staff channel succeeds
    staff_user_id = str(uuid.uuid4())
    token = create_access_token(subject=staff_user_id, role="DOCTOR")

    with client.websocket_connect(f"/ws/v1/queues/{queue_id}?channel=staff&token={token}") as websocket:
        greeting = websocket.receive_json()
        assert greeting["event"] == "CONNECTED"
        assert greeting["channel"] == "staff"


@pytest.mark.asyncio
async def test_websocket_manager_broadcast():
    """Verify connection manager broadcast dispatches payloads to registered queues."""
    queue_id = str(uuid.uuid4())
    client = TestClient(app)

    with client.websocket_connect(f"/ws/v1/queues/{queue_id}?channel=public") as websocket:
        greeting = websocket.receive_json()
        assert greeting["event"] == "CONNECTED"

        # Trigger broadcast via connection manager
        event_payload = {
            "event": "TOKEN_CALLED",
            "token_display_number": "A-001",
        }
        await connection_manager.broadcast_to_channel(queue_id, "public", event_payload)

        received = websocket.receive_json()
        assert received["event"] == "TOKEN_CALLED"
        assert received["token_display_number"] == "A-001"


@pytest.mark.asyncio
async def test_websocket_publisher_tenant_namespacing():
    """Verify EventPublisher broadcasts tenant-scoped payloads to local WS and Redis Pub/Sub."""
    from app.websockets.publisher import event_publisher

    queue_id = str(uuid.uuid4())
    hospital_id = str(uuid.uuid4())
    client = TestClient(app)

    with client.websocket_connect(f"/ws/v1/queues/{queue_id}?channel=public") as websocket:
        greeting = websocket.receive_json()
        assert greeting["event"] == "CONNECTED"

        await event_publisher.publish_event(
            queue_id=queue_id,
            event_type="QUEUE_PAUSED",
            public_data={"reason": "Emergency Case", "status": "PAUSED"},
            hospital_id=hospital_id,
        )

        msg = websocket.receive_json()
        assert msg["event"] == "QUEUE_PAUSED"
        assert msg["hospital_id"] == hospital_id
        assert msg["data"]["reason"] == "Emergency Case"

