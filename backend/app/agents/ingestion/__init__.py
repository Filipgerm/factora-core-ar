"""Document ingestion agent — public API is ``ingestion_graph`` only.

Services must not import ``nodes``, ``state``, or ``graph`` wiring from outside
tests; invoke ``ingestion_graph.ainvoke(...)`` with the initial state dict.
"""

from app.agents.ingestion.graph import ingestion_graph

__all__ = ["ingestion_graph"]
