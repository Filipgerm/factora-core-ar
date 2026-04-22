"""HubSpot API client + webhook helpers."""
from packages.hubspot.api.client import HubspotClient, HubspotError
from packages.hubspot.api.webhooks import (
    HubspotSignatureError,
    parse_webhook_event,
    verify_webhook_signature,
)

__all__ = [
    "HubspotClient",
    "HubspotError",
    "HubspotSignatureError",
    "parse_webhook_event",
    "verify_webhook_signature",
]
