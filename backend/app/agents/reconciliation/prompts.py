"""Prompt templates for reconciliation (future LLM-assisted matching).

Phase 2 uses no chat prompts — matching is SQL + ``Decimal`` equality in ``nodes``.
When adding embedding or fuzzy match explanations, store system/user templates here
and import them from the new node modules only.
"""
