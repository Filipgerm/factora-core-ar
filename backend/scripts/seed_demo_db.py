"""Populate the demo tenant in PostgreSQL from ``app/core/demo_fixtures/*.json``.

Run from the ``backend`` directory::

    ENVIRONMENT=demo uv run python scripts/seed_demo_db.py

Or with a non-demo env (use only on disposable databases)::

    ALLOW_DEMO_SEED=1 uv run python scripts/seed_demo_db.py

Requires ``SUPABASE_URI`` (or pooler URL) in the environment — same as the API.

Schema must match the ORM (including ``invoices.confidence`` / ``invoicestatus``).
Apply migrations first::

    uv run alembic upgrade head

Creates a **demo login** tied to the seeded org so the dashboard JWT carries
``organization_id`` matching seeded data. After seeding, sign in at ``/login`` with:

- **Email:** ``demo-dashboard@example.org`` (must pass Pydantic ``EmailStr`` / email-validator;
  reserved TLDs such as ``.invalid`` are rejected and cause HTTP 422 on login.)
- **Password:** ``DEMO_SEED_PASSWORD`` if set, otherwise dev default ``FactoraDemo2026!``

Invalidate any previous refresh sessions for that user on each seed run.

**Why the dashboard looks empty in ``ENVIRONMENT=demo``**

- ``ENVIRONMENT=demo`` only switches app *behaviour* (feature flags, safer defaults).
  It does **not** replace your JWT ``organization_id`` or auto-fill the database.
- Demo **business rows** (banking, invoices, general ledger, etc.) are tied to org
  ``00000000-0000-0000-0000-000000000001``. You only see them when logged in as the
  seeded demo user above so the access token carries that org id.
- If you sign in as another user, you will see that user's org — often empty until
  you create or seed data for *that* org.

**Reset all logins and reattach only the demo tenant**

1. ``uv run alembic upgrade head``
2. ``CONFIRM_WIPE_ALL_USERS=1 uv run python scripts/wipe_all_users.py``
3. ``ENVIRONMENT=demo uv run python scripts/seed_demo_db.py``

Then sign in with the demo email below (JWT ``organization_id`` will be the fixed demo UUID).
"""
from __future__ import annotations

import asyncio
import logging
import math
import os
import sys
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from dateutil.relativedelta import relativedelta

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_demo_db")

DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"
# Stable UUIDs (aligned with frontend E2E fixtures where useful)
DEMO_USER_ID = "00000000-0000-4000-8000-000000000002"
DEMO_USER_EMAIL = "demo-dashboard@example.org"
DEMO_USER_USERNAME = "Demo Dashboard"
_DEFAULT_DEMO_PASSWORD = "FactoraDemo2026!"

# Account balances in fixtures are scaled so total cash ≈ 2.65× last full month revenue.
_DEMO_BASE_TOTAL_BALANCE = Decimal("18450.85") + Decimal("45200.0") + Decimal("12880.0")
_DEMO_BANK_ACCOUNTS = ["demo-account-001", "demo-account-002", "demo-account-003"]


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


def _demo_banking_month_segments(today: date, days_back: int = 175) -> list[tuple[date, date]]:
    """Calendar month slices overlapping ``[today - days_back, today]``, oldest first."""
    ws = today - timedelta(days=days_back)
    segments: list[tuple[date, date]] = []
    cm = today.replace(day=1)
    while True:
        sy, sm = cm.year, cm.month
        ms = date(sy, sm, 1)
        _, ld = monthrange(sy, sm)
        me = date(sy, sm, ld)
        a, b = max(ms, ws), min(me, today)
        if a <= b:
            segments.append((a, b))
        if ms <= ws:
            break
        cm = ms - relativedelta(months=1)
    segments.sort(key=lambda x: x[0])
    return segments


