from __future__ import annotations
from typing import Any


class SaltEdgeError(Exception):
    """Base error for Salt Edge client."""


class NetworkError(SaltEdgeError):
    """Network/transport-level error."""


class ApiError(SaltEdgeError):
    """Represents an API response with an error status."""

    def __init__(
        self, status_code: int, message: str, details: Any | None = None
    ) -> None:
        super().__init__(f"{status_code}: {message}")
        self.status_code = status_code
        self.message = message
        self.details = details
