"""Populate the demo tenant in PostgreSQL from ``app/core/demo_fixtures/*.json``.

Run from the ``backend`` directory::

    ENVIRONMENT=demo uv run python scripts/seed_demo_db.py

Or with a non-demo env (use only on disposable databases)::

    ALLOW_DEMO_SEED=1 uv run python scripts/seed_demo_db.py

Requires ``SUPABASE_URI`` (or pooler URL) in the environment — same as the API.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_demo_db")

DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"


def _require_safe_to_run() -> None:
    from app.config import settings

    if settings.demo_mode:
        return
    if os.environ.get("ALLOW_DEMO_SEED") == "1":
        logger.warning(
            "ALLOW_DEMO_SEED=1: seeding a non-demo ENVIRONMENT — use only on disposable DBs."
        )
        return
    raise SystemExit(
        "Refusing to seed: set ENVIRONMENT=demo or ALLOW_DEMO_SEED=1 explicitly."
    )


def _parse_dt(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).replace("Z", "+00:00")
    return datetime.fromisoformat(s)


def _parse_date(value: str | date | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


async def _clear_demo_org(session: AsyncSession, org_id: str) -> None:
    from app.core.demo_constants import DEMO_SALTEDGE_CUSTOMER_ID
    from app.db.models.aade import AadeDocumentModel, AadeInvoiceModel
    from app.db.models.alerts import Alert
    from app.db.models.banking import (
        BankAccountModel,
        ConnectionModel,
        ConsentModel,
        CustomerModel,
        Transaction,
    )
    from app.db.models.counterparty import Counterparty
    from app.db.models.identity import Organization, UserOrganizationMembership
    from app.db.models.invoices import Invoice

    # Tear down the fixed demo SaltEdge customer graph by primary key, regardless of
    # organization_id. Otherwise a stale row (e.g. leftover from a different org)
    # survives org-scoped deletes and the next seed hits pk_customers duplicate key.
    demo_conn_subq = select(ConnectionModel.id).where(
        ConnectionModel.customer_id == DEMO_SALTEDGE_CUSTOMER_ID
    )
    demo_acc_subq = select(BankAccountModel.id).where(
        BankAccountModel.connection_id.in_(demo_conn_subq)
    )
    await session.execute(delete(Transaction).where(Transaction.account_id.in_(demo_acc_subq)))
    await session.execute(
        delete(BankAccountModel).where(BankAccountModel.connection_id.in_(demo_conn_subq))
    )
    await session.execute(
        delete(ConsentModel).where(ConsentModel.connection_id.in_(demo_conn_subq))
    )
    await session.execute(
        delete(ConnectionModel).where(ConnectionModel.customer_id == DEMO_SALTEDGE_CUSTOMER_ID)
    )
    await session.execute(delete(CustomerModel).where(CustomerModel.id == DEMO_SALTEDGE_CUSTOMER_ID))

    cust_subq = select(CustomerModel.id).where(CustomerModel.organization_id == org_id)
    conn_subq = select(ConnectionModel.id).where(ConnectionModel.customer_id.in_(cust_subq))

    await session.execute(delete(Transaction).where(Transaction.organization_id == org_id))
    await session.execute(delete(BankAccountModel).where(BankAccountModel.organization_id == org_id))
    await session.execute(delete(ConsentModel).where(ConsentModel.connection_id.in_(conn_subq)))
    await session.execute(delete(ConnectionModel).where(ConnectionModel.customer_id.in_(cust_subq)))
    await session.execute(delete(CustomerModel).where(CustomerModel.organization_id == org_id))
    await session.execute(delete(Invoice).where(Invoice.organization_id == org_id))
    await session.execute(delete(AadeInvoiceModel).where(AadeInvoiceModel.organization_id == org_id))
    await session.execute(delete(AadeDocumentModel).where(AadeDocumentModel.organization_id == org_id))
    await session.execute(delete(Alert).where(Alert.organization_id == org_id))
    await session.execute(delete(Counterparty).where(Counterparty.organization_id == org_id))
    await session.execute(
        delete(UserOrganizationMembership).where(
            UserOrganizationMembership.organization_id == org_id
        )
    )
    await session.execute(delete(Organization).where(Organization.id == org_id))
    logger.info("Cleared existing demo org %s", org_id)


async def _insert_demo_org(session: AsyncSession, org_id: str) -> None:
    from app.core.demo import get_demo_payload
    from app.db.models.identity import Organization

    gemi = get_demo_payload("gemi_company")
    data = gemi.get("data") or gemi
    name = data.get("company_name") or data.get("trade_name") or "Factora Demo Organization"
    vat = str(data.get("vat_number") or "123456789")
    session.add(
        Organization(
            id=org_id,
            name=name,
            vat_number=vat,
            country="GR",
            registry_data=data if isinstance(data, dict) else None,
        )
    )
    logger.info("Inserted organization %s", org_id)


async def _insert_counterparties(session: AsyncSession, org_id: str) -> None:
    from app.core.demo import get_demo_payload
    from app.db.models.counterparty import Counterparty, CounterpartyType

    rows = get_demo_payload("organization_counterparties")["counterparties"]
    for r in rows:
        ctype = CounterpartyType(str(r["type"]).lower())
        session.add(
            Counterparty(
                id=str(r["id"]),
                organization_id=org_id,
                name=r["name"],
                vat_number=r.get("vat_number"),
                country=r.get("country"),
                address_street=r.get("address_street"),
                address_city=r.get("address_city"),
                address_postal_code=r.get("address_postal_code"),
                address_region=r.get("address_region"),
                type=ctype,
                contact_info=r.get("contact_info"),
                default_category_id=r.get("default_category_id"),
                registry_data=r.get("registry_data"),
                created_at=_parse_dt(r["created_at"]),
                updated_at=_parse_dt(r["updated_at"]),
            )
        )
    logger.info("Inserted %d counterparties", len(rows))


async def _insert_banking(session: AsyncSession, org_id: str) -> None:
    from app.core.demo import get_demo_payload
    from app.core.demo_constants import DEMO_SALTEDGE_CUSTOMER_ID
    from app.db.models.banking import (
        BankAccountModel,
        ConnectionModel,
        ConsentModel,
        CustomerModel,
        Transaction,
        TransactionMode,
        TransactionStatus,
    )

    cust_rows = get_demo_payload("saltedge_customers")["data"]
    primary = next(
        (c for c in cust_rows if c.get("customer_id") == DEMO_SALTEDGE_CUSTOMER_ID),
        cust_rows[0],
    )
    session.add(
        CustomerModel(
            id=DEMO_SALTEDGE_CUSTOMER_ID,
            organization_id=org_id,
            external_id=primary.get("customer_id"),
            identifier=primary.get("identifier"),
            categorization_type=str(primary.get("categorization_type") or "business"),
        )
    )

    conn_rows = get_demo_payload("saltedge_connections")["data"]
    for c in conn_rows:
        session.add(
            ConnectionModel(
                id=c["id"],
                external_id=c["id"],
                external_customer_id=c["customer_id"],
                customer_identifier=c.get("customer_identifier"),
                customer_id=c["customer_id"],
                provider_code=c["provider_code"],
                provider_name=c["provider_name"],
                country_code=str(c["country_code"]).upper(),
                status=str(c["status"]),
                categorization="none",
                automatic_refresh=bool(c.get("automatic_refresh", True)),
                last_consent_id=str(c.get("last_consent_id") or "demo-consent-001"),
                created_at=_parse_dt(c.get("created_at")) or datetime.now(timezone.utc),
                updated_at=_parse_dt(c.get("updated_at")) or datetime.now(timezone.utc),
            )
        )

    session.add(
        ConsentModel(
            id="demo-consent-001",
            external_id="demo-consent-001",
            external_customer_id=DEMO_SALTEDGE_CUSTOMER_ID,
            external_connection_id=conn_rows[0]["id"],
            connection_id=conn_rows[0]["id"],
            status="active",
            scopes=["account_information"],
        )
    )

    for acc in get_demo_payload("saltedge_accounts")["data"]:
        cid = acc["connection_id"]
        session.add(
            BankAccountModel(
                id=acc["id"],
                organization_id=org_id,
                external_id=acc["id"],
                external_connection_id=cid,
                connection_id=cid,
                name=acc["name"],
                nature=str(acc.get("nature") or "account"),
                balance=Decimal(str(acc["balance"])),
                currency_code=str(acc["currency_code"]).upper(),
                extra=acc.get("extra") or {},
            )
        )

    for tx in get_demo_payload("dashboard_transactions")["transactions"]:
        st = TransactionStatus(str(tx["status"]))
        extra: dict = {}
        if tx.get("posted_date"):
            extra["posting_date"] = str(tx["posted_date"])
        if tx.get("merchant_id") is not None:
            extra["merchant_id"] = tx["merchant_id"]
        if tx.get("mcc") is not None:
            extra["mcc"] = str(tx["mcc"])
        if tx.get("iban") is not None:
            extra["iban"] = tx["iban"]
        session.add(
            Transaction(
                id=tx["id"],
                organization_id=org_id,
                account_id=tx["account_id"],
                status=st,
                mode=TransactionMode.normal,
                duplicated=False,
                made_on=_parse_date(tx["made_on"]),
                amount=Decimal(str(tx["amount"])),
                currency_code=str(tx["currency_code"]).upper(),
                category=tx.get("category"),
                description=tx.get("description"),
                extra=extra,
            )
        )

    logger.info(
        "Inserted banking: 1 customer, %d connections, 1 consent, accounts, transactions",
        len(conn_rows),
    )


async def _insert_aade(session: AsyncSession, org_id: str) -> None:
    from app.core.demo import get_demo_payload
    from app.db.models.aade import AadeDocumentModel, AadeInvoiceModel, InvoiceDirection

    blob = get_demo_payload("dashboard_aade_documents")
    invoices = blob["invoices"]
    doc_ids = {str(inv["document_id"]) for inv in invoices}
    for doc_id in doc_ids:
        session.add(
            AadeDocumentModel(
                id=doc_id,
                organization_id=org_id,
                raw_json={},
                query_params={"seed": "demo"},
            )
        )
    for inv in invoices:
        session.add(
            AadeInvoiceModel(
                id=str(inv["id"]),
                organization_id=org_id,
                document_id=str(inv["document_id"]),
                direction=InvoiceDirection.RECEIVED,
                uid=inv.get("uid"),
                mark=int(inv["mark"]) if inv.get("mark") is not None else None,
                authentication_code=inv.get("authentication_code"),
                issuer_vat=inv.get("issuer_vat"),
                issuer_country=inv.get("issuer_country"),
                issuer_branch=inv.get("issuer_branch"),
                counterpart_vat=inv.get("counterpart_vat"),
                counterpart_country=inv.get("counterpart_country"),
                counterpart_branch=inv.get("counterpart_branch"),
                series=inv.get("series"),
                aa=inv.get("aa"),
                issue_date=_parse_date(inv.get("issue_date")),
                invoice_type=inv.get("invoice_type"),
                currency=inv.get("currency"),
                total_net_value=Decimal(str(inv["total_net_value"]))
                if inv.get("total_net_value") is not None
                else None,
                total_vat_amount=Decimal(str(inv["total_vat_amount"]))
                if inv.get("total_vat_amount") is not None
                else None,
                total_gross_value=Decimal(str(inv["total_gross_value"]))
                if inv.get("total_gross_value") is not None
                else None,
                normalized_data={},
                created_at=_parse_dt(inv.get("created_at")) or datetime.now(timezone.utc),
            )
        )
    logger.info("Inserted %d AADE documents and %d invoices", len(doc_ids), len(invoices))


async def _insert_invoices(session: AsyncSession, org_id: str) -> None:
    from app.core.demo import get_demo_payload
    from app.db.models.invoices import Invoice, InvoiceSource

    for inv in get_demo_payload("demo_invoices")["invoices"]:
        session.add(
            Invoice(
                id=str(inv["id"]),
                organization_id=org_id,
                source=InvoiceSource(str(inv["source"])),
                external_id=inv.get("external_id"),
                counterparty_id=str(inv["counterparty_id"]) if inv.get("counterparty_id") else None,
                counterparty_display_name=inv.get("counterparty_display_name"),
                amount=Decimal(str(inv["amount"])),
                currency=str(inv.get("currency") or "EUR").upper(),
                issue_date=_parse_date(inv["issue_date"]),
                due_date=_parse_date(inv.get("due_date")),
                status=str(inv.get("status") or "draft"),
            )
        )
    logger.info("Inserted unified invoices from demo_invoices.json")


async def _insert_alerts(session: AsyncSession, org_id: str) -> None:
    from app.db.models.alerts import Alert, AlertSeverity

    for i in range(4):
        session.add(
            Alert(
                organization_id=org_id,
                name=f"Demo alert {i + 1}",
                description="Seeded demo financial health notice.",
                type="demo",
                severity_level=AlertSeverity.normal,
                trigger_source="seed_demo_db",
            )
        )
    logger.info("Inserted 4 active alerts")


async def run_seed() -> None:
    _require_safe_to_run()
    from app.core.demo import get_demo_payload

    # Ensure fixtures including new JSON files are loadable
    _ = get_demo_payload("saltedge_connections")

    from app.db.postgres import AsyncSessionLocal

    # Two transactions: clearing and re-seeding the same organization id in a single
    # session/transaction can leave the ORM unit-of-work in a state where the new
    # ``Organization`` row is not flushed before child inserts, causing FK errors
    # (e.g. ``aade_documents.organization_id`` → ``organizations``).
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await _clear_demo_org(session, DEMO_ORG_ID)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await _insert_demo_org(session, DEMO_ORG_ID)
            await session.flush()
            await _insert_counterparties(session, DEMO_ORG_ID)
            await _insert_banking(session, DEMO_ORG_ID)
            await _insert_aade(session, DEMO_ORG_ID)
            await _insert_invoices(session, DEMO_ORG_ID)
            await _insert_alerts(session, DEMO_ORG_ID)

    logger.info("Demo DB seed completed for org %s", DEMO_ORG_ID)


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
