"""GmailSyncService — fetch messages, run ingestion agent, create GMAIL invoices.

**Scope:** Idempotent per ``gmail_message_id``; tenant-scoped; no agents import from here.

**Flow:**
    1. Load ``GmailMailboxConnection``; decrypt refresh; refresh access token.
    2. List new message ids (history or ``messages.list`` fallback).
    3. For each message with attachments (or body text), skip if processed.
    4. ``IngestionService.run_ingestion`` → ``InvoiceService.create`` with ``source=GMAIL``.
"""

from __future__ import annotations

import base64
import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.gmail_api_client import GmailApiClient
from app.core.exceptions import NotFoundError, ValidationError as AppValidationError
from app.core.security.field_encryption import decrypt_secret
from app.db.models.gmail import GmailMailboxConnection, GmailProcessedMessage
from app.models.gmail import GmailSyncMessageDetail
from app.models.invoices import (
    InvoiceCreateRequest,
    InvoiceSourceEnum,
    InvoiceStatusEnum,
)
from app.services.embeddings.vector_store import VectorStoreService
from app.services.ingestion_service import IngestionService
from app.services.invoice_service import InvoiceService

logger = logging.getLogger(__name__)

_ALLOWED_ATTACHMENT_MIMES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)


def _walk_parts(
    part: dict[str, Any],
    out_files: list[tuple[str, str, str]],
    text_chunks: list[str],
) -> None:
    """Collect attachment ids and inline text from a MIME part tree."""
    mime = (part.get("mimeType") or "").lower()
    body = part.get("body") or {}
    data_b64 = body.get("data")
    att_id = body.get("attachmentId")
    fname = ""
    headers = part.get("headers") or []
    if isinstance(headers, list):
        for h in headers:
            if (h.get("name") or "").lower() == "content-type":
                continue
            if (h.get("name") or "").lower() == "content-disposition":
                disp = h.get("value") or ""
                if "filename=" in disp.lower():
                    fname = disp.split("filename=", 1)[-1].strip().strip('"')
    if att_id and mime in _ALLOWED_ATTACHMENT_MIMES:
        out_files.append((fname or "attachment", mime, att_id))
    elif data_b64 and mime.startswith("text/plain"):
        try:
            raw = base64.urlsafe_b64decode(data_b64 + "===")
            text_chunks.append(raw.decode("utf-8", errors="replace"))
        except Exception:
            pass
    for sub in part.get("parts") or []:
        _walk_parts(sub, out_files, text_chunks)


def _subject_from_payload(payload: dict[str, Any]) -> str:
    """Return Subject header from a Gmail API message payload."""
    for h in payload.get("headers") or []:
        if (h.get("name") or "").lower() == "subject":
            return (h.get("value") or "").strip()
    return ""


def _parse_iso_date(value: str | None) -> date | None:
    """Parse YYYY-MM-DD from extraction or empty string."""
    if not value or not str(value).strip():
        return None
    raw = str(value).strip()[:10]
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def _date_from_gmail_internal(internal: str | int | None) -> date | None:
    """Gmail ``internalDate`` is Unix ms as string."""
    if internal is None:
        return None
    try:
        ms = int(internal)
        return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).date()
    except (ValueError, TypeError, OSError):
        return None


def _embedding_content_text(result: dict[str, Any]) -> str:
    """Mirror ingestion ``finalize`` embed_input for stored row text."""
    ext = result.get("extracted")
    if not isinstance(ext, dict):
        ext = {}
    parts = [
        str(ext.get("description") or ""),
        str(ext.get("vendor") or ""),
        str(ext.get("category") or ""),
        str(ext.get("summary") or ""),
    ]
    body = "\n".join(p for p in parts if p).strip()
    if body:
        return body[:8000]
    return (str(result.get("summary") or "") or "(gmail ingest)")[:8000]


