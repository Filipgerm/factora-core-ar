from sib_api_v3_sdk import Configuration, ApiClient
from sib_api_v3_sdk.api import TransactionalEmailsApi
from sib_api_v3_sdk.rest import ApiException
from sib_api_v3_sdk.models import SendSmtpEmail
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class BrevoEmailClient:
    def __init__(self):
        cfg = Configuration()
        cfg.api_key["api-key"] = settings.BREVO_API_KEY
        self.sender_email = settings.BREVO_SENDER_EMAIL
        self.sender_name = settings.BREVO_SENDER_NAME
        self.api_instance = TransactionalEmailsApi(ApiClient(cfg))

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """
        Send email message to the specified email address

        @param to_email: Recipient email address
        @param subject: Email subject line
        @param html_content: Email body content
        @returns: True if email was sent successfully, False otherwise
        """
        email = SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": self.sender_email, "name": self.sender_name},
            subject=subject,
            html_content=html_content,
        )

        try:
            self.api_instance.send_transac_email(email)
            # SDK returns a response with messageId
            message_id = (
                getattr(resp, "message_id", None)
                or getattr(resp, "messageId", None)
                or str(resp)
            )
            logger.info(f"Email enqueued OK -> message_id={message_id}")
            return True
        except ApiException as e:
            logger.error(f"Brevo API error sending email to {to_email}: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_template_email(
        self, to_email: str, template_id: int, params: dict
    ) -> bool:
        """
        Send pre-designed template email message by ID to the specified email address

        @param to_email: Recipient email address
        @param template_id: ID of the specific email template
        @param params: Contains parameters such as subject and body.
        @returns: True if email was sent successfully, False otherwise
        """
        email_model = SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": self.sender_email, "name": self.sender_name},
            template_id=template_id,
            params=params,
        )

        # print("Will send template email with payload:")
        # print(email_model.to_dict())
        # print(f"Using API instance: {self.api_instance}")
        # print(f"Sender: {self.sender_name} <{self.sender_email}>  Template: {template_id}")

        try:
            # print("Calling TransactionalEmailsApi.send_transac_email(...) with templateId")
            resp = self.api_instance.send_transac_email(email_model)
            message_id = (
                getattr(resp, "message_id", None)
                or getattr(resp, "messageId", None)
                or str(resp)
            )
            # print(f"Template email enqueued. message_id={message_id}")
            return True
        except ApiException as e:
            logger.error(f"Brevo API error (template send): {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error (template send): {e}")
            return False
