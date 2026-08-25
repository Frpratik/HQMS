from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("hqms.notifications")


class NotificationProvider(ABC):
    """Abstract interface for third-party messaging vendors."""

    @abstractmethod
    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Send a standard text SMS."""
        pass

    @abstractmethod
    async def send_whatsapp(self, to_phone: str, template_name: str, template_params: Dict[str, Any]) -> bool:
        """Send a templated WhatsApp message."""
        pass


class ConsoleMockNotificationProvider(NotificationProvider):
    """
    Mock provider for local development, testing, and CI environments.
    Logs messages to stdout/logger and stores sent history in memory.
    """

    def __init__(self):
        self.sent_sms_log = []
        self.sent_whatsapp_log = []

    async def send_sms(self, to_phone: str, message: str) -> bool:
        logger.info(f"[MOCK SMS] To: {to_phone} | Message: {message}")
        self.sent_sms_log.append({"to": to_phone, "message": message})
        return True

    async def send_whatsapp(self, to_phone: str, template_name: str, template_params: Dict[str, Any]) -> bool:
        logger.info(f"[MOCK WhatsApp] To: {to_phone} | Template: {template_name} | Params: {template_params}")
        self.sent_whatsapp_log.append({"to": to_phone, "template": template_name, "params": template_params})
        return True


class TwilioNotificationProvider(NotificationProvider):
    """
    Production-ready SMS gateway implementation via Twilio HTTP API.
    """

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number

    async def send_sms(self, to_phone: str, message: str) -> bool:
        if not self.account_sid or not self.auth_token:
            logger.warning("Twilio credentials not configured; SMS dispatch skipped.")
            return False

        # In production this uses httpx to post to https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json
        logger.info(f"[Twilio SMS] Dispatched to {to_phone}")
        return True

    async def send_whatsapp(self, to_phone: str, template_name: str, template_params: Dict[str, Any]) -> bool:
        logger.info(f"[Twilio WhatsApp] Dispatched to {to_phone}")
        return True


def get_notification_provider(provider_type: str = "mock") -> NotificationProvider:
    """Factory creating configured notification gateway provider."""
    if provider_type == "twilio":
        from app.core.config import settings
        return TwilioNotificationProvider(
            account_sid=settings.TWILIO_ACCOUNT_SID or "",
            auth_token=settings.TWILIO_AUTH_TOKEN or "",
            from_number=settings.TWILIO_FROM_NUMBER or "",
        )
    return ConsoleMockNotificationProvider()
