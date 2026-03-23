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

from typing import Any

from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.collections.nodes import CollectionsNodes
from app.agents.collections.state import CollectionsState


class ARCollectionsAgent:
    """LangGraph collections workflow."""

    def __init__(self) -> None:
        self._nodes = CollectionsNodes()
        self._graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(CollectionsState)
        n = self._nodes

        workflow.add_node("discover", n.discover)
        workflow.add_node("draft", n.draft)
        workflow.add_node("send", n.send)
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
