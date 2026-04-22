"""HubSpot integration SDK — CRM v3 read/write, OAuth, webhooks.

Isolation contract: this package MUST NOT import from ``app/``. It accepts
configuration (access tokens, client id/secret, webhook app secret) as
constructor arguments or environment variables. See ``packages/CLAUDE.md``.

Public surface
--------------
* :class:`packages.hubspot.api.client.HubspotClient` — async httpx client
  covering Auth (OAuth), Deals, Line Items, Quotes, Products, Companies,
  Associations, Files, Pipelines, Properties, and Webhook subscriptions.
* :mod:`packages.hubspot.api.webhooks` — webhook signature verification
  (v3 HMAC-SHA256) + payload parsing.
* :mod:`packages.hubspot.models` — Pydantic DTOs for each resource.
"""

from packages.hubspot.api.client import HubspotClient, HubspotError
from packages.hubspot.api.webhooks import (
    HubspotSignatureError,
    parse_webhook_event,
    verify_webhook_signature,
)
from packages.hubspot.models import (
    HubspotAssociation,
    HubspotCompany,
    HubspotDeal,
    HubspotFile,
    HubspotLineItem,
    HubspotProduct,
    HubspotQuote,
    HubspotTokenResponse,
    HubspotWebhookEvent,
)

__all__ = [
    "HubspotClient",
    "HubspotError",
    "HubspotSignatureError",
    "parse_webhook_event",
    "verify_webhook_signature",
    "HubspotAssociation",
    "HubspotCompany",
    "HubspotDeal",
    "HubspotFile",
    "HubspotLineItem",
    "HubspotProduct",
    "HubspotQuote",
    "HubspotTokenResponse",
    "HubspotWebhookEvent",
]
