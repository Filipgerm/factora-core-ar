"""Compile the collections LangGraph and expose ``collections_graph``.

**Scope:** ``StateGraph`` wiring only — DB/LLM/mail side effects live in ``nodes``.

**Flow:**
    1. ``discover`` — load recent unresolved ``Alert`` rows for the organization.
    2. ``draft`` — per alert, LLM body (or demo string) plus subject / placeholder recipient.
    3. ``send`` — ``GmailSmtpClient.send_plain_text`` per draft (errors captured in ``sent``).

**Contract:** Import from ``app.agents.collections``; initial state needs ``organization_id``
and ``db``. Demo mode skips live LLM content and uses safe copy.
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.collections.nodes import CollectionsNodes
from app.agents.collections.state import CollectionsState

_nodes = CollectionsNodes()


def _build_collections_workflow():
    workflow = StateGraph(CollectionsState)
    n = _nodes

    workflow.add_node("discover", n.discover)
    workflow.add_node("draft", n.draft)
    workflow.add_node("send", n.send)
    workflow.add_edge(START, "discover")
    workflow.add_edge("discover", "draft")
    workflow.add_edge("draft", "send")
    workflow.add_edge("send", END)
    return workflow.compile()


collections_graph = _build_collections_workflow()
