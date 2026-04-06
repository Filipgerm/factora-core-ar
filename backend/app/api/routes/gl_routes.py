"""General ledger API routes."""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Query

from app.dependencies import GlCtrl, require_auth
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
    GlRecurringTemplateResponse,
    GlRecurringTemplateUpdateRequest,
    GlRevenueScheduleResponse,
    GlTrialBalanceRowResponse,
)

router = APIRouter(dependencies=[Depends(require_auth)])


@router.get("/entities", response_model=list[GlLegalEntityResponse])
async def gl_list_entities(ctl: GlCtrl):
    return await ctl.list_entities()


@router.get("/accounts", response_model=list[GlAccountResponse])
async def gl_list_accounts(ctl: GlCtrl):
    return await ctl.list_accounts()


@router.post("/accounts", response_model=GlAccountResponse)
async def gl_create_account(body: GlAccountCreateRequest, ctl: GlCtrl):
    return await ctl.create_account(body)


@router.patch("/accounts/{account_id}", response_model=GlAccountResponse)
async def gl_update_account(
    account_id: str, body: GlAccountUpdateRequest, ctl: GlCtrl
):
    return await ctl.update_account(account_id, body)


@router.get("/periods", response_model=list[GlAccountingPeriodResponse])
async def gl_list_periods(ctl: GlCtrl):
    return await ctl.list_periods()


@router.patch("/periods/{period_id}", response_model=GlAccountingPeriodResponse)
async def gl_update_period(
    period_id: str, body: GlAccountingPeriodUpdateRequest, ctl: GlCtrl
):
    return await ctl.update_period(period_id, body)


@router.get("/dimensions", response_model=list[GlDimensionResponse])
async def gl_list_dimensions(ctl: GlCtrl):
    return await ctl.list_dimensions()


@router.get("/journal-entries", response_model=list[GlJournalEntryResponse])
async def gl_list_journal_entries(
    ctl: GlCtrl,
    legal_entity_id: str | None = Query(None),
    consolidated: bool = Query(False),
    account_id: str | None = Query(None),
    status: str | None = Query(None),
    posting_period_id: str | None = Query(None),
    source_batch_id: str | None = Query(None),
):
    return await ctl.list_journal_entries(
        legal_entity_id=legal_entity_id,
        consolidated=consolidated,
        account_id=account_id,
        status=status,
        posting_period_id=posting_period_id,
        source_batch_id=source_batch_id,
    )


@router.get("/journal-entries/{entry_id}", response_model=GlJournalEntryResponse)
async def gl_get_journal_entry(entry_id: str, ctl: GlCtrl):
    return await ctl.get_journal_entry(entry_id)


@router.post("/journal-entries", response_model=GlJournalEntryResponse)
async def gl_create_journal_entry(body: GlJournalEntryCreateRequest, ctl: GlCtrl):
    return await ctl.create_journal_entry(body)


@router.patch("/journal-entries/{entry_id}", response_model=GlJournalEntryResponse)
async def gl_update_journal_entry(
    entry_id: str, body: GlJournalEntryUpdateRequest, ctl: GlCtrl
):
    return await ctl.update_journal_entry(entry_id, body)


@router.post("/journal-entries/{entry_id}/post", response_model=GlJournalEntryResponse)
async def gl_post_journal_entry(entry_id: str, ctl: GlCtrl):
    return await ctl.post_journal_entry(entry_id)


@router.post("/journal-entries/{entry_id}/reverse", response_model=GlJournalEntryResponse)
async def gl_reverse_journal_entry(
    entry_id: str,
    ctl: GlCtrl,
    body: GlJournalEntryReverseRequest | None = Body(default=None),
):
    return await ctl.reverse_journal_entry(entry_id, body)


@router.get(
    "/journal-entries/{entry_id}/audit",
    response_model=list[GlAuditEventResponse],
)
async def gl_journal_audit(entry_id: str, ctl: GlCtrl):
    return await ctl.list_journal_audit(entry_id)


@router.get("/billing-batches", response_model=list[GlBillingBatchResponse])
async def gl_list_billing_batches(ctl: GlCtrl):
    return await ctl.list_billing_batches()


@router.get("/revenue-schedules", response_model=list[GlRevenueScheduleResponse])
async def gl_revenue_schedules(
    ctl: GlCtrl,
    legal_entity_id: str | None = Query(None),
    consolidated: bool = Query(False),
):
    return await ctl.list_revenue_schedules(
        legal_entity_id=legal_entity_id,
        consolidated=consolidated,
    )


@router.get("/trial-balance", response_model=list[GlTrialBalanceRowResponse])
async def gl_trial_balance(
    ctl: GlCtrl,
    legal_entity_id: str | None = Query(None),
    consolidated: bool = Query(False),
    posting_period_id: str | None = Query(None),
):
    return await ctl.trial_balance(
        legal_entity_id=legal_entity_id,
        consolidated=consolidated,
        posting_period_id=posting_period_id,
    )


@router.get("/fx-quote", response_model=GlFxQuoteResponse)
async def gl_fx_quote(
    ctl: GlCtrl,
    from_currency: str = Query(..., min_length=3, max_length=3),
    to_currency: str = Query(..., min_length=3, max_length=3),
):
    return ctl.fx_quote(from_currency, to_currency)


@router.get("/recurring-templates", response_model=list[GlRecurringTemplateResponse])
async def gl_list_recurring_templates(
    ctl: GlCtrl,
    legal_entity_id: str | None = Query(None),
    consolidated: bool = Query(False),
):
    return await ctl.list_recurring_templates(
        legal_entity_id=legal_entity_id,
        consolidated=consolidated,
    )


@router.post("/recurring-templates", response_model=GlRecurringTemplateResponse)
async def gl_create_recurring_template(
    body: GlRecurringTemplateCreateRequest, ctl: GlCtrl
):
    return await ctl.create_recurring_template(body)


@router.patch(
    "/recurring-templates/{template_id}",
    response_model=GlRecurringTemplateResponse,
)
async def gl_update_recurring_template(
    template_id: str, body: GlRecurringTemplateUpdateRequest, ctl: GlCtrl
):
    return await ctl.update_recurring_template(template_id, body)
