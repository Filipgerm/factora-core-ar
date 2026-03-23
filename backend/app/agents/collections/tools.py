"""Reserved module for LangChain tools (e.g. CRM or invoice lookup before draft).

Phase 2 collections flow is alert → LLM draft → SMTP send with no tool loop.
Define future tools here to keep ``nodes.py`` free of ad-hoc tool definitions.
"""
