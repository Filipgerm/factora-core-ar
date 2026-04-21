"""Stripe object → ORM-value-dict mappers (pure, no DB, no app imports).

Each mapper turns a raw Stripe object dict into a ``dict[str, Any]`` suitable for
``setattr`` onto an SQLAlchemy row or passing as kwargs to an ORM constructor.

Keeping mappers isolated from the service layer means:
    * ``StripeSyncService`` owns transactions and org resolution only.
    * Mappers are trivially unit-testable without a DB or Stripe client.
    * New Stripe resources are added by writing a mapper, no service bloat.
"""
from packages.stripe.mappers.common import ts_from_epoch, source_id, as_dict, metadata_org
from packages.stripe.mappers.billing_meters import (
    map_billing_meter,
    map_billing_meter_event_summary,
)
from packages.stripe.mappers.credit_note import map_credit_note
from packages.stripe.mappers.customer import map_customer
from packages.stripe.mappers.dispute import map_dispute
from packages.stripe.mappers.invoice import map_invoice, map_invoice_line_item
from packages.stripe.mappers.payment_intent import map_payment_intent
from packages.stripe.mappers.payout import map_payout
from packages.stripe.mappers.price import map_price
from packages.stripe.mappers.product import map_product
from packages.stripe.mappers.refund import map_refund
from packages.stripe.mappers.subscription import (
    map_subscription,
    map_subscription_item,
    map_subscription_schedule,
)
from packages.stripe.mappers.tax import map_tax_rate, map_tax_transaction
from packages.stripe.mappers.treasury import map_balance_transaction

__all__ = [
    "as_dict",
    "map_balance_transaction",
    "map_billing_meter",
    "map_billing_meter_event_summary",
    "map_credit_note",
    "map_customer",
    "map_dispute",
    "map_invoice",
    "map_invoice_line_item",
    "map_payment_intent",
    "map_payout",
    "map_price",
    "map_product",
    "map_refund",
    "map_subscription",
    "map_subscription_item",
    "map_subscription_schedule",
    "map_tax_rate",
    "map_tax_transaction",
    "metadata_org",
    "source_id",
    "ts_from_epoch",
]
