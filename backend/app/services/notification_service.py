import logging
from typing import Optional
from app.config import settings
from app.clients.email_client import BrevoEmailClient
from app.clients.sms_client import BrevoSMSClient

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending SMS and email notifications.

    In demo mode (``ENVIRONMENT=demo``) all outbound messages are suppressed:
    the content is logged at INFO level instead of being dispatched to Brevo.
    This allows demonstrations without spamming real email addresses or phone
    numbers while ensuring the onboarding/auth flows complete successfully.
    """

    def __init__(self):
        self.email_client = BrevoEmailClient()
        self.sms_client = BrevoSMSClient()

    def _is_demo(self) -> bool:
        return settings.demo_mode

    async def send_verification_email(self, email: str, code: str) -> bool:
        """Send an email verification code to the given address.

        Args:
            email: Recipient email address.
            code: One-time verification code.

        Returns:
            ``True`` on success (or in demo mode where the send is suppressed).
        """
        if self._is_demo():
            logger.info("[DEMO] send_verification_email to %s — code: %s", email, code)
            return True
        template_id = 1
        params = {"subject": "Factora Email Verification", "code": code}
        return self.email_client.send_template_email(email, template_id, params)

    async def send_password_reset_email(self, email: str, reset_url: str) -> bool:
        """Send a password-reset email containing a one-time link.

        Args:
            email: Seller's email address.
            reset_url: Full URL to the frontend reset-password page with token.

        Returns:
            ``True`` on success (or in demo mode where the send is suppressed).
        """
        if self._is_demo():
            logger.info(
                "[DEMO] send_password_reset_email to %s — url: %s", email, reset_url
            )
            return True
        template_id = 3
        params = {"subject": "Reset your Factora password", "reset_url": reset_url}
        return self.email_client.send_template_email(email, template_id, params)

    async def send_onboarding_email(self, email: str, onboarding_url: str) -> bool:
        """Send a buyer onboarding invitation email with a one-time link.

        Args:
            email: Buyer's email address.
            onboarding_url: Full invitation URL including the hashed token.

        Returns:
            ``True`` on success (or in demo mode where the send is suppressed).
        """
        if self._is_demo():
            logger.info(
                "[DEMO] send_onboarding_email to %s — url: %s", email, onboarding_url
            )
            return True
        template_id = 4
        params = {"subject": "Factora Onboarding Invitation", "onboarding_url": onboarding_url}
        return self.email_client.send_template_email(email, template_id, params)

    async def send_verification_sms(self, phone: str, code: str) -> bool:
        """Send an SMS with an OTP verification code.

        Args:
            phone: E.164 formatted phone number.
            code: One-time numeric code.

        Returns:
            ``True`` on success (or in demo mode where the send is suppressed).
        """
        if self._is_demo():
            logger.info("[DEMO] send_verification_sms to %s — code: %s", phone, code)
            return True
        message = f"Your Factora SMS verification code is: {code}"
        return self.sms_client.send_sms(phone, message)
