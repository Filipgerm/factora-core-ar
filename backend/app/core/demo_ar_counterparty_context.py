"""AR customer hub / products / schedules demo payloads for seeded counterparties.

Persisted on ``counterparties.ar_demo_context`` by ``scripts/seed_demo_db.py``.
The frontend reads this JSON via GET /v1/organization/counterparties — no duplicate
customer narrative in TS.
"""

from __future__ import annotations

from typing import Any

MONTHS_DC = [
    "May '24",
    "Jun '24",
    "Jul '24",
    "Aug '24",
    "Sep '24",
    "Oct '24",
    "Nov '24",
    "Dec '24",
    "Jan '25",
    "Feb '25",
    "Mar '25",
    "Apr '25",
]


def _currency_for_country(country: str | None) -> str:
    if not country:
        return "EUR"
    u = country.upper()
    if u == "US":
        return "USD"
    if u in ("GB", "UK"):
        return "GBP"
    return "EUR"


def _sym(currency: str) -> str:
    return {"EUR": "€", "GBP": "£", "USD": "$"}[currency]


def _billing_monthly(amount: float) -> list[dict[str, Any]]:
    return [{"month": m, "Billed": amount, "Unbilled": 0.0} for m in MONTHS_DC]


def _revenue_monthly(amount: float) -> list[dict[str, Any]]:
    return [{"month": m, "Actual": amount, "Forecasted": 0.0} for m in MONTHS_DC]


def _generic_platform_product_detail(amount: float, currency: str) -> dict[str, Any]:
    return {
        "slug": "generic-platform",
        "title": "Platform subscription",
        "summaryStrip": {
            "totalContracted": amount * 12,
            "pricingModel": "Recurring",
            "unitPrice": amount,
            "qty": 1,
            "invoiceAmount": amount,
            "currency": currency,
        },
        "billingSchedule": {
            "frequency": "Monthly",
            "paymentTerms": "Net 30",
            "periodLabel": "Annual cycle",
            "billedTotal": amount * 12,
            "chart": _billing_monthly(amount),
        },
        "revenueSchedule": {
            "servicePeriod": "Aligned billing",
            "recognized": amount * 12,
            "remainingLabel": "—",
            "chart": _revenue_monthly(amount),
        },
    }


def _fallback_hub(legal_name: str, currency: str) -> dict[str, Any]:
    sym = _sym(currency)
    return {
        "dataSourcesLine": f"Exists in HubSpot · {legal_name} (registry)",
        "customerSinceDate": "2024-03-18",
        "termEndsLabel": "—",
        "remainingInvoices": 3,
        "billedThroughTabs": 18500,
        "revenueArr": 48000,
        "revenueNote": "Contracted annual value",
        "cashCollected90d": 9200,
        "currency": currency,
        "billingSectionTitle": "Billing & revenue",
        "billingStatusLine": "Schedule your next invoice review in Factora.",
        "productPricingRows": [
            {"product": "Platform subscription", "pricing": f"{sym}2,500.00 /month"},
            {"product": "Professional services", "pricing": f"{sym}180.00 /hour"},
        ],
    }


def _price_mo(sym: str, amount: float) -> str:
    return f"{sym}{amount:,.2f} /mo"


def _generic_shell(
    *,
    country: str | None,
    legal_name: str,
    ar_customer: dict[str, Any],
    amount: float = 2500.0,
) -> dict[str, Any]:
    currency = _currency_for_country(country)
    sym = _sym(currency)
    hub = _fallback_hub(legal_name, currency)
    groups = [
        {
            "id": "og-generic",
            "title": "Subscription & services",
            "rows": [
                {
                    "id": "generic-platform",
                    "name": "Platform subscription",
                    "kindLabel": "Subscription",
                    "serviceRange": "Rolling annual",
                    "invoicingLabel": "Aligned to schedule",
                    "invoicingTone": "partial",
                    "priceLabel": _price_mo(sym, amount),
                    "activePeriod": True,
                }
            ],
        }
    ]

    details = {
        "generic-platform": _generic_platform_product_detail(amount, currency),
    }
    out: dict[str, Any] = {
        "hub": hub,
        "product_groups": groups,
        "product_details": details,
    }
    if ar_customer:
        out["ar_customer"] = ar_customer
    return out


# --- Digital Consulting (full designer narrative) --------------------------------

_DC = "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90101"
_ACME_ID = "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90102"


