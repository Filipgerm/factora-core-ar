"""Pydantic response schemas for GEMI / companies API routes."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GemiCompanyHit(BaseModel):
    """Single company row from GEMI search, normalized for onboarding UIs."""

    company_name: str = ""
    afm: str = ""
    ar_gemi: str = ""
    legal_type: str = ""
    zip_code: str = ""
    municipality: str = ""
    city: str = ""
    street: str = ""
    street_number: str = ""
    phone: str = ""
    email: str = ""
    objective: str = ""
    status: str = ""
    gemi_office: str = ""


class GemiSearchResponse(BaseModel):
    """Envelope for ``GET /v1/companies/gemi/search``."""

    items: list[GemiCompanyHit] = Field(default_factory=list)
    query: str
    mode: Literal["afm", "gemi_number"]
    exact: bool = False
    warning: str | None = None


class GemiDocumentsFetchResponse(BaseModel):
    """Result of ``POST /v1/companies/gemi/{afm}/documents:fetch``."""

    company: str
    documents_uploaded: int
    message: str
