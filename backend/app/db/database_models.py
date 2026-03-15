"""Compatibility shim — all ORM models have moved to db/models/.

This file now re-exports every class from the domain-split modules so that
all existing imports continue to work without modification.

Prefer importing directly from the domain files in new code::

    from app.db.models.auth import Sellers, SellerSessions
    from app.db.models.buyers import Buyers, SellerBuyers
    from app.db.models.onboarding import OnboardingSession, OnboardingToken
    from app.db.models.banking import BankAccountModel, Transaction
    from app.db.models.aade import AadeDocumentModel, AadeInvoiceModel
"""
from app.db.models import (  # noqa: F401  (re-export)
    AadeDocumentModel,
    AadeInvoiceModel,
    AlertSeverity,
    Alerts,
    BankAccountModel,
    Buyers,
    ConsentModel,
    ConnectionModel,
    CustomerModel,
    Document,
    InvoiceDirection,
    OnboardingSession,
    OnboardingToken,
    ProviderModel,
    SellerBuyers,
    SellerSessions,
    Sellers,
    Transaction,
    TransactionMode,
    TransactionStatus,
    VerificationSession,
)
