"""Backfill existing ``aade_invoices`` rows into the unified ``invoices`` table.

The AADE→unified dual-write (``AadeInvoiceBridgeService``) only applies from
the moment it ships forward. Historical AADE rows inserted before the bridge
existed remain invisible to AR dashboards, collections, and revrec schedules
until this script runs.

**Idempotent:** Re-runnable. The bridge keys every unified row on
``(organization_id, source=AADE, external_id=<mark|uid>)`` and upserts
in-place, so multiple invocations converge on the same state.

**Usage (run from ``backend/``):**

    # Dry-run the whole system (no writes).
    uv run python scripts/backfill_aade_to_invoices.py --dry-run

    # Backfill a single tenant.
    uv run python scripts/backfill_aade_to_invoices.py \
        --organization-id 00000000-0000-0000-0000-000000000000

    # Limit to the first 500 rows (handy for smoke-testing).
    uv run python scripts/backfill_aade_to_invoices.py --limit 500 --dry-run

Exit code is ``0`` on success, non-zero on any batch failure (the script
rolls back the failed batch and continues with the next so one bad row does
not block the rest of the backfill).
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("backfill_aade_to_invoices")


async def _run(
    *,
    dry_run: bool,
    organization_id: str | None,
    limit: int | None,
    batch_size: int,
) -> int:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.db.models.aade import AadeInvoiceModel
    from app.db.postgres import AsyncSessionLocal
    from app.services.aade_invoice_bridge import AadeInvoiceBridgeService

    if AsyncSessionLocal is None:  # type: ignore[truthy-bool]
        raise SystemExit("Async database engine not initialized.")

    processed = 0
    bridged = 0
    failed = 0

    offset = 0
    while True:
        async with AsyncSessionLocal() as session:  # type: AsyncSession
            stmt = (
                select(AadeInvoiceModel)
                .order_by(AadeInvoiceModel.created_at.asc(), AadeInvoiceModel.id.asc())
                .offset(offset)
                .limit(batch_size)
            )
            if organization_id:
                stmt = stmt.where(AadeInvoiceModel.organization_id == organization_id)

            rows = (await session.execute(stmt)).scalars().all()
            if not rows:
                break

            bridge = AadeInvoiceBridgeService(session)
            for aade_row in rows:
                try:
                    result = await bridge.upsert_from_aade_invoice(aade_row)
                    if result is not None:
                        bridged += 1
                    processed += 1
                    if limit is not None and processed >= limit:
                        break
                except Exception:
                    failed += 1
                    logger.exception(
                        "Backfill failed for aade_invoice=%s (mark=%s)",
                        aade_row.id,
                        aade_row.mark,
                    )

            if dry_run:
                await session.rollback()
            else:
                try:
                    await session.commit()
                except Exception:
                    failed += len(rows)
                    await session.rollback()
                    logger.exception("Batch commit failed (offset=%d); rolled back.", offset)

        offset += batch_size
        if limit is not None and processed >= limit:
            break

    logger.info(
        "Backfill done: processed=%d bridged=%d failed=%d (dry_run=%s, org=%s)",
        processed,
        bridged,
        failed,
        dry_run,
        organization_id or "ALL",
    )
    return 0 if failed == 0 else 1


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill aade_invoices into unified invoices."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run bridge upserts but rollback every batch (no writes).",
    )
    parser.add_argument(
        "--organization-id",
        default=None,
        help="Restrict backfill to a single tenant UUID.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Stop after processing N AADE rows (smoke-test aid).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows fetched / committed per transaction (default 500).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    return asyncio.run(
        _run(
            dry_run=args.dry_run,
            organization_id=args.organization_id,
            limit=args.limit,
            batch_size=max(1, args.batch_size),
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
