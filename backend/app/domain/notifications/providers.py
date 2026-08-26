from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
import httpx

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


class Fast2SMSNotificationProvider(NotificationProvider):
    """
    Fast2SMS Provider (Cost-effective SMS Gateway for India).
    """

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def send_sms(self, to_phone: str, message: str) -> bool:
        if not self.api_key:
            logger.warning("[Fast2SMS] Missing FAST2SMS_API_KEY. Skipping dispatch.")
            return False

        # Normalize 10-digit Indian phone number
        clean_phone = to_phone.replace("+91", "").replace("-", "").strip()[-10:]

        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {"authorization": self.api_key}
        payload = {
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": clean_phone,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200 and res.json().get("return"):
                    logger.info(f"[Fast2SMS] Dispatched SMS to {clean_phone}")
                    return True
                else:
                    logger.error(f"[Fast2SMS] API error: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"[Fast2SMS] Network exception: {e}")
            return False

    async def send_whatsapp(self, to_phone: str, template_name: str, template_params: Dict[str, Any]) -> bool:
        return False


class WhatsAppCloudApiNotificationProvider(NotificationProvider):
    """
    Meta WhatsApp Cloud API (Free 1,000 monthly conversations).
    """

    def __init__(self, access_token: str, phone_number_id: str):
        self.access_token = access_token
        self.phone_number_id = phone_number_id

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Forwards message dispatch through Meta WhatsApp Cloud API."""
        return await self.send_whatsapp(to_phone=to_phone, template_name="text", template_params={"text": message})

    async def send_whatsapp(self, to_phone: str, template_name: str, template_params: Dict[str, Any]) -> bool:
        if not self.access_token or not self.phone_number_id:
            logger.warning("[WhatsApp Cloud API] Missing API credentials. Skipping dispatch.")
            return False

        clean_phone = to_phone.replace("+", "").replace("-", "").strip()
        url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {"body": template_params.get("text", "HQMS Turn Update")},
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    logger.info(f"[WhatsApp Cloud API] Dispatched message to {clean_phone}")
                    return True
                else:
                    logger.error(f"[WhatsApp Cloud API] Error: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"[WhatsApp Cloud API] Network exception: {e}")
            return False


class TwilioNotificationProvider(NotificationProvider):
    """
    Twilio SMS and WhatsApp Gateway Provider.
    """

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number

    async def send_sms(self, to_phone: str, message: str) -> bool:
        if not self.account_sid or not self.auth_token or not self.from_number:
            logger.warning("Twilio credentials not configured; SMS dispatch skipped.")
            return False

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        data = {
            "From": self.from_number,
            "To": to_phone,
            "Body": message,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data, auth=(self.account_sid, self.auth_token))
                if res.status_code in (200, 201):
                    logger.info(f"[Twilio SMS] Dispatched to {to_phone}")
                    return True
                else:
                    logger.error(f"[Twilio SMS] Error: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"[Twilio SMS] Exception: {e}")
            return False

    async def send_whatsapp(self, to_phone: str, template_name: str, template_params: Dict[str, Any]) -> bool:
        if not self.account_sid or not self.auth_token:
            return False
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        data = {
            "From": f"whatsapp:{self.from_number}",
            "To": f"whatsapp:{to_phone}",
            "Body": template_params.get("text", "HQMS Notification"),
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data, auth=(self.account_sid, self.auth_token))
                return res.status_code in (200, 201)
        except Exception:
            return False


def get_notification_provider(provider_type: Optional[str] = None) -> NotificationProvider:
    """Factory creating configured notification gateway provider."""
    from app.core.config import settings

    selected = provider_type or settings.NOTIFICATION_PROVIDER

    if selected == "fast2sms" and settings.FAST2SMS_API_KEY:
        return Fast2SMSNotificationProvider(api_key=settings.FAST2SMS_API_KEY)
    elif selected == "whatsapp" and settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
        return WhatsAppCloudApiNotificationProvider(
            access_token=settings.WHATSAPP_API_TOKEN,
            phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
        )
    elif selected == "twilio" and settings.TWILIO_ACCOUNT_SID:
        return TwilioNotificationProvider(
            account_sid=settings.TWILIO_ACCOUNT_SID,
            auth_token=settings.TWILIO_AUTH_TOKEN or "",
            from_number=settings.TWILIO_FROM_NUMBER or "",
        )
    return ConsoleMockNotificationProvider()
