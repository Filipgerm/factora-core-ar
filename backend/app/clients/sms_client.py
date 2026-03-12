from sib_api_v3_sdk import Configuration, ApiClient
from sib_api_v3_sdk.rest import ApiException
from sib_api_v3_sdk.api import TransactionalSMSApi
from sib_api_v3_sdk.models import SendTransacSms
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class BrevoSMSClient:

    def __init__(self):
        cfg = Configuration()
        cfg.api_key["api-key"] = settings.BREVO_API_KEY
        self._sender = settings.BREVO_SENDER_NAME
        self._sms_api = TransactionalSMSApi(ApiClient(cfg))

    def send_sms(self, to_number: str, message: str) -> bool:
        """
        Send verification code via SMS

        @param to_number: Full phone number with country code
        @param message: Message with Verification code to send
        @returns: True if SMS was sent successfully, False otherwise
        """
        sms = SendTransacSms(
            sender=self._sender,
            recipient=to_number,
            content=message,
            type="transactional",
        )

        try:
            resp = self._sms_api.send_transac_sms(sms)
            message_id = (
                getattr(resp, "message_id", None)
                or getattr(resp, "messageId", None)
                or str(resp)
            )
            logger.info(
                "Brevo SMS sent/enqueued ok | recipient=%s | message_id=%s",
                recipient,
                message_id,
            )
            return {"success": True, "message_id": message_id}
        except ApiException as e:
            logger.error(f"Brevo API error sending SMS to {to_number}: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_number}: {str(e)}")
            return {"success": False, "error": str(e)}
