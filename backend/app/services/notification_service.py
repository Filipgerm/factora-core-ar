import logging
from typing import Optional
from app.config import settings
from app.clients.email_client import BrevoEmailClient
from app.clients.sms_client import BrevoSMSClient

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending SMS and email notifications"""

    def __init__(self):
        # In production, initialize actual SMS/email service clients here
        self.email_client = BrevoEmailClient()
        self.sms_client = BrevoSMSClient()

    async def send_verification_email(self, email: str, code: str) -> bool:
        # HTML Used Only in Case of not Template Email
        # html = f"""
        # <html>
        # <body>
        #     <h2>Factora Email Verification</h2>
        #     <p>Your verification code is: <strong>{code}</strong></p>
        #     <p>This code will expire in 15 minutes.</p>
        # </body>
        # </html>
        # """

        template_id = 1  # Brevo template number that we currently use.
        subject = "Factora Email Verification"
        params = {"subject": subject, "code": code}
        return self.email_client.send_template_email(email, template_id, params)

    async def send_password_reset_email(self, email: str, reset_url: str) -> bool:
        """
        Send a password reset email that contains a button/link to the reset page.
        Prefer a dedicated Brevo template so you can style the button.
        The template should expose a variable like {{ reset_url }}.
        """
        template_id = 3  # <-- create this in Brevo
        subject = "Reset your Factora password"
        params = {
            "subject": subject,
            "reset_url": reset_url,
        }
        # NGROK has been used for the url to be able to forward traffic from the public ip of the host to the internet
        # and back to the docker containers ip. This works but the url for NGROK needs to be adjusted when we use cloud and not localhost.
        # NGROK operates as a public reverse proxy. IN Paid NGROK plans, the ngrok url can be hidden and display our domain.
        # NGROK should be mostly used for local testing.
        # In PRODUCTION, use the our domain url , for example : https://app.yourdomain.com
        return self.email_client.send_template_email(email, template_id, params)

    async def send_onboarding_email(self, email: str, onboarding_url: str) -> bool:

        template_id = 4  # Brevo template number that we currently use.
        subject = "Factora Onboarding Invitation"
        params = {"subject": subject, "onboarding_url": onboarding_url}
        return self.email_client.send_template_email(email, template_id, params)

    async def send_verification_sms(self, phone: str, code: str) -> bool:
        message = f"Your Factora SMS verification code is: {code}"
        return self.sms_client.send_sms(phone, message)
