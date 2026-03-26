import html
import logging

from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api import TransactionalEmailsApi
from sib_api_v3_sdk.models import SendSmtpEmail
from sib_api_v3_sdk.rest import ApiException

from app.config import settings

logger = logging.getLogger(__name__)


class BrevoEmailClient:
    """Thin wrapper around the Brevo (formerly Sendinblue) Transactional Email API."""

    def __init__(self):
        cfg = Configuration()
        cfg.api_key["api-key"] = settings.BREVO_API_KEY
        self.sender_email = settings.BREVO_SENDER_EMAIL
        self.sender_name = settings.BREVO_SENDER_NAME
        self.api_instance = TransactionalEmailsApi(ApiClient(cfg))

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send a plain transactional email to a single recipient.

        Args:
            to_email: Recipient email address.
            subject: Email subject line.
            html_content: Full HTML body of the email.

        Returns:
            ``True`` if the Brevo API accepted the message, ``False`` on any
            error (logged at ERROR level).
        """
        email = SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": self.sender_email, "name": self.sender_name},
            subject=subject,
            html_content=html_content,
        )

        try:
            resp = self.api_instance.send_transac_email(email)
            message_id = (
                getattr(resp, "message_id", None)
                or getattr(resp, "messageId", None)
                or str(resp)
            )
            logger.info("Email enqueued OK -> message_id=%s", message_id)
            return True
        except ApiException as e:
            logger.error("Brevo API error sending email to %s: %s", to_email, e)
            return False
        except Exception as e:
            logger.error("Failed to send email to %s: %s", to_email, e)
            return False

    def send_template_email(
        self, to_email: str, template_id: int, params: dict
    ) -> bool:
        """Send a Brevo template email by template ID to a single recipient.

        Args:
            to_email: Recipient email address.
            template_id: The numeric ID of the Brevo email template to use.
            params: Dictionary of dynamic parameters injected into the
                template (e.g. ``{"VERIFICATION_CODE": "123456"}``).

        Returns:
            ``True`` if the Brevo API accepted the message, ``False`` on any
            error (logged at ERROR level).
        """
        email_model = SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": self.sender_email, "name": self.sender_name},
            template_id=template_id,
            params=params,
        )

        try:
            resp = self.api_instance.send_transac_email(email_model)
            message_id = (
                getattr(resp, "message_id", None)
                or getattr(resp, "messageId", None)
                or str(resp)
            )
            logger.info(
                "Template email enqueued OK | template_id=%s | message_id=%s",
                template_id,
                message_id,
            )
            return True
        except ApiException as e:
            logger.error("Brevo API error (template send): %s", e)
            return False
        except Exception as e:
            logger.error("Unexpected error (template send): %s", e)
            return False

    def send_plain_text(self, to_email: str, subject: str, body: str) -> bool:
        """Send UTF-8 plain text as a minimal HTML body (collections / system mail)."""
        safe = f"<pre>{html.escape(body)}</pre>"
        return self.send_email(to_email, subject, safe)
