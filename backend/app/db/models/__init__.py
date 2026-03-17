"""Domain-split ORM models for Factora.

Import from domain files for specificity, or from this package for convenience::

    from app.db.models import Organization, User, UserSession
    from app.db.models.identity import Organization
"""
from app.db.models.identity import Organization, User, UserRole, UserSession
from app.db.models.counterparty import Counterparty, CounterpartyType
from app.db.models.alerts import Alert, AlertSeverity
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
    # identity
    "Organization",
    "User",
    "UserRole",
    "UserSession",
    # counterparty
    "Counterparty",
    "CounterpartyType",
    # alerts
    "Alert",
    "AlertSeverity",
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
