from __future__ import annotations
from typing import Callable, Dict, Iterator, Any, Optional


def paginate(
    fetch_page: Callable[[Dict[str, Any]], Dict[str, Any]],
    initial_params: Optional[Dict[str, Any]] = None,
) -> Iterator[Dict[str, Any]]:
    """Generic iterator over Salt Edge paginated endpoints using `next_id`/`next_page`.
    `fetch_page` should accept params and return a JSON dict with `data` and optional `meta`.
    Yields each page's full JSON (not individual items) so callers can map to models or items.
    """
    params = dict(initial_params or {})
    while True:
        page = fetch_page(params)
        yield page
        meta = (page or {}).get("meta") or {}
        next_id = meta.get("next_id")
        next_page = meta.get("next_page")
        if next_id:
            params["from_id"] = next_id
        elif next_page:
            params["page"] = next_page
        else:
            break
