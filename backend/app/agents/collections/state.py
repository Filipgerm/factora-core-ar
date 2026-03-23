"""Collections graph state — alerts through draft and send phases.

**Inputs:** ``organization_id``, ``db``.

**Outputs:** ``alerts`` (dict rows from ORM), ``drafts`` (subject/body/recipient per
alert), ``sent`` (delivery or error status per draft).
"""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class CollectionsState(TypedDict, total=False):
    organization_id: str
    db: NotRequired[Any]
    alerts: list[dict[str, Any]]
    drafts: list[dict[str, Any]]
    sent: list[dict[str, Any]]
