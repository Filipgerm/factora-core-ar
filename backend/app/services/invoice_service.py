"""InvoiceService — unified invoice persistence per organization.

Scope: Create and list ``Invoice`` rows for all ``InvoiceSource`` values.
Contract: Accepts Pydantic requests, returns ORM instances, raises ``ValidationError``
for business-rule violations (e.g. duplicate ``external_id`` per org+source).

Flow:
    1. ``create`` — optional dedup on (organization_id, source, external_id).
    2. ``list_for_org`` — active rows ordered by issue_date desc.

Architectural Notes:
    Kept as a **standalone service** (not folded into ``DashboardService``):
    invoices are a core accounting entity with their own lifecycle (OCR, CSV,
    AADE sync, reconciliation references) while the dashboard service remains a
    read aggregator for KPIs and federated views. See ``backend/CLAUDE.md``.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError
from app.db.models.invoices import Invoice, InvoiceSource
from app.models.invoices import InvoiceCreateRequest, InvoiceSourceEnum


class InvoiceService:
    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self.db = db
        self.organization_id = organization_id

    def _to_orm_source(self, src: InvoiceSourceEnum) -> InvoiceSource:
        return InvoiceSource(src.value)

    async def create(self, body: InvoiceCreateRequest) -> Invoice:
        orm_source = self._to_orm_source(body.source)
        if body.external_id:
            dup = await self.db.scalar(
                select(Invoice.id).where(
                    Invoice.organization_id == self.organization_id,
                    Invoice.source == orm_source,
                    Invoice.external_id == body.external_id,
                    Invoice.deleted_at.is_(None),
                )
            )
            if dup:
                raise ValidationError(
                    "An invoice with this external_id already exists for this source.",
                    code="validation.duplicate_external_id",
                    fields={"external_id": "Must be unique per organization and source"},
                )

        display = body.resolved_counterparty_display_name()
        inv = Invoice(
            organization_id=self.organization_id,
            source=orm_source,
            external_id=body.external_id,
            counterparty_id=body.counterparty_id,
            counterparty_display_name=display,
            amount=body.amount,
            currency=body.currency.upper(),
            issue_date=body.issue_date,
            due_date=body.due_date,
            status=body.status,
        )
        self.db.add(inv)
        await self.db.commit()
        await self.db.refresh(inv)
        return inv

    async def list_for_org(
        self,
        *,
        source: InvoiceSource | None = None,
    ) -> list[Invoice]:
        stmt = (
            select(Invoice)
            .where(
                Invoice.organization_id == self.organization_id,
                Invoice.deleted_at.is_(None),
            )
            .order_by(Invoice.issue_date.desc(), Invoice.created_at.desc())
        )
        if source is not None:
            stmt = stmt.where(Invoice.source == source)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
