"""Document ingestion agent — public API is ``ingestion_graph`` only.

Turns email body text and/or base64 attachments (PDF → text, images → vision) into
structured ERP fields (amount, vendor, category, embedding, confidence). Services call
``ingestion_graph.ainvoke``; see ``IngestionService`` for the supported state keys.

Services must not import ``nodes``, ``state``, or ``graph`` wiring from outside
tests; invoke ``ingestion_graph.ainvoke(...)`` with the initial state dict.
"""

from app.agents.ingestion.graph import ingestion_graph

__all__ = ["ingestion_graph"]