def _acme_monthly_demo(
    amount: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Billing/revenue chart rows using shared MONTHS_DC."""
    return _billing_monthly(amount), _revenue_monthly(amount)


def _acme_product_detail(
    slug: str,
    title: str,
    *,
    monthly_amount: float,
    pricing_model: str = "Usage / recurring",
    qty: int = 1,
    unit_price: float | None = None,
    currency: str = "USD",
    period_label: str = "Oct 27 '24 – Oct 26 '27 (demo cadence)",
    svc_period: str = "Oct 27 '24 – Oct 26 '27",
) -> dict[str, Any]:
    """Compact IFRS-style schedule payload for ACME SKU drill-down."""
    unit = unit_price if unit_price is not None else monthly_amount
    bill_r, rev_r = _acme_monthly_demo(monthly_amount)
    annual = monthly_amount * 12
    return {
        "slug": slug,
        "title": title,
        "summaryStrip": {
            "totalContracted": annual,
            "pricingModel": pricing_model,
            "unitPrice": unit,
            "qty": qty,
            "invoiceAmount": monthly_amount,
            "currency": currency,
        },
        "billingSchedule": {
            "frequency": "Monthly · aligned to subscription term",
            "paymentTerms": "Net 14",
            "periodLabel": period_label,
            "billedTotal": annual,
            "chart": bill_r,
        },
        "revenueSchedule": {
            "servicePeriod": svc_period,
            "recognized": annual,
            "remainingLabel": "—",
            "chart": rev_r,
        },
    }


def _acme_corporation_context(ar_customer: dict[str, Any]) -> dict[str, Any]:
    """Rich catalog for ACME Corporation — matches designer reference (tiered usage SKUs)."""
    hub = _fallback_hub("ACME Corporation", "USD")
    hub["dataSourcesLine"] = "Exists in HubSpot · Stripe Billing"
    hub["customerSinceDate"] = "2022-11-03"
    hub["productPricingRows"] = [
        {"product": "API Call Blocks", "pricing": "$0.04 – $0.08 /unit/mo"},
        {"product": "Core Platform: Starter", "pricing": "$1,000.00 /mo"},
        {"product": "Data Processing Credits", "pricing": "$0.05 – $0.18 /unit/mo"},
        {"product": "Report Exports", "pricing": "$0.00 – $0.50 /unit/mo"},
        {"product": "User Seats", "pricing": "$50.00 /unit/mo"},
    ]
    svc = "Service Oct 27 '24 – Oct 26 '27"
    product_groups = [
        {
            "id": "og-acme-enterprise",
            "title": "ACME Enterprise Order Form",
            "rows": [
                {
                    "id": "api-call-blocks",
                    "name": "API Call Blocks",
                    "kindLabel": "Usage",
                    "kindTone": "usage",
                    "serviceRange": svc,
                    "invoicingLabel": "11 of 36 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$0.04 – $0.08 /unit/mo",
                    "activePeriod": True,
                    "tieredPricing": [
                        {"label": "0–1000 Blocks", "price": "$0.08"},
                        {"label": "1000–5000 Blocks", "price": "$0.06"},
                        {"label": "5000+ Blocks", "price": "$0.04"},
                    ],
                },
                {
                    "id": "core-platform-starter",
                    "name": "Core Platform: Starter",
                    "kindLabel": "Platform",
                    "kindTone": "platform",
                    "serviceRange": svc,
                    "invoicingLabel": "12 of 36 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$1,000.00 /mo",
                    "activePeriod": True,
                },
                {
                    "id": "data-processing-credits",
                    "name": "Data Processing Credits",
                    "kindLabel": "Usage",
                    "kindTone": "usage",
                    "serviceRange": svc,
                    "invoicingLabel": "11 of 36 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$0.05 – $0.18 /unit/mo",
                    "activePeriod": True,
                    "tieredPricing": [
                        {"label": "0–100000 credits", "price": "$0.10"},
                        {"label": "400000–500000 credits", "price": "$0.18"},
                        {"label": "500000+ credits", "price": "$0.05"},
                    ],
                },
                {
                    "id": "report-exports",
                    "name": "Report Exports",
                    "kindLabel": "Usage",
                    "kindTone": "usage",
                    "serviceRange": svc,
                    "invoicingLabel": "11 of 36 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$0.00 – $0.50 /unit/mo",
                    "activePeriod": True,
                    "tieredPricing": [
                        {"label": "0–1000 exports", "price": "$0.00"},
                        {"label": "1000+ exports", "price": "$0.50"},
                    ],
                },
                {
                    "id": "user-seats",
                    "name": "User Seats",
                    "kindLabel": "Seats",
                    "kindTone": "seats",
                    "serviceRange": svc,
                    "invoicingLabel": "11 of 36 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$50.00 /unit/mo",
                    "activePeriod": True,
                },
            ],
        }
    ]

    product_details = {
        "api-call-blocks": _acme_product_detail(
            "api-call-blocks",
            "API Call Blocks",
            monthly_amount=720.0,
            unit_price=0.06,
            pricing_model="Tiered usage (demo midpoint)",
        ),
        "core-platform-starter": _acme_product_detail(
            "core-platform-starter",
            "Core Platform: Starter",
            monthly_amount=1000.0,
            unit_price=1000.0,
            pricing_model="Flat recurring",
        ),
        "data-processing-credits": _acme_product_detail(
            "data-processing-credits",
            "Data Processing Credits",
            monthly_amount=1850.0,
            unit_price=0.115,
            pricing_model="Tiered usage (demo midpoint)",
        ),
        "report-exports": _acme_product_detail(
            "report-exports",
            "Report Exports",
            monthly_amount=275.0,
            unit_price=0.25,
            pricing_model="Tiered usage (demo midpoint)",
        ),
        "user-seats": _acme_product_detail(
            "user-seats",
            "User Seats",
            monthly_amount=3500.0,
            qty=70,
            unit_price=50.0,
            pricing_model="Per-seat subscription",
        ),
    }

    out: dict[str, Any] = {
        "hub": hub,
        "product_groups": product_groups,
        "product_details": product_details,
    }
    if ar_customer:
        out["ar_customer"] = ar_customer
    return out


_DC_AR_CUSTOMER = {
    "totalOutstanding": 48250,
    "overdueAmount": 0,
    "dsoDays": 28,
    "paymentTerms": "Net 30",
    "lastPaymentDate": "2025-03-15",
    "aging": {"current": 48250, "d1_30": 0, "d31_60": 0, "d60plus": 0},
    "invoices": [
        {"id": "inv-dc-1", "number": "INV-24089", "amount": 3500},
        {"id": "inv-dc-2", "number": "INV-24102", "amount": 8200},
    ],
    "payments": [
        {
            "id": "pay-dc-1",
            "date": "2025-03-15",
            "amount": "$12,400.00",
            "method": "ACH",
        }
    ],
}

_DC_CHART_3K_B = _billing_monthly(3000.0)
_DC_CHART_3K_R = _revenue_monthly(3000.0)


def _digital_consulting_context() -> dict[str, Any]:
    hub = {
        "dataSourcesLine": "Exists in QuickBooks · Salesforce",
        "customerSinceDate": "2025-04-17",
        "termEndsLabel": "May 1, 2026",
        "remainingInvoices": 7,
        "billedThroughTabs": 61250,
        "revenueArr": 42000,
        "revenueNote": "ARR from last uploaded contract (May 2025)",
        "cashCollected90d": 0,
        "currency": "USD",
        "billingSectionTitle": "Billing & revenue — adjust line items and modify schedules",
        "billingStatusLine": "Last invoice from Oct 1, 2025 is sent",
        "productPricingRows": [
            {"product": "Professional Services", "pricing": "$200.00 /month"},
            {"product": "Core Platform", "pricing": "$3,000.00 /month"},
            {"product": "Core Platform", "pricing": "$3,500.00 /month"},
        ],
    }
    product_groups = [
        {
            "id": "og-dc",
            "title": "Digital Consulting Order form",
            "rows": [
                {
                    "id": "core-platform-legacy",
                    "name": "Core Platform",
                    "kindLabel": "Platform",
                    "serviceRange": "Service May 1 '24 – Apr 30 '25",
                    "invoicingLabel": "12 of 12 invoiced",
                    "invoicingTone": "complete",
                    "priceLabel": "$3,000.00 /mo",
                },
                {
                    "id": "professional-services-legacy",
                    "name": "Professional Services",
                    "kindLabel": "Service",
                    "serviceRange": "Service May 1 '24 – Apr 30 '25",
                    "invoicingLabel": "12 of 12 invoiced",
                    "invoicingTone": "complete",
                    "priceLabel": "$200.00 /unit/mo",
                },
            ],
        },
        {
            "id": "og-dc-renewal",
            "title": "Renewal_Digital Consulting Order form",
            "rows": [
                {
                    "id": "core-platform-renewal",
                    "name": "Core Platform",
                    "kindLabel": "Platform",
                    "serviceRange": "Service May 1 '25 – Apr 30 '26",
                    "invoicingLabel": "6 of 12 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$3,500.00 /mo",
                    "activePeriod": True,
                },
                {
                    "id": "professional-services-renewal",
                    "name": "Professional Services",
                    "kindLabel": "Service",
                    "serviceRange": "Service May 1 '25 – Apr 30 '26",
                    "invoicingLabel": "5 of 12 invoiced",
                    "invoicingTone": "partial",
                    "priceLabel": "$250.00 /unit/mo",
                    "activePeriod": True,
                },
            ],
        },
    ]

    def _detail_generic_dc(
        slug: str,
        title: str,
        amt: float,
        *,
        currency: str = "USD",
        pricing_model: str = "Recurring",
        qty: int = 1,
        period: str = "Annual cycle",
        svc: str = "Aligned billing",
    ) -> dict[str, Any]:
        return {
            "slug": slug,
            "title": title,
            "summaryStrip": {
                "totalContracted": amt * 12,
                "pricingModel": pricing_model,
                "unitPrice": amt,
                "qty": qty,
                "invoiceAmount": amt * qty if qty > 1 else amt,
                "currency": currency,
            },
            "billingSchedule": {
                "frequency": "Monthly",
                "paymentTerms": "Net 30",
                "periodLabel": period,
                "billedTotal": amt * 12,
                "chart": _billing_monthly(amt),
            },
            "revenueSchedule": {
                "servicePeriod": svc,
                "recognized": amt * 12,
                "remainingLabel": "—",
                "chart": _revenue_monthly(amt),
            },
        }

    product_details: dict[str, Any] = {
        "professional-services-legacy": {
            "slug": "professional-services-legacy",
            "title": "Professional Services",
            "summaryStrip": {
                "totalContracted": 36000,
                "pricingModel": "Flat price",
                "unitPrice": 200,
                "qty": 15,
                "invoiceAmount": 3000,
                "currency": "USD",
            },
            "billingSchedule": {
                "frequency": "Monthly (Starts May 1, 2024)",
                "paymentTerms": "Net 30",
                "periodLabel": "May 1 '24 – Apr 30 '25 (12 invoices)",
                "billedTotal": 36000,
                "chart": _DC_CHART_3K_B,
            },
            "revenueSchedule": {
                "servicePeriod": "May 1 '24 – Apr 30 '25",
                "recognized": 36000,
                "remainingLabel": "—",
                "chart": _DC_CHART_3K_R,
            },
        },
        "core-platform-legacy": _detail_generic_dc(
            "core-platform-legacy",
            "Core Platform",
            3000.0,
            period="Annual cycle",
            svc="Aligned billing",
        ),
        "core-platform-renewal": _detail_generic_dc(
            "core-platform-renewal",
            "Core Platform",
            3500.0,
        ),
        "professional-services-renewal": _detail_generic_dc(
            "professional-services-renewal",
            "Professional Services",
            250.0,
        ),
    }

    return {
        "ar_customer": _DC_AR_CUSTOMER,
        "hub": hub,
        "product_groups": product_groups,
        "product_details": product_details,
    }


# --- Overlays for generic customers (list enrichment) ---------------------------

_OVERLAYS: dict[str, dict[str, Any]] = {
    "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c01": {
        "totalOutstanding": 22400,
        "overdueAmount": 0,
        "dsoDays": 31,
        "paymentTerms": "Net 30",
        "lastPaymentDate": "2025-03-10",
        "aging": {"current": 22400, "d1_30": 0, "d31_60": 0, "d60plus": 0},
        "invoices": [],
        "payments": [],
    },
    "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a05": {
        "totalOutstanding": 5600,
        "overdueAmount": 0,
        "dsoDays": 18,
        "paymentTerms": "Net 14",
        "lastPaymentDate": "2025-04-01",
        "aging": {"current": 5600, "d1_30": 0, "d31_60": 0, "d60plus": 0},
        "invoices": [],
        "payments": [],
    },
    "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90102": {
        "totalOutstanding": 12100,
        "overdueAmount": 2100,
        "dsoDays": 41,
        "paymentTerms": "Net 14",
        "lastPaymentDate": "2025-02-01",
        "aging": {"current": 8000, "d1_30": 2100, "d31_60": 2000, "d60plus": 0},
        "invoices": [],
        "payments": [],
    },
    "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90103": {
        "totalOutstanding": 8940,
        "overdueAmount": 0,
        "dsoDays": 22,
        "paymentTerms": "Net 30",
        "lastPaymentDate": "2025-03-28",
        "aging": {"current": 8940, "d1_30": 0, "d31_60": 0, "d60plus": 0},
        "invoices": [],
        "payments": [],
    },
    "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90104": {
        "totalOutstanding": 15680,
        "overdueAmount": 1200,
        "dsoDays": 35,
        "paymentTerms": "Net 45",
        "lastPaymentDate": "2025-02-18",
        "aging": {"current": 12000, "d1_30": 1200, "d31_60": 2480, "d60plus": 0},
        "invoices": [],
        "payments": [],
    },
}


def ar_demo_context_for_counterparty(
    counterparty_id: str,
    cp_type: str,
    country: str | None,
    legal_name: str,
) -> dict[str, Any] | None:
    """Return JSON for ``ar_demo_context`` or ``None`` for vendor-only rows."""
    t = str(cp_type).lower()
    if t == "vendor":
        return None

    if counterparty_id == _DC:
        return _digital_consulting_context()

    overlay = _OVERLAYS.get(counterparty_id, {})
    ar_customer = dict(overlay) if overlay else {}

    if counterparty_id == _ACME_ID:
        return _acme_corporation_context(ar_customer)

    return _generic_shell(
        country=country,
        legal_name=legal_name,
        ar_customer=ar_customer,
        amount=2500.0,
    )
