"""Typed state for the AR collections LangGraph."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class CollectionsState(TypedDict, total=False):
    organization_id: str
    db: NotRequired[Any]
    alerts: list[dict[str, Any]]
    drafts: list[dict[str, Any]]
    sent: list[dict[str, Any]]
