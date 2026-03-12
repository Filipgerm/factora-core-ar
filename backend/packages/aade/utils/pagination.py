from __future__ import annotations
from typing import Callable, Dict, Iterator, Any, Optional


def paginate(
    fetch_page: Callable[[Dict[str, Any]], Dict[str, Any]],
    initial_params: Optional[Dict[str, Any]] = None,
) -> Iterator[Dict[str, Any]]:
    """Generic iterator over AADE paginated endpoints using continuation tokens.

    `fetch_page` should accept params and return a dict with continuationToken.
    Yields each page's full dict so callers can map to models.
    """
    params = dict(initial_params or {})
    while True:
        page = fetch_page(params)
        yield page
        continuation = (page or {}).get("continuationToken") or {}
        next_partition = continuation.get("nextPartitionKey")
        next_row = continuation.get("nextRowKey")
        if next_partition and next_row:
            params["nextPartitionKey"] = next_partition
            params["nextRowKey"] = next_row
        else:
            break
