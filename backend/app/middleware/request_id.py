"""Request-ID middleware for Factora.

Injects a unique ``X-Request-ID`` header into every request/response pair.
If the client supplies its own ``X-Request-ID`` the value is preserved (useful
for end-to-end tracing from the frontend).  Otherwise a new UUID4 is generated.

Usage in ``main.py``::

    from app.middleware.request_id import RequestIDMiddleware
    app.add_middleware(RequestIDMiddleware)

The request ID is accessible inside route handlers via::

    from starlette.requests import Request
    def my_route(request: Request):
        request_id = request.state.request_id
"""
from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Starlette middleware that ensures every request carries a unique ID.

    - Reads ``X-Request-ID`` from the incoming request headers if present.
    - Generates a new UUID4 hex string if the header is absent.
    - Attaches the ID to ``request.state.request_id`` for downstream access.
    - Echoes the ID back in the response headers so clients can correlate logs.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process the request, injecting X-Request-ID.

        Args:
            request: The incoming Starlette request.
            call_next: The next middleware or route handler in the chain.

        Returns:
            The response with ``X-Request-ID`` header set.
        """
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
