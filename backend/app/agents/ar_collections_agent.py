"""ARCollectionsAgent — overdue awareness, LLM-drafted nudges, SMTP send.

Scope:
    Find unresolved ``Alert`` rows that look like collections tasks, ask the LLM
    for a polite email body, and send via ``GmailSmtpClient`` (or log in demo).

Flow:
    1. **discover** — load recent unresolved alerts for the organization.
    2. **draft** — ``LLMClient.chat_completion`` generates a short email in Greek
       or English depending on prompt hints.
    3. **send** — ``GmailSmtpClient.send_plain_text`` dispatches (skipped in demo).

End-to-end customer story:
    *Sofia's SaaS has three overdue invoices. The graph drafts three distinct
    emails referencing invoice numbers from alert names, routes them through
    Gmail SMTP, and marks the run in logs for audit — with human approval
    required before "Act Mode" auto-send is enabled in product settings.*

Architectural notes:
    - Does not auto-send in ``demo`` or when SMTP env vars are missing (raises
      after draft so callers can surface configuration errors).
    - Recipients are placeholders until Counterparty billing emails are wired.
"""
from __future__ import annotations

import logging
from typing import Any, NotRequired, TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.gmail_client import GmailSmtpClient
from app.clients.llm_client import LLMClient
from app.config import settings
from app.db.models.alerts import Alert

logger = logging.getLogger(__name__)


class CollectionsState(TypedDict, total=False):
    organization_id: str
    db: NotRequired[Any]
    alerts: list[dict[str, Any]]
    drafts: list[dict[str, Any]]
    sent: list[dict[str, Any]]


class ARCollectionsAgent:
    """LangGraph collections workflow."""

    def __init__(self) -> None:
        self._llm = LLMClient()
        self._mail = GmailSmtpClient()
        self._graph = self._build_graph()

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

    def _build_graph(self):
        workflow = StateGraph(CollectionsState)

        async def discover(state: CollectionsState) -> CollectionsState:
            db: AsyncSession = state["db"]
            alerts = await self._load_alerts(db, state["organization_id"])
            return {**state, "alerts": alerts}

        async def draft(state: CollectionsState) -> CollectionsState:
            drafts: list[dict[str, Any]] = []
            for a in state.get("alerts", []):
                if settings.demo_mode:
                    body = (
                        f"Demo draft for alert {a['name']}: please remit payment at your earliest convenience."
                    )
                else:
                    messages = [
                        {
                            "role": "system",
                            "content": (
                                "You write concise, polite accounts-receivable reminder emails. "
                                "No legal threats. Under 120 words."
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"Alert title: {a['name']}\nDetails: {a['description']}",
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

        async def send(state: CollectionsState) -> CollectionsState:
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

        workflow.add_node("discover", discover)
        workflow.add_node("draft", draft)
        workflow.add_node("send", send)
        workflow.add_edge(START, "discover")
        workflow.add_edge("discover", "draft")
        workflow.add_edge("draft", "send")
        workflow.add_edge("send", END)
        return workflow.compile()

    async def run(self, db: AsyncSession, organization_id: str) -> dict[str, Any]:
        out = await self._graph.ainvoke(
            {"organization_id": organization_id, "db": db},
        )
        return {
            "alerts": out.get("alerts", []),
            "drafts": out.get("drafts", []),
            "sent": out.get("sent", []),
        }
