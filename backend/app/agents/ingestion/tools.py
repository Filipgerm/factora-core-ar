"""Reserved module for LangChain tools used by future ingestion nodes.

The graph today is materialize → extract (text/vision) → vector context → finalize;
no ``@tool`` loop yet. When adding tools (e.g. GEMI vendor lookup), define them here.
"""
