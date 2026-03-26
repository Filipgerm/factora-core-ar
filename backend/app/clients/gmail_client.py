"""Deprecated Gmail SMTP client — removed in favor of Gmail API OAuth.

**Use:** ``GmailApiClient`` for REST + ``GmailOAuthService`` for token storage.
**Outbound mail:** ``BrevoEmailClient`` (collections agent).
"""

from __future__ import annotations


class GmailSmtpClient:
    """Raised to catch legacy imports; SMTP is no longer supported."""

    async def send_plain_text(self, *, to_email: str, subject: str, body: str) -> None:
        raise RuntimeError(
            "GmailSmtpClient is removed. Use BrevoEmailClient for transactional mail "
            "or Gmail API (OAuth) for user-mailbox send."
        )
