from typing import Dict, Any, Optional
from app.models.enums import QueueEventType, TokenStatus
from app.domain.notifications.providers import NotificationProvider, get_notification_provider


class NotificationEngine:
    """
    Evaluates queue trigger events, renders message templates, and dispatches via provider.
    """

    def __init__(self, provider: Optional[NotificationProvider] = None):
        self.provider = provider or get_notification_provider()

    @staticmethod
    def render_message(event_type: str, context: Dict[str, Any]) -> str:
        """Render human-readable, multilingual-ready SMS templates."""
        token_num = context.get("token_display_number", "Your Token")
        dept_name = context.get("department_name", "OPD")
        room_name = context.get("room_number", "Doctor Room")
        doctor_name = context.get("doctor_name", "Doctor")
        live_url = context.get("live_url", "")
        patients_ahead = context.get("patients_ahead", 0)

        if event_type == "TOKEN_CREATED":
            return (
                f"Welcome! Token {token_num} issued for {dept_name}. "
                f"Track your live turn here: {live_url}"
            )
        elif event_type == "RETURN_RECOMMENDED":
            return (
                f"Alert for Token {token_num}: Only {patients_ahead} patient(s) ahead. "
                f"Please head back to {room_name}."
            )
        elif event_type == "YOU_ARE_NEXT":
            return (
                f"Token {token_num}: You are NEXT in line! Please wait near {room_name}."
            )
        elif event_type == "TOKEN_CALLED":
            return (
                f"YOUR TURN! Token {token_num} is now called for {doctor_name} in {room_name}."
            )
        elif event_type == "QUEUE_PAUSED":
            return (
                f"Notice for Token {token_num}: Queue is temporarily paused. "
                f"Your estimated wait time has been updated: {live_url}"
            )

        return f"Update for Token {token_num}: Please check live status: {live_url}"

    async def dispatch_event_notification(
        self,
        phone_number: str,
        event_type: str,
        context: Dict[str, Any],
    ) -> bool:
        """Evaluate event and dispatch notification to recipient phone number."""
        if not phone_number:
            return False

        message = self.render_message(event_type, context)
        return await self.provider.send_sms(to_phone=phone_number, message=message)
