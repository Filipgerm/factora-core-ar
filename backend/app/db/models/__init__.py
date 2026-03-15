"""Domain-split ORM models for Factora.

All model classes are re-exported from this package so existing imports of the
form ``from app.db.database_models import Sellers`` continue to work after the
split, while new code can import directly from the domain files.

Usage::

    # Both of the following work:
    from app.db.models import Sellers, SellerSessions, Buyers
    from app.db.models.auth import Sellers
"""
from app.db.models.auth import Sellers, SellerSessions
from app.db.models.buyers import AlertSeverity, Alerts, Buyers, Document, SellerBuyers
from app.db.models.onboarding import OnboardingSession, OnboardingToken, VerificationSession
from app.db.models.banking import (
    BankAccountModel,
    ConsentModel,
    ConnectionModel,
    CustomerModel,
    ProviderModel,
    Transaction,
    TransactionMode,
    TransactionStatus,
)
from app.db.models.aade import AadeDocumentModel, AadeInvoiceModel, InvoiceDirection

__all__ = [
    # auth
    "Sellers",
    "SellerSessions",
    # buyers
    "Buyers",
    "SellerBuyers",
    "Document",
    "Alerts",
    "AlertSeverity",
    # onboarding
    "OnboardingSession",
    "VerificationSession",
    "OnboardingToken",
    # banking
    "BankAccountModel",
    "ConnectionModel",
    "ConsentModel",
    "CustomerModel",
    "ProviderModel",
    "Transaction",
    "TransactionStatus",
    "TransactionMode",
    # aade
    "AadeDocumentModel",
    "AadeInvoiceModel",
    "InvoiceDirection",
]
