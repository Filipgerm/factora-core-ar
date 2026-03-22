"""GmailSmtpClient — config-driven SMTP send (Gmail or Google Workspace relay).

Used by the AR collections agent for outbound nudges. In demo mode, logs only.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText

import anyio

from app.config import settings

logger = logging.getLogger(__name__)


class GmailSmtpClient:
    """Send plain-text email via SMTP (TLS on port 587 by default)."""

    async def send_plain_text(
        self,
        *,
        to_email: str,
        subject: str,
        body: str,
    ) -> None:
        if settings.demo_mode:
            logger.info(
                "[DEMO] GmailSmtpClient would send to=%s subject=%s body=%s",
                to_email,
                subject,
                body[:200],
            )
            return
        if not all(
            [
                settings.GMAIL_SMTP_HOST,
                settings.GMAIL_SMTP_USER,
                settings.GMAIL_SMTP_PASSWORD,
                settings.GMAIL_FROM_EMAIL,
            ]
        ):
            raise RuntimeError("Gmail SMTP is not fully configured in settings")

        def _send() -> None:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = settings.GMAIL_FROM_EMAIL
            msg["To"] = to_email
            with smtplib.SMTP(settings.GMAIL_SMTP_HOST, settings.GMAIL_SMTP_PORT) as smtp:
                smtp.starttls()
                smtp.login(settings.GMAIL_SMTP_USER, settings.GMAIL_SMTP_PASSWORD)
                smtp.send_message(msg)

        await anyio.to_thread.run_sync(_send)
