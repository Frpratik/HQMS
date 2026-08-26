from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("hqms.notifications")


class NotificationProvider(ABC):
    """Abstract interface for messaging notifications."""

    @abstractmethod
    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Log or dispatch message."""
        pass


class ConsoleMockNotificationProvider(NotificationProvider):
    """
    In-memory / logger notification provider for zero-cost patient queue tracking.
    Logs messages to stdout/logger without requiring external SMS or WhatsApp APIs.
    """

    def __init__(self):
        self.sent_sms_log = []

    async def send_sms(self, to_phone: str, message: str) -> bool:
        logger.info(f"[Queue Alert Log] To: {to_phone} | Message: {message}")
        self.sent_sms_log.append({"to": to_phone, "message": message})
        return True


def get_notification_provider(provider_type: Optional[str] = None) -> NotificationProvider:
    """Factory returning notification provider."""
    return ConsoleMockNotificationProvider()
