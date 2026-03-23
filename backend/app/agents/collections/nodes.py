"""Collections graph nodes."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.gmail_client import GmailSmtpClient
from app.clients.llm_client import LLMClient
from app.config import settings
from app.db.models.alerts import Alert

from app.agents.collections.prompts import DRAFT_SYSTEM_MESSAGE, draft_user_message
from app.agents.collections.state import CollectionsState

logger = logging.getLogger(__name__)


class CollectionsNodes:
    def __init__(self) -> None:
        self._llm = LLMClient()
        self._mail = GmailSmtpClient()

    async def _load_alerts(
        self,
        db: AsyncSession,
        organization_id: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        stmt = (
            select(Alert)
            .where(
                Alert.organization_id == organization_id,
                Alert.resolved_at.is_(None),
            )
            .order_by(Alert.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "type": a.type,
            }
            for a in rows
        ]

    async def discover(self, state: CollectionsState) -> CollectionsState:
        db: AsyncSession = state["db"]
        alerts = await self._load_alerts(db, state["organization_id"])
        return {**state, "alerts": alerts}

    async def draft(self, state: CollectionsState) -> CollectionsState:
        drafts: list[dict[str, Any]] = []
        for a in state.get("alerts", []):
            if settings.demo_mode:
                body = (
                    f"Demo draft for alert {a['name']}: please remit payment at your earliest convenience."
                )
            else:
                messages = [
                    {"role": "system", "content": DRAFT_SYSTEM_MESSAGE},
                    {
                        "role": "user",
                        "content": draft_user_message(
                            a["name"],
                            a["description"],
                        ),
                    },
                ]
                body = await self._llm.chat_completion(messages)
            drafts.append(
                {
                    "alert_id": a["id"],
                    "subject": f"Re: {a['name']}",
                    "body": body,
                    "to_email": "collections@example.com",
                }
            )
        return {**state, "drafts": drafts}

    async def send(self, state: CollectionsState) -> CollectionsState:
        sent: list[dict[str, Any]] = []
        for d in state.get("drafts", []):
            try:
                await self._mail.send_plain_text(
                    to_email=d["to_email"],
                    subject=d["subject"],
                    body=d["body"],
                )
                sent.append({"alert_id": d["alert_id"], "status": "sent"})
            except Exception as e:
                logger.error("collections send failed: %s", e)
                sent.append(
                    {"alert_id": d["alert_id"], "status": "error", "detail": str(e)}
                )
        return {**state, "sent": sent}
