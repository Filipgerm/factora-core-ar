"""GlController — HTTP-facing orchestration for general ledger endpoints."""

from __future__ import annotations

from app.models.general_ledger import (
    GlAccountCreateRequest,
    GlAccountResponse,
    GlAccountUpdateRequest,
    GlAccountingPeriodResponse,
    GlAccountingPeriodUpdateRequest,
    GlAuditEventResponse,
    GlBillingBatchResponse,
    GlDimensionResponse,
    GlFxQuoteResponse,
    GlJournalEntryCreateRequest,
    GlJournalEntryResponse,
    GlJournalEntryReverseRequest,
    GlJournalEntryUpdateRequest,
    GlLegalEntityResponse,
    GlRecurringTemplateCreateRequest,
    GlRecurringTemplateGenerateJournalRequest,
    GlRecurringTemplateResponse,
    GlRecurringTemplateUpdateRequest,
    GlRevenueScheduleResponse,
    GlTrialBalanceRowResponse,
)
from app.services.gl_service import GlService


class GlController:
    def __init__(self, service: GlService) -> None:
        self.service = service

    async def list_entities(self) -> list[GlLegalEntityResponse]:
        return await self.service.list_entities()

    async def list_accounts(self) -> list[GlAccountResponse]:
        return await self.service.list_accounts()

    async def create_account(self, body: GlAccountCreateRequest) -> GlAccountResponse:
        return await self.service.create_account(body)

    async def update_account(
        self, account_id: str, body: GlAccountUpdateRequest
    ) -> GlAccountResponse:
        return await self.service.update_account(account_id, body)

    async def list_periods(self) -> list[GlAccountingPeriodResponse]:
        return await self.service.list_periods()

    async def update_period(
        self, period_id: str, body: GlAccountingPeriodUpdateRequest
    ) -> GlAccountingPeriodResponse:
        return await self.service.update_period(period_id, body)

    async def list_dimensions(self) -> list[GlDimensionResponse]:
        return await self.service.list_dimensions()

    async def list_journal_entries(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
        account_id: str | None,
        status: str | None,
        posting_period_id: str | None,
        source_batch_id: str | None,
    ) -> list[GlJournalEntryResponse]:
        return await self.service.list_journal_entries(
            legal_entity_id=legal_entity_id,
            consolidated=consolidated,
            account_id=account_id,
            status=status,
            posting_period_id=posting_period_id,
            source_batch_id=source_batch_id,
        )

    async def get_journal_entry(self, entry_id: str) -> GlJournalEntryResponse:
        return await self.service.get_journal_entry(entry_id)

    async def create_journal_entry(
        self, body: GlJournalEntryCreateRequest
    ) -> GlJournalEntryResponse:
        return await self.service.create_journal_entry(body)

    async def update_journal_entry(
        self, entry_id: str, body: GlJournalEntryUpdateRequest
    ) -> GlJournalEntryResponse:
        return await self.service.update_journal_entry(entry_id, body)

    async def post_journal_entry(self, entry_id: str) -> GlJournalEntryResponse:
        return await self.service.post_journal_entry(entry_id)

    async def reverse_journal_entry(
        self,
        entry_id: str,
        body: GlJournalEntryReverseRequest | None,
    ) -> GlJournalEntryResponse:
        return await self.service.reverse_journal_entry(entry_id, body)

    async def list_journal_audit(self, entry_id: str) -> list[GlAuditEventResponse]:
        return await self.service.list_audit_for_journal(entry_id)

    async def list_billing_batches(self) -> list[GlBillingBatchResponse]:
        return await self.service.list_billing_batches()

    async def list_revenue_schedules(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
    ) -> list[GlRevenueScheduleResponse]:
        return await self.service.list_revenue_schedules(
            legal_entity_id=legal_entity_id,
            consolidated=consolidated,
        )

    async def trial_balance(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
        posting_period_id: str | None,
    ) -> list[GlTrialBalanceRowResponse]:
        return await self.service.trial_balance(
            legal_entity_id=legal_entity_id,
            consolidated=consolidated,
            posting_period_id=posting_period_id,
        )

    def fx_quote(self, from_currency: str, to_currency: str) -> GlFxQuoteResponse:
        return self.service.fx_quote(from_currency, to_currency)

    async def list_recurring_templates(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
    ) -> list[GlRecurringTemplateResponse]:
        return await self.service.list_recurring_templates(
            legal_entity_id=legal_entity_id,
            consolidated=consolidated,
        )

    async def create_recurring_template(
        self, body: GlRecurringTemplateCreateRequest
    ) -> GlRecurringTemplateResponse:
        return await self.service.create_recurring_template(body)

    async def update_recurring_template(
        self, template_id: str, body: GlRecurringTemplateUpdateRequest
    ) -> GlRecurringTemplateResponse:
        return await self.service.update_recurring_template(template_id, body)

    async def generate_journal_from_recurring_template(
        self,
        template_id: str,
        body: GlRecurringTemplateGenerateJournalRequest | None,
    ) -> GlJournalEntryResponse:
        return await self.service.generate_journal_from_recurring_template(
            template_id, body
        )
