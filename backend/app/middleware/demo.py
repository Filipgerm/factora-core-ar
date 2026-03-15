"""Demo-mode response header middleware for Factora.

When ``ENVIRONMENT=demo``, adds ``X-Demo-Mode: true`` to every response so
the frontend can detect the mode and display an appropriate banner or
disable destructive UI actions (e.g. submitting real payments).

The header is intentionally added to all responses (including errors) so
clients always know which environment they are talking to.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings

DEMO_MODE_HEADER = "X-Demo-Mode"


class DemoModeMiddleware(BaseHTTPMiddleware):
    """Injects ``X-Demo-Mode: true`` when ``settings.demo_mode`` is active.

    The frontend reads this header and shows a visually distinct demo banner
    (similar to Stripe's test-mode banner) to differentiate demo from live data.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process the request and annotate the response if in demo mode.

        Args:
            request: The incoming Starlette request.
            call_next: The next middleware or route handler.

        Returns:
            The response, possibly with ``X-Demo-Mode: true`` added.
        """
        response: Response = await call_next(request)
        if settings.demo_mode:
            response.headers[DEMO_MODE_HEADER] = "true"
        return response
