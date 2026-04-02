"""Placeholder task names for future bulk agent workloads (enqueue from services later).

**Scope:** Registers stable Celery task ids without running heavy graphs yet.
"""

from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="agents.reconciliation.batch_stub")
def reconciliation_batch_stub(organization_id: str) -> dict[str, str]:
    """Reserved for batch reconciliation / review queues."""
    return {"status": "not_implemented", "organization_id": organization_id}


@celery_app.task(name="agents.collections.digest_stub")
def collections_digest_stub(organization_id: str) -> dict[str, str]:
    """Reserved for scheduled collections digests."""
    return {"status": "not_implemented", "organization_id": organization_id}


@celery_app.task(name="agents.reporting.generate_stub")
def reporting_generate_stub(organization_id: str, report_key: str) -> dict[str, str]:
    """Reserved for long-running report generation."""
    return {
        "status": "not_implemented",
        "organization_id": organization_id,
        "report_key": report_key,
    }


@celery_app.task(name="embeddings.backfill_stub")
def embeddings_backfill_stub(organization_id: str) -> dict[str, str]:
    """Reserved for org-wide embedding backfills."""
    return {"status": "not_implemented", "organization_id": organization_id}
