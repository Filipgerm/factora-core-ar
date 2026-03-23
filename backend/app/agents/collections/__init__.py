"""AR collections agent — public API is ``collections_graph`` only.

Resolves unresolved ``Alert`` rows into drafted emails and SMTP sends (demo-safe).
Services pass ``organization_id`` and ``db`` on the initial ``ainvoke`` state.
"""

from app.agents.collections.graph import collections_graph

__all__ = ["collections_graph"]
