"""Reserved module for LangChain tools used by future ingestion nodes.

Phase 2 graph is extract + optional vector context only — no ``@tool`` bindings yet.
When adding tools (e.g. web lookup, calculator), define them here and import from
``nodes`` or subgraphs; do not embed tool schemas inline in ``nodes.py``.
"""