def _spread_dates(seg_start: date, seg_end: date, n: int) -> list[date]:
    if n <= 0:
        return []
    span = max((seg_end - seg_start).days, 0)
    if n == 1:
        return [seg_start + timedelta(days=span // 2)]
    out: list[date] = []
    for i in range(n):
        off = int(round(i * span / (n - 1))) if n > 1 else 0
        out.append(seg_start + timedelta(days=min(off, span)))
    return out


def _split_total(total: Decimal, weights: list[Decimal]) -> list[Decimal]:
    tw = sum(weights, Decimal("0"))
    if tw <= 0 or total <= 0:
        return []
    raw = [
        (total * w / tw).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for w in weights
    ]
    diff = total - sum(raw, Decimal("0"))
    if raw and diff != 0:
        raw[-1] = (raw[-1] + diff).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return raw


def build_programmatic_demo_transactions(
    today: date,
) -> tuple[list[dict[str, object]], Decimal]:
    """Multi-month posted banking activity: rising revenue with month-to-month wobble (~60.5% expenses).

    Returns transaction row dicts and the revenue of the latest *mostly full* month
    (for scaling account balances to ~2.65× that figure).
    """
    segments = _demo_banking_month_segments(today)
    rows: list[dict[str, object]] = []
    cnt = 0
    last_full_month_revenue = Decimal("0")

    inflow_templates = [
        ("Incoming transfer — {cp} — {ref}", "SEPA settlement"),
        ("Wire credit — {cp} — {ref}", "International receipt"),
        ("SEPA Credit — {cp}", "Invoice payment"),
        ("FPS incoming — {cp}", "UK settlement"),
    ]
    counterparties = [
        "Acme Logistics S.A.",
        "Nordic Parts AB",
        "Atlas Cloud Services IKE",
        "Helios Analytics OÜ",
        "Benelux Retail BV",
        "Mediterranean Trading SA",
    ]
    expense_templates = [
        ("Payroll — semi-monthly payroll run", "Payroll"),
        ("DEI — Electricity HQ", "Utilities"),
        ("GITHUB INC — Enterprise renewal", "Software & SaaS"),
        ("ATLASSIAN — Cloud seats", "Software & SaaS"),
        ("Office rent — business centre", "Rent"),
        ("LinkedIn Ads — campaign", "Advertising"),
        ("EUROLIFE — insurance bundle", "Insurance"),
        ("Legal retainer — counsel", "Professional services"),
        ("CLOUDFLARE — network services", "Software & SaaS"),
        ("AWS EMEA — infrastructure", "Software & SaaS"),
        ("TRAVEL — client onsite flights", "Travel"),
        ("Catering — team event", "Meals"),
    ]
    weight_out = [
        Decimal("18"),
        Decimal("14"),
        Decimal("12"),
        Decimal("11"),
        Decimal("10"),
        Decimal("9"),
        Decimal("8"),
        Decimal("7"),
        Decimal("6"),
        Decimal("5"),
        Decimal("4"),
        Decimal("3"),
    ]

    for mi, (seg_start, seg_end) in enumerate(segments):
        rev = (
            Decimal("392000")
            + Decimal("52000") * Decimal(str(mi))
            + Decimal(str(int(28000 * math.sin(mi * 1.27 + 0.4))))
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        exp = (rev * Decimal("0.605")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        if (seg_end - seg_start).days + 1 >= 26:
            last_full_month_revenue = rev

        n_in = 5 if mi % 2 == 0 else 4
        w_in = [Decimal("0.28"), Decimal("0.24"), Decimal("0.22"), Decimal("0.16"), Decimal("0.10")][
            :n_in
        ]
        in_amts = _split_total(rev, w_in)
        in_dates = _spread_dates(seg_start, seg_end, len(in_amts))

        for j, amt in enumerate(in_amts):
            if amt <= 0:
                continue
            cnt += 1
            cp = counterparties[(mi + j) % len(counterparties)]
            tpl, cat = inflow_templates[j % len(inflow_templates)]
            ref = f"INV-2026-{4000 + mi * 10 + j}"
            desc = tpl.format(cp=cp, ref=ref)
            rows.append(
                {
                    "id": f"demo-tx-p{cnt:04d}",
                    "account_id": _DEMO_BANK_ACCOUNTS[j % len(_DEMO_BANK_ACCOUNTS)],
                    "made_on": in_dates[j],
                    "amount": amt,
                    "category": cat,
                    "description": desc,
                    "status": "posted",
                    "merchant_id": None,
                    "mcc": None,
                    "iban": None,
                }
            )

        out_amts = _split_total(exp, weight_out)
        neg = [(-a).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for a in out_amts]
        out_dates = _spread_dates(seg_start, seg_end, len(neg))

        for j, amt in enumerate(neg):
            cnt += 1
            desc, cat = expense_templates[j % len(expense_templates)]
            rows.append(
                {
                    "id": f"demo-tx-p{cnt:04d}",
                    "account_id": _DEMO_BANK_ACCOUNTS[
                        (mi + j + 1) % len(_DEMO_BANK_ACCOUNTS)
                    ],
                    "made_on": out_dates[j],
                    "amount": amt,
                    "category": cat,
                    "description": desc,
                    "status": "posted",
                    "merchant_id": (f"merch_{j}" if j % 3 == 0 else None),
                    "mcc": (str(4800 + j) if j % 3 == 0 else None),
                    "iban": None,
                }
            )

    recent_start = today - timedelta(days=12)
    extras: list[tuple[str, float, str, str, str]] = [
        ("demo-tx-p8991", -199.0, "OPENAI — API usage", "Software & SaaS", "pending"),
        ("demo-tx-p8992", -84.5, "NOTION LABS — workspace", "Software & SaaS", "posted"),
        ("demo-tx-p8993", 18500.0, "Stripe payout — card batch", "Incoming transfer", "posted"),
    ]
    for i, (tid, raw_amt, desc, cat, st) in enumerate(extras):
        rows.append(
            {
                "id": tid,
                "account_id": _DEMO_BANK_ACCOUNTS[i % len(_DEMO_BANK_ACCOUNTS)],
                "made_on": recent_start + timedelta(days=i * 3),
                "amount": Decimal(str(raw_amt)),
                "category": cat,
                "description": desc,
                "status": st,
                "merchant_id": None,
                "mcc": None,
                "iban": None,
            }
        )

    # Exact-amount rows for reconciliation agent (must match DEMO_OPEN_INVOICES).
    match_rows: list[tuple[str, Decimal, str]] = [
        ("demo-tx-match01", Decimal("1200.00"), "SEPA — Acme Ltd — INV-DEMO-0001"),
        ("demo-tx-match02", Decimal("118.40"), "SEPA — Cloud Co — INV-DEMO-0002"),
        ("demo-tx-match03", Decimal("45280.00"), "Wire — Nordic Parts AB — PO-7781"),
        ("demo-tx-match04", Decimal("9900.00"), "SEPA — Baltic Freight OÜ"),
        ("demo-tx-match05", Decimal("4200.00"), "Stripe payout — card acquiring"),
        ("demo-tx-match06", Decimal("3100.00"), "SEPA — Atlas Cloud Services IKE"),
        ("demo-tx-match07", Decimal("8750.50"), "Incoming — Helios Analytics OÜ"),
        ("demo-tx-match08", Decimal("26400.00"), "SEPA — Mediterranean Trading SA"),
        ("demo-tx-match09", Decimal("5125.25"), "FPS — Benelux Retail BV"),
        ("demo-tx-match10", Decimal("18990.00"), "Wire — Enterprise renewal pool"),
        ("demo-tx-match11", Decimal("3333.33"), "Ambiguous pool A — misc receipt"),
        ("demo-tx-match12", Decimal("3333.33"), "Ambiguous pool B — misc receipt"),
    ]
    for i, (tid, amt, desc) in enumerate(match_rows):
        rows.append(
            {
                "id": tid,
                "account_id": _DEMO_BANK_ACCOUNTS[i % len(_DEMO_BANK_ACCOUNTS)],
                "made_on": today - timedelta(days=18 - i),
                "amount": amt,
                "category": "Incoming transfer",
                "description": desc,
                "status": "posted",
                "merchant_id": None,
                "mcc": None,
                "iban": None,
            }
        )

    if last_full_month_revenue <= 0 and segments:
        mi = max(0, len(segments) - 2)
        last_full_month_revenue = (
            Decimal("392000")
            + Decimal("52000") * Decimal(str(mi))
            + Decimal(str(int(28000 * math.sin(mi * 1.27 + 0.4))))
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    return rows, last_full_month_revenue


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
        consent_id = str(c.get("last_consent_id") or f"demo-consent-{c['id']}")
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
                last_consent_id=consent_id,
                created_at=_parse_dt(c.get("created_at")) or datetime.now(timezone.utc),
                updated_at=_parse_dt(c.get("updated_at")) or datetime.now(timezone.utc),
            )
        )
        session.add(
            ConsentModel(
                id=consent_id,
                external_id=consent_id,
                external_customer_id=c["customer_id"],
                external_connection_id=c["id"],
                connection_id=c["id"],
                status="active",
                scopes=["account_information"],
            )
        )

    today = datetime.now(timezone.utc).date()
    tx_rows, last_month_rev = build_programmatic_demo_transactions(today)
    balance_scale = (
        (last_month_rev * Decimal("2.65")) / _DEMO_BASE_TOTAL_BALANCE
    ).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)

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
                balance=(
                    Decimal(str(acc["balance"])) * balance_scale
                ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                currency_code=str(acc["currency_code"]).upper(),
                extra=acc.get("extra") or {},
            )
        )

    for tx in tx_rows:
        st = TransactionStatus(str(tx["status"]))
        made_on = tx["made_on"]
        if not isinstance(made_on, date):
            made_on = date.fromisoformat(str(made_on))
        extra: dict = {}
        if st == TransactionStatus.posted:
            extra["posting_date"] = made_on.isoformat()
        if tx.get("merchant_id") is not None:
            extra["merchant_id"] = tx["merchant_id"]
        if tx.get("mcc") is not None:
            extra["mcc"] = str(tx["mcc"])
        if tx.get("iban") is not None:
            extra["iban"] = tx["iban"]
        amt = tx["amount"]
        if not isinstance(amt, Decimal):
            amt = Decimal(str(amt))
        session.add(
            Transaction(
                id=str(tx["id"]),
                organization_id=org_id,
                account_id=str(tx["account_id"]),
                status=st,
                mode=TransactionMode.normal,
                duplicated=False,
                made_on=made_on,
                amount=amt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                currency_code="EUR",
                category=tx.get("category") if isinstance(tx.get("category"), str) else None,
                description=tx.get("description") if isinstance(tx.get("description"), str) else None,
                extra=extra,
            )
        )

    logger.info(
        "Inserted banking: 1 customer, %d connections, %d consents, %d accounts, "
        "%d transactions (~175d window; rising revenue wobble, ~60.5 pct expense ratio; "
        "balances ~2.65× last full month revenue ≈ %s EUR)",
        len(conn_rows),
        len(conn_rows),
        len(get_demo_payload("saltedge_accounts")["data"]),
        len(tx_rows),
        last_month_rev,
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


def _demo_invoice_status(raw: str | None):
    """Map demo JSON status strings to :class:`InvoiceStatus` (PostgreSQL enum)."""
    from app.db.models.invoices import InvoiceStatus

    key = str(raw or "draft").strip().lower()
    legacy = {
        "sent": InvoiceStatus.FINALIZED,
        "paid": InvoiceStatus.FINALIZED,
        "open": InvoiceStatus.DRAFT,
    }
    if key in legacy:
        return legacy[key]
    try:
        return InvoiceStatus(key)
    except ValueError:
        return InvoiceStatus.DRAFT


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
                status=_demo_invoice_status(inv.get("status")),
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


async def _insert_gl(session: AsyncSession, org_id: str) -> None:
    """Seed SaaS-style general ledger data (IFRS 15 wording, multi-entity, usage batches)."""
    from app.db.models._utils import utcnow
    from app.db.models.gl import (
        GlAccount,
        GlAccountType,
        GlAccountingPeriod,
        GlAuditEvent,
        GlBillingBatch,
        GlDimension,
        GlDimensionValue,
        GlJournalEntry,
        GlJournalLine,
        GlJournalLineDimensionTag,
        GlJournalStatus,
        GlLegalEntity,
        GlNormalBalance,
        GlPeriodStatus,
        GlRecognitionMethod,
        GlRecurringEntryTemplate,
        GlRecurringEntryTemplateLine,
        GlRecurringFrequency,
        GlRevenueRecognitionSchedule,
        GlRevenueRecognitionScheduleLine,
        GlSubledgerKind,
    )

    e1 = "00000000-0000-6000-8000-000000000001"
    e2 = "00000000-0000-6000-8000-000000000002"
    session.add(
        GlLegalEntity(
            id=e1,
            organization_id=org_id,
            code="HOLD",
            name="Factora Holding EU",
            functional_currency="EUR",
            is_primary=True,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )
    session.add(
        GlLegalEntity(
            id=e2,
            organization_id=org_id,
            code="US_SUB",
            name="Factora US Inc.",
            functional_currency="USD",
            is_primary=False,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )
    await session.flush()

    dim_cust = "00000000-0000-6000-8000-000000000010"
    dim_prod = "00000000-0000-6000-8000-000000000011"
    dim_dept = "00000000-0000-6000-8000-000000000012"
    session.add(
        GlDimension(
            id=dim_cust,
            organization_id=org_id,
            key="customer",
            label="Customer",
            deleted_at=None,
        )
    )
    session.add(
        GlDimension(
            id=dim_prod,
            organization_id=org_id,
            key="product_line",
            label="Product line",
            deleted_at=None,
        )
    )
    session.add(
        GlDimension(
            id=dim_dept,
            organization_id=org_id,
            key="department",
            label="Department",
            deleted_at=None,
        )
    )

    dv_acme = "00000000-0000-6000-8000-000000000020"
    dv_ent = "00000000-0000-6000-8000-000000000021"
    dv_api = "00000000-0000-6000-8000-000000000022"
    dv_fin = "00000000-0000-6000-8000-000000000023"
    session.add(
        GlDimensionValue(
            id=dv_acme,
            organization_id=org_id,
            dimension_id=dim_cust,
            code="ACME",
            label="Acme Corp",
            deleted_at=None,
        )
    )
    session.add(
        GlDimensionValue(
            id=dv_ent,
            organization_id=org_id,
            dimension_id=dim_prod,
            code="ENT",
            label="Enterprise tier",
            deleted_at=None,
        )
    )
    session.add(
        GlDimensionValue(
            id=dv_api,
            organization_id=org_id,
            dimension_id=dim_prod,
            code="API",
            label="API usage",
            deleted_at=None,
        )
    )
    session.add(
        GlDimensionValue(
            id=dv_fin,
            organization_id=org_id,
            dimension_id=dim_dept,
            code="FIN",
            label="Finance",
            deleted_at=None,
        )
    )

    acc_cash = "00000000-0000-6000-8000-000000000030"
    acc_ar = "00000000-0000-6000-8000-000000000031"
    acc_ar_detail = "00000000-0000-6000-8000-000000000037"
    acc_def = "00000000-0000-6000-8000-000000000032"
    acc_rev = "00000000-0000-6000-8000-000000000033"
    acc_cogs = "00000000-0000-6000-8000-000000000034"
    acc_ap = "00000000-0000-6000-8000-000000000035"
    acc_ap_accrual = "00000000-0000-6000-8000-000000000038"
    acc_opex = "00000000-0000-6000-8000-000000000036"
    # 1100/2100 remain **control** subledger accounts; 1110/2110 are non-control
    # detail targets for ``InvoiceGlBridgeService`` (manual journals forbid control lines).
    for aid, code, name, atype, nb, ctrl, sub in [
        (acc_cash, "1000", "Cash and cash equivalents", GlAccountType.ASSET, GlNormalBalance.DEBIT, False, GlSubledgerKind.NONE),
        (acc_ar, "1100", "Trade receivables (control)", GlAccountType.ASSET, GlNormalBalance.DEBIT, True, GlSubledgerKind.AR),
        (
            acc_ar_detail,
            "1110",
            "Trade receivables — invoiced (detail)",
            GlAccountType.ASSET,
            GlNormalBalance.DEBIT,
            False,
            GlSubledgerKind.NONE,
        ),
        (acc_def, "2000", "Deferred contract liability", GlAccountType.LIABILITY, GlNormalBalance.CREDIT, False, GlSubledgerKind.NONE),
        (acc_ap, "2100", "Trade payables (control)", GlAccountType.LIABILITY, GlNormalBalance.CREDIT, True, GlSubledgerKind.AP),
        (
            acc_ap_accrual,
            "2110",
            "Vendor invoices — accrued (detail)",
            GlAccountType.LIABILITY,
            GlNormalBalance.CREDIT,
            False,
            GlSubledgerKind.NONE,
        ),
        (acc_rev, "4000", "Subscription revenue", GlAccountType.REVENUE, GlNormalBalance.CREDIT, False, GlSubledgerKind.NONE),
        (acc_cogs, "5000", "Cost of subscription services", GlAccountType.EXPENSE, GlNormalBalance.DEBIT, False, GlSubledgerKind.NONE),
        (acc_opex, "6100", "General & administrative", GlAccountType.EXPENSE, GlNormalBalance.DEBIT, False, GlSubledgerKind.NONE),
    ]:
        session.add(
            GlAccount(
                id=aid,
                organization_id=org_id,
                parent_account_id=None,
                code=code,
                name=name,
                account_type=atype,
                normal_balance=nb,
                subledger_kind=sub,
                is_active=True,
                is_control_account=ctrl,
                sort_order=int(code),
                deleted_at=None,
                created_at=utcnow(),
                updated_at=utcnow(),
            )
        )

    p_jan = "00000000-0000-6000-8000-000000000040"
    p_feb = "00000000-0000-6000-8000-000000000041"
    session.add(
        GlAccountingPeriod(
            id=p_jan,
            organization_id=org_id,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            label="Jan 2026",
            status=GlPeriodStatus.OPEN,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )
    session.add(
        GlAccountingPeriod(
            id=p_feb,
            organization_id=org_id,
            period_start=date(2026, 2, 1),
            period_end=date(2026, 2, 28),
            label="Feb 2026",
            status=GlPeriodStatus.SOFT_CLOSE,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )

    je_posted = "00000000-0000-6000-8000-000000000050"
    je_draft = "00000000-0000-6000-8000-000000000051"
    jl_p1 = "00000000-0000-6000-8000-000000000060"
    jl_p2 = "00000000-0000-6000-8000-000000000061"
    jl_d1 = "00000000-0000-6000-8000-000000000062"
    jl_d2 = "00000000-0000-6000-8000-000000000063"

    session.add(
        GlJournalEntry(
            id=je_posted,
            organization_id=org_id,
            legal_entity_id=e1,
            posting_period_id=p_jan,
            status=GlJournalStatus.POSTED,
            document_currency="EUR",
            base_currency="EUR",
            fx_rate_to_base=Decimal("1"),
            memo="Cash invoicing — performance obligation satisfied over time (IFRS 15)",
            reference="INV-GL-001",
            source_batch_id="batch-stripe-usage-001",
            entry_date=date(2026, 1, 14),
            reversed_from_id=None,
            posted_at=utcnow(),
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )
    session.add(
        GlJournalLine(
            id=jl_p1,
            organization_id=org_id,
            journal_entry_id=je_posted,
            account_id=acc_cash,
            description="Cash receipt from enterprise contract",
            debit=Decimal("12000.00"),
            credit=Decimal("0"),
            line_order=0,
        )
    )
    session.add(
        GlJournalLine(
            id=jl_p2,
            organization_id=org_id,
            journal_entry_id=je_posted,
            account_id=acc_def,
            description="Deferred contract liability — unearned portion",
            debit=Decimal("0"),
            credit=Decimal("12000.00"),
            line_order=1,
        )
    )
    session.add(
        GlJournalLineDimensionTag(journal_line_id=jl_p1, dimension_value_id=dv_acme)
    )
    session.add(
        GlJournalLineDimensionTag(journal_line_id=jl_p1, dimension_value_id=dv_ent)
    )

    session.add(
        GlJournalEntry(
            id=je_draft,
            organization_id=org_id,
            legal_entity_id=e1,
            posting_period_id=p_jan,
            status=GlJournalStatus.DRAFT,
            document_currency="EUR",
            base_currency="EUR",
            fx_rate_to_base=Decimal("1"),
            memo="Draft: recognize January subscription revenue",
            reference=None,
            source_batch_id=None,
            entry_date=date(2026, 1, 31),
            reversed_from_id=None,
            posted_at=None,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )
    session.add(
        GlJournalLine(
            id=jl_d1,
            organization_id=org_id,
            journal_entry_id=je_draft,
            account_id=acc_def,
            description="Release deferred liability",
            debit=Decimal("5000.00"),
            credit=Decimal("0"),
            line_order=0,
        )
    )
    session.add(
        GlJournalLine(
            id=jl_d2,
            organization_id=org_id,
            journal_entry_id=je_draft,
            account_id=acc_rev,
            description="Revenue recognized in period",
            debit=Decimal("0"),
            credit=Decimal("5000.00"),
            line_order=1,
        )
    )

    session.add(
        GlBillingBatch(
            id="00000000-0000-6000-8000-000000000070",
            organization_id=org_id,
            legal_entity_id=e1,
            external_batch_id="batch-stripe-usage-001",
            source_system="stripe_billing",
            event_count=2_847_192,
            total_amount=Decimal("12000.00"),
            currency="EUR",
            received_at=utcnow(),
        )
    )
    session.add(
        GlBillingBatch(
            id="00000000-0000-6000-8000-000000000071",
            organization_id=org_id,
            legal_entity_id=e2,
            external_batch_id="batch-metronome-hourly-us",
            source_system="metronome",
            event_count=9_102_334,
            total_amount=Decimal("48000.00"),
            currency="USD",
            received_at=utcnow(),
        )
    )

    sch_id = "00000000-0000-6000-8000-000000000080"
    session.add(
        GlRevenueRecognitionSchedule(
            id=sch_id,
            organization_id=org_id,
            legal_entity_id=e1,
            contract_name="Acme — 12-month enterprise (IFRS 15 schedule)",
            currency="EUR",
            total_contract_value=Decimal("12000.00"),
            recognition_method=GlRecognitionMethod.STRAIGHT_LINE,
            created_at=utcnow(),
        )
    )
    for i, (opn, rec, clo) in enumerate(
        [
            (Decimal("12000"), Decimal("1000"), Decimal("11000")),
            (Decimal("11000"), Decimal("1000"), Decimal("10000")),
            (Decimal("10000"), Decimal("1000"), Decimal("9000")),
        ]
    ):
        session.add(
            GlRevenueRecognitionScheduleLine(
                id=f"00000000-0000-6000-8000-00000000008{i + 1}",
                organization_id=org_id,
                schedule_id=sch_id,
                period_month=date(2026, 1 + i, 1),
                deferred_opening=opn,
                recognized_in_period=rec,
                deferred_closing=clo,
            )
        )

    sch_us = "00000000-0000-6000-8000-000000000085"
    session.add(
        GlRevenueRecognitionSchedule(
            id=sch_us,
            organization_id=org_id,
            legal_entity_id=e2,
            contract_name="US sub — API metering (usage-based recognition)",
            currency="USD",
            total_contract_value=Decimal("48000.00"),
            recognition_method=GlRecognitionMethod.USAGE_BASED,
            created_at=utcnow(),
        )
    )
    for i, (opn, rec, clo) in enumerate(
        [
            (Decimal("48000"), Decimal("8200"), Decimal("39800")),
            (Decimal("39800"), Decimal("15300"), Decimal("24500")),
            (Decimal("24500"), Decimal("24500"), Decimal("0")),
        ]
    ):
        session.add(
            GlRevenueRecognitionScheduleLine(
                id=f"00000000-0000-6000-8000-00000000009{i + 5}",
                organization_id=org_id,
                schedule_id=sch_us,
                period_month=date(2026, 1 + i, 1),
                deferred_opening=opn,
                recognized_in_period=rec,
                deferred_closing=clo,
            )
        )

    tmpl_id = "00000000-0000-6000-8000-000000000090"
    session.add(
        GlRecurringEntryTemplate(
            id=tmpl_id,
            organization_id=org_id,
            legal_entity_id=e1,
            name="Monthly SaaS hosting accrual",
            memo="Estimate based on usage dashboards",
            frequency=GlRecurringFrequency.MONTHLY,
            day_of_month=1,
            is_active=True,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
    )
    session.add(
        GlRecurringEntryTemplateLine(
            id="00000000-0000-6000-8000-000000000091",
            organization_id=org_id,
            template_id=tmpl_id,
            account_id=acc_cogs,
            description="Hosting COGS accrual",
            debit=Decimal("2500.00"),
            credit=Decimal("0"),
            line_order=0,
        )
    )
    session.add(
        GlRecurringEntryTemplateLine(
            id="00000000-0000-6000-8000-000000000092",
            organization_id=org_id,
            template_id=tmpl_id,
            account_id=acc_ap,
            description="Accrued hosting payable",
            debit=Decimal("0"),
            credit=Decimal("2500.00"),
            line_order=1,
        )
    )

    session.add(
        GlAuditEvent(
            id="00000000-0000-6000-8000-0000000000A0",
            organization_id=org_id,
            subject_type="journal_entry",
            subject_id=je_posted,
            action="created",
            actor_user_id=DEMO_USER_ID,
            payload={"source": "seed_demo_db"},
            created_at=utcnow(),
        )
    )
    session.add(
        GlAuditEvent(
            id="00000000-0000-6000-8000-0000000000A1",
            organization_id=org_id,
            subject_type="journal_entry",
            subject_id=je_posted,
            action="posted",
            actor_user_id=DEMO_USER_ID,
            payload=None,
            created_at=utcnow(),
        )
    )
    logger.info("Inserted general ledger demo (entities, CoA, journals, batches, IFRS 15 schedule)")


async def _upsert_demo_user(session: AsyncSession, org_id: str) -> None:
    """Ensure a password user exists with JWT ``organization_id`` = seeded demo org."""
    import uuid

    from app.config import settings
    from app.core.security.hashing import hash_password
    from app.db.models.identity import (
        User,
        UserOrganizationMembership,
        UserRole,
        UserSession,
    )

    password = os.environ.get("DEMO_SEED_PASSWORD", _DEFAULT_DEMO_PASSWORD)
    pw_hash = hash_password(password, pepper=settings.CODE_PEPPER)

    await session.execute(delete(UserSession).where(UserSession.user_id == DEMO_USER_ID))

    r = await session.execute(select(User).where(User.id == DEMO_USER_ID))
    user = r.scalar_one_or_none()
    if user:
        user.username = DEMO_USER_USERNAME
        user.email = DEMO_USER_EMAIL
        user.password_hash = pw_hash
        user.organization_id = org_id
        user.role = UserRole.OWNER
        user.email_verified = True
        user.is_active = True
    else:
        taken = await session.execute(select(User.id).where(User.email == DEMO_USER_EMAIL))
        other_id = taken.scalar_one_or_none()
        if other_id and str(other_id) != DEMO_USER_ID:
            raise RuntimeError(
                f"Cannot seed demo user: email {DEMO_USER_EMAIL} is already used by user {other_id}"
            )
        session.add(
            User(
                id=DEMO_USER_ID,
                username=DEMO_USER_USERNAME,
                email=DEMO_USER_EMAIL,
                password_hash=pw_hash,
                role=UserRole.OWNER,
                organization_id=org_id,
                email_verified=True,
                phone_verified=False,
                is_active=True,
            )
        )

    await session.flush()

    mr = await session.execute(
        select(UserOrganizationMembership).where(
            UserOrganizationMembership.user_id == DEMO_USER_ID,
            UserOrganizationMembership.organization_id == org_id,
        )
    )
    if mr.scalar_one_or_none() is None:
        session.add(
            UserOrganizationMembership(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                organization_id=org_id,
                role=UserRole.OWNER,
            )
        )

    logger.info(
        "Demo login: %s (use DEMO_SEED_PASSWORD env or default dev password from module docstring)",
        DEMO_USER_EMAIL,
    )


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
            # Demo user must exist before GL seed: audit events reference DEMO_USER_ID (FK → users).
            await _upsert_demo_user(session, DEMO_ORG_ID)
            await session.flush()
            await _insert_counterparties(session, DEMO_ORG_ID)
            await _insert_banking(session, DEMO_ORG_ID)
            await _insert_aade(session, DEMO_ORG_ID)
            await _insert_invoices(session, DEMO_ORG_ID)
            await _insert_alerts(session, DEMO_ORG_ID)
            await _insert_gl(session, DEMO_ORG_ID)

    logger.info("Demo DB seed completed for org %s", DEMO_ORG_ID)


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
