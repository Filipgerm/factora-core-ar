"""Remove every row from ``users`` (dependent rows cascade via FK).

Child tables such as ``user_sessions``, ``user_organization_memberships``, and
``gmail_mailbox_connections`` use ``ON DELETE CASCADE``. ``gl_audit_events.actor_user_id``
is set to NULL.

**Dangerous.** Use only on disposable or local databases.

Run from ``backend``::

    CONFIRM_WIPE_ALL_USERS=1 uv run python scripts/wipe_all_users.py
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wipe_all_users")


async def _run() -> None:
    if os.environ.get("CONFIRM_WIPE_ALL_USERS") != "1":
        raise SystemExit(
            "Refusing to run: set CONFIRM_WIPE_ALL_USERS=1 to delete all users."
        )

    from sqlalchemy import delete

    from app.db.models.identity import User
    from app.db.postgres import AsyncSessionLocal

    if AsyncSessionLocal is None:
        raise SystemExit("Database not configured (AsyncSessionLocal is None).")

    async with AsyncSessionLocal() as session:
        async with session.begin():
            result = await session.execute(delete(User))
            n = result.rowcount
        logger.info("Deleted %s user row(s).", n)


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