class GmailSyncService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._gmail = GmailApiClient()

    async def _access_token(self, conn: GmailMailboxConnection) -> str:
        refresh = decrypt_secret(conn.encrypted_refresh_token)
        tokens = await self._gmail.refresh_access_token(refresh_token=refresh)
        access = tokens.get("access_token")
        if not access:
            raise AppValidationError(
                "Token refresh did not return access_token.",
                code="external.gmail_token",
                fields={},
            )
        return access

    async def _connection(
        self, organization_id: str, google_email: str | None
    ) -> GmailMailboxConnection:
        q = select(GmailMailboxConnection).where(
            GmailMailboxConnection.organization_id == organization_id
        )
        if google_email:
            q = q.where(GmailMailboxConnection.google_email == google_email)
        conn = await self._db.scalar(q.limit(1))
        if not conn:
            raise NotFoundError(
                "No Gmail mailbox connected for this organization.",
                code="gmail.not_connected",
            )
        return conn

    async def sync_mailbox(
        self,
        *,
        organization_id: str,
        google_email: str | None = None,
        max_messages: int = 15,
    ) -> dict[str, Any]:
        """Poll Gmail and ingest new messages (manual sync / dev)."""
        conn = await self._connection(organization_id, google_email)
        access = await self._access_token(conn)
        # Snapshot before commits: AsyncSession expires ORM rows on commit; reading
        # conn.google_email after the loop would lazy-load outside async greenlet.
        mailbox_email = conn.google_email

        message_ids: list[str] = []
        if conn.history_id:
            try:
                hist = await self._gmail.list_history(
                    access_token=access,
                    start_history_id=conn.history_id,
                )
                for h in hist.get("history") or []:
                    for added in h.get("messagesAdded") or []:
                        mid = (added.get("message") or {}).get("id")
                        if mid:
                            message_ids.append(mid)
                new_hid = hist.get("historyId")
                if new_hid:
                    conn.history_id = str(new_hid)
            except Exception as e:
                logger.warning("history list failed, falling back to messages.list: %s", e)

        if not message_ids:
            listed = await self._gmail.list_messages(
                access_token=access,
                q="has:attachment newer_than:14d",
                max_results=max_messages,
            )
            for m in listed.get("messages") or []:
                if m.get("id"):
                    message_ids.append(m["id"])

        ingested = 0
        skipped = 0
        errors: list[str] = []
        messages_out: list[GmailSyncMessageDetail] = []

        for mid in message_ids[:max_messages]:
            subject = ""
            exists = await self._db.scalar(
                select(GmailProcessedMessage.id).where(
                    GmailProcessedMessage.organization_id == organization_id,
                    GmailProcessedMessage.gmail_message_id == mid,
                )
            )
            if exists:
                skipped += 1
                messages_out.append(
                    GmailSyncMessageDetail(
                        gmail_message_id=mid,
                        subject="",
                        outcome="skipped_already_processed",
                    )
                )
                continue

            try:
                msg = await self._gmail.get_message(access_token=access, message_id=mid)
                payload = msg.get("payload") or {}
                subject = _subject_from_payload(payload) or ""
                text_chunks: list[str] = []
                files: list[tuple[str, str, str]] = []
                _walk_parts(payload, files, text_chunks)
                snippet = msg.get("snippet") or ""
                body_text = "\n".join(text_chunks).strip() or snippet

                attachment_b64: str | None = None
                attachment_mime: str | None = None
                if files:
                    _, mime, att_id = files[0]
                    att = await self._gmail.get_attachment(
                        access_token=access,
                        message_id=mid,
                        attachment_id=att_id,
                    )
                    raw_b64 = att.get("data") or ""
                    attachment_b64 = raw_b64.replace("-", "+").replace("_", "/")
                    attachment_mime = mime

                from_hdr = ""
                for h in payload.get("headers") or []:
                    if (h.get("name") or "").lower() == "from":
                        from_hdr = h.get("value") or ""
                        break

                ingestion = IngestionService(self._db, organization_id)
                result = await ingestion.run_ingestion(
                    raw_text=body_text,
                    attachment_base64=attachment_b64,
                    attachment_mime_type=attachment_mime,
                    email_subject=subject,
                    email_from=from_hdr,
                    include_vector_hints=True,
                    trigger="gmail_sync",
                )

                if result.get("error"):
                    err = str(result.get("error") or "ingestion error")
                    errors.append(f"{mid}: {err}")
                    messages_out.append(
                        GmailSyncMessageDetail(
                            gmail_message_id=mid,
                            subject=subject,
                            outcome="ingestion_failed",
                            error=err[:2000],
                        )
                    )
                    continue

                ext_vendor = (result.get("vendor") or "Unknown")[:255]
                amt = result.get("amount")
                try:
                    dec_amt = Decimal(str(amt)) if amt is not None else Decimal("0.01")
                except Exception:
                    dec_amt = Decimal("0.01")
                if dec_amt <= 0:
                    dec_amt = Decimal("0.01")

                currency = (result.get("currency") or "EUR").upper()[:3]
                if len(currency) != 3:
                    currency = "EUR"

                inv_status = (
                    InvoiceStatusEnum.PENDING_REVIEW
                    if result.get("requires_human_review")
                    else InvoiceStatusEnum.DRAFT
                )

                issue_d = _parse_iso_date(result.get("issue_date")) or _date_from_gmail_internal(
                    msg.get("internalDate")
                ) or date.today()
                due_d = _parse_iso_date(result.get("due_date"))

                conf_raw = result.get("confidence")
                try:
                    conf_f = float(conf_raw) if conf_raw is not None else None
                except (TypeError, ValueError):
                    conf_f = None
                summary_short = (result.get("summary") or "")[:500] or None

                inv_svc = InvoiceService(self._db, organization_id)
                try:
                    inv = await inv_svc.create(
                        InvoiceCreateRequest(
                            source=InvoiceSourceEnum.GMAIL,
                            external_id=mid,
                            counterparty_display_name=ext_vendor,
                            amount=dec_amt,
                            currency=currency,
                            issue_date=issue_d,
                            due_date=due_d,
                            status=inv_status,
                            confidence=conf_f,
                            requires_human_review=bool(result.get("requires_human_review")),
                        )
                    )
                except AppValidationError as ve:
                    if getattr(ve, "code", None) == "validation.duplicate_external_id":
                        skipped += 1
                        self._db.add(
                            GmailProcessedMessage(
                                id=str(uuid.uuid4()),
                                organization_id=organization_id,
                                gmail_message_id=mid,
                            )
                        )
                        await self._db.commit()
                        messages_out.append(
                            GmailSyncMessageDetail(
                                gmail_message_id=mid,
                                subject=subject,
                                outcome="skipped_duplicate_invoice",
                            )
                        )
                        continue
                    raise

                vec = result.get("embedding")
                if isinstance(vec, list) and vec:
                    vs = VectorStoreService(self._db, organization_id)
                    try:
                        # is_recurring comes from the agent: LLM text signal combined
                        # with the check_recurrence DB temporal-pattern node.
                        await vs.persist_precomputed_vector(
                            content_text=_embedding_content_text(result),
                            source="gmail_ingestion",
                            vector=vec,
                            embedding_metadata={
                                "gmail_message_id": mid,
                                "invoice_id": inv.id,
                                "source": "gmail",
                                "invoice_month": inv.issue_date.month,
                                "invoice_year": inv.issue_date.year,
                                "is_recurring": bool(result.get("is_recurring", False)),
                                "category": result.get("category") or "",
                            },
                            counterparty_id=inv.counterparty_id,
                        )
                    except Exception as embed_err:
                        logger.warning(
                            "gmail embedding persist skipped for %s: %s", mid, embed_err
                        )

                self._db.add(
                    GmailProcessedMessage(
                        id=str(uuid.uuid4()),
                        organization_id=organization_id,
                        gmail_message_id=mid,
                    )
                )
                conn.history_id = str(msg.get("historyId") or conn.history_id or "")
                await self._db.commit()
                ingested += 1
                messages_out.append(
                    GmailSyncMessageDetail(
                        gmail_message_id=mid,
                        subject=subject,
                        outcome="ingested",
                        invoice_id=inv.id,
                        confidence=conf_f,
                        requires_human_review=bool(result.get("requires_human_review")),
                        extraction_summary=summary_short,
                        vendor=ext_vendor,
                    )
                )
            except Exception as e:
                await self._db.rollback()
                logger.exception("gmail ingest failed for %s", mid)
                err_s = str(e)
                errors.append(f"{mid}: {err_s}")
                messages_out.append(
                    GmailSyncMessageDetail(
                        gmail_message_id=mid,
                        subject="",
                        outcome="error",
                        error=err_s[:2000],
                    )
                )

        logger.info(
            "gmail sync complete: mailbox=%s ingested=%d skipped=%d errors=%d",
            mailbox_email,
            ingested,
            skipped,
            len(errors),
        )
        return {
            "ingested": ingested,
            "skipped": skipped,
            "errors": errors,
            "mailbox": mailbox_email,
            "messages": messages_out,
        }

    async def sync_for_email_address(
        self,
        *,
        email_address: str,
        history_id: str | None = None,
    ) -> dict[str, Any]:
        """Resolve org by connected ``google_email`` and run sync (Pub/Sub path)."""
        conn = await self._db.scalar(
            select(GmailMailboxConnection).where(
                GmailMailboxConnection.google_email == email_address.strip().lower()
            )
        )
        if not conn:
            logger.warning("Pub/Sub for unknown mailbox: %s", email_address)
            return {
                "ingested": 0,
                "skipped": 0,
                "errors": ["unknown_mailbox"],
                "mailbox": email_address,
                "messages": [],
            }

        if history_id:
            conn.history_id = history_id
            await self._db.commit()

        return await self.sync_mailbox(
            organization_id=conn.organization_id,
            google_email=conn.google_email,
            max_messages=25,
        )
