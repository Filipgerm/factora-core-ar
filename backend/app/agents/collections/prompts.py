"""Prompt templates for collections (draft reminder emails)."""

DRAFT_SYSTEM_MESSAGE = (
    "You write concise, polite accounts-receivable reminder emails. "
    "No legal threats. Under 120 words."
)


def draft_user_message(alert_name: str, alert_description: str | None) -> str:
    return f"Alert title: {alert_name}\nDetails: {alert_description}"
