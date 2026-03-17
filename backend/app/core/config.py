"""Core configuration re-export.

The canonical Settings class lives at ``app.config``.  This module re-exports
it from ``app.core`` so new code can use the domain-standard import path::

    from app.core.config import settings

Without breaking existing ``from app.config import settings`` imports.
"""
from app.config import Settings, settings  # noqa: F401

__all__ = ["Settings", "settings"]
