from sib_api_v3_sdk import Configuration, ApiClient
from sib_api_v3_sdk.rest import ApiException
from sib_api_v3_sdk.api import TransactionalSMSApi
from sib_api_v3_sdk.models import SendTransacSms
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class BrevoSMSClient:
    """Thin wrapper around the Brevo (formerly Sendinblue) Transactional SMS API."""

    def __init__(self):
        cfg = Configuration()
        cfg.api_key["api-key"] = settings.BREVO_API_KEY
        self._sender = settings.BREVO_SENDER_NAME
        self._sms_api = TransactionalSMSApi(ApiClient(cfg))

    def send_sms(self, to_number: str, message: str) -> bool:
        """Send a transactional SMS via Brevo.

        Args:
            to_number: Full phone number with country code (E.164 format,
                e.g. ``+306912345678``).
            message: Message body containing the verification code or text
                to deliver.

        Returns:
            ``True`` if the API accepted the message, ``False`` on any error.
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
                to_number,
                message_id,
            )
            return True
        except ApiException as e:
            logger.error("Brevo API error sending SMS to %s: %s", to_number, e)
            return False
        except Exception as e:
            logger.error("Unexpected error sending SMS to %s: %s", to_number, e)
            return False
