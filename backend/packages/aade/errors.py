from __future__ import annotations
from typing import Any


class AadeError(Exception):
    """Base error for AADE client."""


class NetworkError(AadeError):
    """Network/transport-level error."""


class ApiError(AadeError):
    """Represents an API response with an error status."""

    def __init__(
        self, status_code: int, message: str, details: Any | None = None
    ) -> None:
        super().__init__(f"{status_code}: {message}")
        self.status_code = status_code
        self.message = message
        self.details = details
