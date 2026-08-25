import pytest
from app.domain.notifications.providers import ConsoleMockNotificationProvider
from app.domain.notifications.engine import NotificationEngine
from app.workers.tasks import send_patient_notification_task


def test_notification_template_rendering():
    """Verify template formatting for critical queue triggers."""
    context = {
        "token_display_number": "CARD-014",
        "department_name": "Cardiology OPD",
        "room_number": "Room 102",
        "doctor_name": "Dr. Sharma",
        "live_url": "https://hqms.hospital.com/q/q7K9mX2vL1pZb4RtY9wQa",
        "patients_ahead": 2,
    }

    # 1. Token Created
    msg_created = NotificationEngine.render_message("TOKEN_CREATED", context)
    assert "CARD-014" in msg_created
    assert "Cardiology OPD" in msg_created
    assert "https://hqms.hospital.com" in msg_created

    # 2. Return Recommended
    msg_return = NotificationEngine.render_message("RETURN_RECOMMENDED", context)
    assert "CARD-014" in msg_return
    assert "2 patient(s) ahead" in msg_return
    assert "Room 102" in msg_return

    # 3. Token Called
    msg_called = NotificationEngine.render_message("TOKEN_CALLED", context)
    assert "YOUR TURN" in msg_called
    assert "Dr. Sharma" in msg_called
    assert "Room 102" in msg_called


@pytest.mark.asyncio
async def test_notification_engine_dispatch_and_mock_history():
    """Verify mock provider captures sent SMS messages."""
    mock_provider = ConsoleMockNotificationProvider()
    engine = NotificationEngine(provider=mock_provider)

    context = {
        "token_display_number": "ORT-003",
        "room_number": "Room 205",
        "doctor_name": "Dr. Patel",
    }

    success = await engine.dispatch_event_notification(
        phone_number="+919876543210",
        event_type="TOKEN_CALLED",
        context=context,
    )
    assert success is True
    assert len(mock_provider.sent_sms_log) == 1
    assert mock_provider.sent_sms_log[0]["to"] == "+919876543210"
    assert "ORT-003" in mock_provider.sent_sms_log[0]["message"]


@pytest.mark.asyncio
async def test_background_worker_notification_task():
    """Verify background worker task executes cleanly."""
    ctx = {}
    success = await send_patient_notification_task(
        ctx=ctx,
        phone_number="+919988776655",
        event_type="YOU_ARE_NEXT",
        context={"token_display_number": "ENT-001", "room_number": "Room 101"},
    )
    assert success is True
