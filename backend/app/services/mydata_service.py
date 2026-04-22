from __future__ import annotations
from typing import Iterator, List, Optional, TypeVar, Callable, Dict, Any
import logging

from packages.aade.http import AadeClient
from packages.aade.aade_api import API as MyDataAPI
from app.config import Settings
from app.core.exceptions import ValidationError
from packages.aade.models.docs import DocsQuery, RequestedDocsResponse
from packages.aade.models.my_book_info import (
    BookInfoQuery,
    RequestMyIncomeResponse,
    RequestMyExpensesResponse,
)
from packages.aade.models.vat_info import (
    RequestVatInfoQuery,
    RequestVatInfoResponse,
)
from packages.aade.models.e3_info import (
    RequestE3InfoQuery,
    RequestE3InfoResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.aade import AadeDocumentModel, AadeInvoiceModel, InvoiceDirection
from app.services.aade_invoice_bridge import AadeInvoiceBridgeService
from datetime import date
from decimal import Decimal

T = TypeVar("T")

logger = logging.getLogger(__name__)
from fastapi.encoders import jsonable_encoder


class MyDataService:
    """
    Orchestrates myDATA ERP GET calls across endpoints with a consistent interface.
    """

    def __init__(
        self,
        db: AsyncSession,
        organization_id: Optional[str],
        app_settings: Settings,
    ) -> None:
        self.db = db
        self.organization_id = organization_id
        self.client: AadeClient = AadeClient(app_settings)
        self.api = MyDataAPI(self.client)
        self.app_settings = app_settings

    # -----------------------------
    # Helpers
    # -----------------------------
    @staticmethod
    def _collect(
        iterator: Iterator[T],
        *,
        max_pages: Optional[int] = None,
        max_items: Optional[int] = None,
    ) -> List[T]:
        out: List[T] = []
        pages = 0
        for item in iterator:
            out.append(item)
            pages += 1
            if max_items is not None and len(out) >= max_items:
                break
            if max_pages is not None and pages >= max_pages:
                break
        return out

    # -----------------------------
    # RequestDocs / RequestTransmittedDocs
    # -----------------------------
    async def get_docs(
        self, q: DocsQuery, transmitted: bool = False
    ) -> RequestedDocsResponse:
        if transmitted:
            return self.api.docs.request_transmitted_docs(q)
        else:
            return self.api.docs.request_docs(q)

    async def iter_docs(
        self, q: DocsQuery, transmitted: bool = False
    ) -> Iterator[RequestedDocsResponse]:
        if transmitted:
            return self.api.docs.iterate_transmitted_docs(q)
        else:
            return self.api.docs.iterate_docs(q)

    async def collect_docs(
        self, q: DocsQuery, *, max_pages: Optional[int] = None
    ) -> List[RequestedDocsResponse]:
        iterator = await self.iter_docs(q)
        return self._collect(iterator, max_pages=max_pages)

    # -----------------------------
    # MyIncome / MyExpenses
    # -----------------------------
    async def get_my_income(self, q: BookInfoQuery) -> RequestMyIncomeResponse:
        return self.api.income_expenses.request_my_income(q)

    async def iter_my_income(
        self, q: BookInfoQuery
    ) -> Iterator[RequestMyIncomeResponse]:
        return self.api.income_expenses.iterate_my_income(q)

    async def collect_my_income(
        self, q: BookInfoQuery, *, max_pages: Optional[int] = None
    ) -> List[RequestMyIncomeResponse]:
        iterator = await self.iter_my_income(q)
        return self._collect(iterator, max_pages=max_pages)

    async def get_my_expenses(self, q: BookInfoQuery) -> RequestMyExpensesResponse:
        return self.api.income_expenses.request_my_expenses(q)

    async def iter_my_expenses(
        self, q: BookInfoQuery
    ) -> Iterator[RequestMyExpensesResponse]:
        return self.api.income_expenses.iterate_my_expenses(q)

    async def collect_my_expenses(
        self, q: BookInfoQuery, *, max_pages: Optional[int] = None
    ) -> List[RequestMyExpensesResponse]:
        iterator = await self.iter_my_expenses(q)
        return self._collect(iterator, max_pages=max_pages)

    # -----------------------------
    # VAT Info / E3 Info
    # -----------------------------
    async def get_vat_info(self, q: RequestVatInfoQuery) -> RequestVatInfoResponse:
        return self.api.vat_e3.request_vat_info(q)

    async def iter_vat_info(
        self, q: RequestVatInfoQuery
    ) -> Iterator[RequestVatInfoResponse]:
        return self.api.vat_e3.iterate_vat_info(q)

    async def collect_vat_info(
        self, q: RequestVatInfoQuery, *, max_pages: Optional[int] = None
    ) -> List[RequestVatInfoResponse]:
        iterator = await self.iter_vat_info(q)
        return self._collect(iterator, max_pages=max_pages)

    async def get_e3_info(self, q: RequestE3InfoQuery) -> RequestE3InfoResponse:  # type: ignore[override]
        return self.api.vat_e3.request_e3_info(q)  # type: ignore[call-arg]

    async def iter_e3_info(self, q: RequestE3InfoQuery) -> Iterator[RequestE3InfoResponse]:  # type: ignore[override]
        return self.api.vat_e3.iterate_e3_info(q)  # type: ignore[call-arg]

    async def collect_e3_info(
        self, q: RequestE3InfoQuery, *, max_pages: Optional[int] = None
    ) -> List[RequestE3InfoResponse]:
        iterator = await self.iter_e3_info(q)
        return self._collect(iterator, max_pages=max_pages)

    # -----------------------------
    # AADE Documents Persistence
    # -----------------------------
    async def save_documents(
        self,
        response: RequestedDocsResponse,
        query: DocsQuery,
        direction: InvoiceDirection,
        raw_xml: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Save AADE document response to database (raw + normalized)."""
        if not self.organization_id:
            raise ValidationError(
                "Organization setup required to save documents.",
                code="validation.org_required",
            )
        try:
            # Convert response to JSON dict
            raw_json = response.model_dump(mode="json")

            doc = AadeDocumentModel(
                organization_id=self.organization_id,
                raw_xml=raw_xml,
                raw_json=raw_json,
                query_params=query.model_dump(exclude_none=True, mode="json"),
                continuation_token=(
                    response.continuationToken.model_dump(mode="json")
                    if response.continuationToken
                    else None
                ),
            )
            self.db.add(doc)
            await self.db.flush()  # Get the document ID

            # Pre-normalize all invoices and collect candidate marks
            normalized_invoices: list[dict] = []
            candidate_marks: set[int] = set()

            for invoice in response.invoicesDoc:
                # Safely convert Pydantic model to dict
                if hasattr(invoice, "model_dump"):
                    invoice_dict = invoice.model_dump()
                elif hasattr(invoice, "__dict__"):
                    invoice_dict = dict(invoice)
                else:
                    invoice_dict = invoice

                normalized = self._normalize_invoice(invoice_dict)
                normalized_invoices.append(normalized)

                mark = normalized.get("mark")
                if mark is not None:
                    candidate_marks.add(mark)

            # Find which marks already exist in the DB
            # Note: We check globally (not filtered by direction) because AADE marks are globally unique.
            # The unique constraint on AadeInvoiceModel.mark enforces this at the database level.
            existing_marks: set[int] = set()
            if candidate_marks:
                result = await self.db.scalars(
                    select(AadeInvoiceModel.mark).where(
                        AadeInvoiceModel.mark.in_(candidate_marks)
                    )
                )
                existing_marks = set(result)

            # Insert only invoices with new marks
            invoice_ids = []
            inserted_aade_rows: list[AadeInvoiceModel] = []

            for normalized in normalized_invoices:
                mark = normalized.get("mark")
                # Skip invoices we've already stored (by mark)
                if mark is not None and mark in existing_marks:
                    continue

                # Make normalized_data JSON-safe (convert Decimal, datetime, etc.)
                normalized_json = jsonable_encoder(normalized)

                invoice_model = AadeInvoiceModel(
                    organization_id=self.organization_id,
                    document_id=doc.id,
                    direction=direction,
                    uid=normalized.get("uid"),
                    mark=normalized.get("mark"),
                    authentication_code=normalized.get("authentication_code"),
                    issuer_vat=normalized.get("issuer_vat"),
                    issuer_country=normalized.get("issuer_country"),
                    issuer_branch=normalized.get("issuer_branch"),
                    counterpart_vat=normalized.get("counterpart_vat"),
                    counterpart_country=normalized.get("counterpart_country"),
                    counterpart_branch=normalized.get("counterpart_branch"),
                    series=normalized.get("series"),
                    aa=normalized.get("aa"),
                    issue_date=normalized.get("issue_date"),
                    invoice_type=normalized.get("invoice_type"),
                    currency=normalized.get("currency"),
                    total_net_value=normalized.get("total_net_value"),
                    total_vat_amount=normalized.get("total_vat_amount"),
                    total_gross_value=normalized.get("total_gross_value"),
                    normalized_data=normalized_json,
                )
                self.db.add(invoice_model)
                invoice_ids.append(invoice_model.id)
                inserted_aade_rows.append(invoice_model)

            # Flush so bridge-side ``SELECT``s see the AADE rows and so
            # the unified ``Invoice`` can reference them in the same txn.
            if inserted_aade_rows:
                await self.db.flush()
                bridge = AadeInvoiceBridgeService(self.db)
                for aade_row in inserted_aade_rows:
                    try:
                        await bridge.upsert_from_aade_invoice(aade_row)
                    except Exception:
                        # Dual-write is best-effort — never block AADE
                        # ingestion when the unified mirror errors. The
                        # backfill job will reconcile any gaps.
                        logger.exception(
                            "AADE→unified bridge failed for aade_invoice=%s "
                            "(mark=%s); continuing ingest.",
                            aade_row.id,
                            aade_row.mark,
                        )

            await self.db.commit()

            logger.info(
                f"✅ Saved AADE document {doc.id} with {len(invoice_ids)} invoices for organization {self.organization_id}"
            )

            return {
                "document_id": doc.id,
                "invoice_count": len(invoice_ids),
                "invoice_ids": invoice_ids,
            }
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Failed to save AADE documents: {e}", exc_info=True)
            raise

    def _normalize_invoice(self, invoice_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize key fields from invoice dict for database storage.

        Args:
            invoice_dict: Invoice data from AADE response (dict or Pydantic model dict)

        Returns:
            Normalized dict with extracted fields
        """
        normalized: Dict[str, Any] = {}

        # Basic identifiers
        normalized["uid"] = invoice_dict.get("uid")
        normalized["mark"] = invoice_dict.get("mark")
        normalized["authentication_code"] = invoice_dict.get("authenticationCode")

        # Issuer information
        issuer = invoice_dict.get("issuer")
        if issuer:
            if isinstance(issuer, dict):
                normalized["issuer_vat"] = issuer.get("vatNumber")
                normalized["issuer_country"] = issuer.get("country")
                normalized["issuer_branch"] = issuer.get("branch")
            else:
                # If it's a Pydantic model, use model_dump
                issuer_dict = (
                    issuer.model_dump() if hasattr(issuer, "model_dump") else {}
                )
                normalized["issuer_vat"] = issuer_dict.get("vatNumber")
                normalized["issuer_country"] = issuer_dict.get("country")
                normalized["issuer_branch"] = issuer_dict.get("branch")

        # Counterpart information
        counterpart = invoice_dict.get("counterpart")
        if counterpart:
            if isinstance(counterpart, dict):
                normalized["counterpart_vat"] = counterpart.get("vatNumber")
                normalized["counterpart_country"] = counterpart.get("country")
                normalized["counterpart_branch"] = counterpart.get("branch")
            else:
                counterpart_dict = (
                    counterpart.model_dump()
                    if hasattr(counterpart, "model_dump")
                    else {}
                )
                normalized["counterpart_vat"] = counterpart_dict.get("vatNumber")
                normalized["counterpart_country"] = counterpart_dict.get("country")
                normalized["counterpart_branch"] = counterpart_dict.get("branch")

        # Invoice header
        invoice_header = invoice_dict.get("invoiceHeader")
        if invoice_header:
            if isinstance(invoice_header, dict):
                normalized["series"] = invoice_header.get("series")
                normalized["aa"] = invoice_header.get("aa")
                issue_date_str = invoice_header.get("issueDate")
                if issue_date_str:
                    try:
                        # Handle both date strings and date objects
                        if isinstance(issue_date_str, str):
                            normalized["issue_date"] = date.fromisoformat(
                                issue_date_str
                            )
                        elif isinstance(issue_date_str, date):
                            normalized["issue_date"] = issue_date_str
                    except (ValueError, AttributeError):
                        pass
                normalized["invoice_type"] = invoice_header.get("invoiceType")
                normalized["currency"] = invoice_header.get("currency")
            else:
                header_dict = (
                    invoice_header.model_dump()
                    if hasattr(invoice_header, "model_dump")
                    else {}
                )
                normalized["series"] = header_dict.get("series")
                normalized["aa"] = header_dict.get("aa")
                issue_date_str = header_dict.get("issueDate")
                if issue_date_str:
                    try:
                        if isinstance(issue_date_str, str):
                            normalized["issue_date"] = date.fromisoformat(
                                issue_date_str
                            )
                        elif isinstance(issue_date_str, date):
                            normalized["issue_date"] = issue_date_str
                    except (ValueError, AttributeError):
                        pass
                normalized["invoice_type"] = header_dict.get("invoiceType")
                normalized["currency"] = header_dict.get("currency")

        # Invoice summary (totals)
        invoice_summary = invoice_dict.get("invoiceSummary")
        if invoice_summary:
            if isinstance(invoice_summary, dict):
                normalized["total_net_value"] = self._to_decimal(
                    invoice_summary.get("totalNetValue")
                )
                normalized["total_vat_amount"] = self._to_decimal(
                    invoice_summary.get("totalVatAmount")
                )
                normalized["total_gross_value"] = self._to_decimal(
                    invoice_summary.get("totalGrossValue")
                )
            else:
                summary_dict = (
                    invoice_summary.model_dump()
                    if hasattr(invoice_summary, "model_dump")
                    else {}
                )
                normalized["total_net_value"] = self._to_decimal(
                    summary_dict.get("totalNetValue")
                )
                normalized["total_vat_amount"] = self._to_decimal(
                    summary_dict.get("totalVatAmount")
                )
                normalized["total_gross_value"] = self._to_decimal(
                    summary_dict.get("totalGrossValue")
                )

        # Store full normalized data
        normalized["full_data"] = invoice_dict

        return normalized

    @staticmethod
    def _to_decimal(value: Any) -> Optional[Decimal]:
        """Convert value to Decimal, handling strings, floats, and Decimal types."""
        if value is None:
            return None
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(str(value))
        except (ValueError, TypeError):
            return None
