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
from app.db.models.contracts import (
    AllocationMethod,
    BillingSystem,
    Contract,
    ContractAllocation,
    ContractAllocationSource,
    ContractDocument,
    ContractModification,
    ContractModificationType,
    ContractSource,
    ContractStatus,
    PerformanceObligation,
    PerformanceObligationKind,
)
from app.db.models.stripe_connect import StripeAccountConnection
from app.db.models.hubspot import (
    HubspotAssociation,
    HubspotCompany,
    HubspotConnection,
    HubspotDeal,
    HubspotFile,
    HubspotLineItem,
    HubspotProduct,
    HubspotQuote,
)

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
    # contracts
    "AllocationMethod",
    "BillingSystem",
    "Contract",
    "ContractAllocation",
    "ContractAllocationSource",
    "ContractDocument",
    "ContractModification",
    "ContractModificationType",
    "ContractSource",
    "ContractStatus",
    "PerformanceObligation",
    "PerformanceObligationKind",
    # stripe connect
    "StripeAccountConnection",
    # hubspot
    "HubspotAssociation",
    "HubspotCompany",
    "HubspotConnection",
    "HubspotDeal",
    "HubspotFile",
    "HubspotLineItem",
    "HubspotProduct",
    "HubspotQuote",
]
