"""GEMI/companies routes — company search and document fetch."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.dependencies import GemiCtrl
from app.models.gemi import GemiDocumentsFetchResponse, GemiSearchResponse

router = APIRouter()


@router.post(
    "/gemi/{afm}/documents:fetch",
    response_model=GemiDocumentsFetchResponse,
)
async def fetch_docs(
    afm: str,
    ctl: GemiCtrl,
) -> GemiDocumentsFetchResponse:
    """
    Trigger a fetch of official GEMI documents for a company and store them server-side.

    Purpose:
        Resolves the provided AFM to a GEMI number, retrieves the company's
        available decisions/documents from the GEMI Open Data API, downloads
        the files (e.g., PDFs), and uploads them to the application's storage
        (e.g., GridFS) for later use.

    Returns:
        A JSON object summarizing the operation (company label, number of documents uploaded,
        and a human-readable message). Exact shape is defined by the controller/service.
    """
    return await ctl.fetch_and_store_company_documents(afm)


@router.get("/gemi/search", response_model=GemiSearchResponse)
async def search_companies(
    ctl: GemiCtrl,
    q: Annotated[
        str,
        Query(
            min_length=3,
            description="Characters typed so far for the afm or gemi_number of the business",
        ),
    ],
    mode: Annotated[
        Literal["afm", "gemi_number"], Query(description="Search Mode")
    ] = "afm",
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> GemiSearchResponse:
    """
    Search for a company by AFM or by GEMI number for live onboarding lookups.

    Purpose:
        Supports the onboarding "find my business" flow. Given a numeric query and a mode,
        the backend queries the GEMI API and returns a compact, UI-friendly list of matches
        (typically 0–1 items for exact identifiers).

    Returns:
        A JSON envelope suitable for a live search UI, typically:
        {
          "items": [ { "company_name": "...", "afm": "...", "ar_gemi": "..." }, ... ],
          "query": "<digits used>",
          "mode": "<afm|gemi_number>",
          "exact": <bool>
        }
        Exact keys/flags are defined by the controller/service to keep the frontend stable.
    """
    return await ctl.gemi_search(q, mode, limit)
