from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional, Iterator, Dict, Any, Union
from packages.aade.models.docs import DocsQuery, RequestedDocsResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db_session
from packages.aade.models.my_book_info import (
    BookInfoQuery,
    RequestMyIncomeResponse,
    RequestMyExpensesResponse,
)
from packages.aade.models.vat_info import (
    RequestVatInfoQuery,
    RequestVatInfoResponse,
)
from packages.aade.models.e3_info import (
    RequestE3InfoQuery,
    RequestE3InfoResponse,
)
from app.config import Settings as AppSettings
from packages.aade import AadeClient, API as MyDataAPI
from app.services.mydata_service import MyDataService
from app.controllers.mydata_controller import MyDataController


router = APIRouter()


# -----------------------------
# Dependency Injection
# -----------------------------
def get_aade_client(settings: AppSettings) -> AadeClient:
    """Get configured AADE HTTP client."""
    return AadeClient(settings)


def get_mydata_controller() -> MyDataController:
    app_settings = AppSettings()
    service = MyDataService(app_settings)
    return MyDataController(service)


# -----------------------------
# Document Routes
# -----------------------------
@router.get(
    "/mydata/docs",
    summary="Get documents from myDATA API",
    description="Retrieve documents from the myDATA system with optional filtering. "
    "Supports pagination for large result sets. Optionally save to database.",
)
async def get_docs(
    q: DocsQuery = Depends(),
    save: bool = Query(
        False,
        description="If true, save documents to database (requires buyer_id)",
    ),
    buyer_id: str = Query(
        "",
        description="Buyer ID for saving documents (required if save=true)",
    ),
    transmitted: bool = Query(
        False,
        description="If true, fetch invoices transmitted by this AADE user (RequestTransmittedDocs). "
        "If false, fetch invoices issued to this AADE user (RequestDocs).",
    ),
    ctl: MyDataController = Depends(get_mydata_controller),
    db: AsyncSession = Depends(get_db_session),
) -> Union[RequestedDocsResponse, Dict[str, Any]]:
    """
    Get documents from myDATA API.

    - **q**: Document query parameters including date ranges, types, and status filters
    - **save**: If true, save documents to database
    - **buyer_id**: Buyer ID required when save=true
    - **ctl**: Injected myDATA controller with error handling
    - **db**: Database session

    Returns:
        RequestedDocsResponse: API response containing document data (if save=false)
        Dict: Save result with document_id and invoice_count (if save=true)

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    logger.info("🔍 get_docs called with query: %s, save: %s", q.model_dump(), save)

    if save:
        if not buyer_id:
            raise HTTPException(
                status_code=400,
                detail="buyer_id is required when save=true",
            )
        # Fetch and save documents
        result = await ctl.save_documents(
            query=q, buyer_id=buyer_id, db=db, transmitted=transmitted
        )
        return result
    else:
        # Just return the response without saving
        return await ctl.get_docs(q, transmitted=transmitted)


@router.get(
    "/mydata/docs/iterate",
    response_model=Union[List[RequestedDocsResponse], Dict[str, Any]],
    summary="Iterate over paginated documents",
    description="Get an iterator over all documents with server-side pagination. "
    "Returns documents in batches for efficient processing of large datasets.",
)
async def iterate_docs(
    q: DocsQuery = Depends(),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=1000,
        description="Maximum number of documents to return per request",
    ),
    save: bool = Query(
        False,
        description="If true, save documents to database (requires buyer_id)",
    ),
    buyer_id: str = Query(
        "",
        description="Buyer ID for saving documents (required if save=true)",
    ),
    transmitted: bool = Query(
        False,
        description="If true, fetch invoices transmitted by this AADE user (RequestTransmittedDocs). "
        "If false, fetch invoices issued to this AADE user (RequestDocs).",
    ),
    ctl: MyDataController = Depends(get_mydata_controller),
    db: AsyncSession = Depends(get_db_session),
) -> Union[List[RequestedDocsResponse], Dict[str, Any]]:
    """
    Iterate over paginated documents.

    - **q**: Document query parameters
    - **limit**: Maximum number of *batches/pages* to return (1–1000, optional)
    - **save**: If true, save documents to database (requires buyer_id)
    - **buyer_id**: Buyer ID required when save=true
    - **transmitted**: Switch between RequestDocs / RequestTransmittedDocs
    - **ctl**: Injected myDATA controller
    - **db**: Database session (used when save=true)

    Returns:
        - **List[RequestedDocsResponse]**: Paginated AADE responses (if save=false)
        - **Dict[str, Any]**: Save summary (if save=true)

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    logger.info(
        "🔍 iterate_docs called with query: %s, limit: %s, save: %s, transmitted: %s",
        q.model_dump(),
        limit,
        save,
        transmitted,
    )

    # Same semantics as /mydata/docs
    if save:
        if not buyer_id:
            raise HTTPException(
                status_code=400,
                detail="buyer_id is required when save=true",
            )

        result = await ctl.save_documents(
            query=q,
            buyer_id=buyer_id,
            db=db,
            transmitted=transmitted,
        )
        return result

    # Get an iterator over paginated AADE responses
    iterator = ctl.iterate_docs(q, transmitted=transmitted)
    # If a limit is provided, only collect up to that many pages
    if limit:
        pages: List[RequestedDocsResponse] = []
        async for item in iterator:
            pages.append(item)
            if len(pages) >= limit:
                break
        return pages

    else:
        # Collect all (be careful with large datasets!)
        return await ctl.collect_docs(q, transmitted=transmitted)


# -----------------------------
# Income/Expenses Routes
# -----------------------------
@router.get(
    "/mydata/income",
    response_model=RequestMyIncomeResponse,
    summary="Get income data from myDATA API",
    description="Retrieve income data from the myDATA system. "
    "Includes revenue, sales, and other income sources for tax reporting.",
)
async def get_my_income(
    q: BookInfoQuery = Depends(),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> RequestMyIncomeResponse:
    """
    Get income data from myDATA API.

    - **q**: Income query parameters including date ranges and filters
    - **ctl**: Injected myDATA controller

    Returns:
        RequestMyIncomeResponse: API response containing income data

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    return await ctl.get_my_income(q)


@router.get(
    "/mydata/income/iterate",
    response_model=List[RequestMyIncomeResponse],
    summary="Iterate over paginated income data",
    description="Get an iterator over income data with server-side pagination.",
)
async def iterate_my_income(
    q: BookInfoQuery = Depends(),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=1000,
        description="Maximum number of income records to return per request",
    ),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> List[RequestMyIncomeResponse]:
    """
    Iterate over paginated income data.

    - **q**: Income query parameters
    - **limit**: Maximum items to return (1-1000, optional)
    - **ctl**: Injected myDATA controller

    Returns:
        List[RequestMyIncomeResponse]: Paginated income data results

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    iterator = ctl.iterate_my_income(q)

    if limit:
        result = []
        async for item in iterator:
            result.append(item)
            if len(result) >= limit:
                break
        return result
    else:
        return await ctl.collect_my_income(q)


@router.get(
    "/mydata/expenses",
    response_model=RequestMyExpensesResponse,
    summary="Get expenses data from myDATA API",
    description="Retrieve expenses data from the myDATA system. "
    "Includes business expenses, deductions, and other tax-relevant costs.",
)
async def get_my_expenses(
    q: BookInfoQuery = Depends(),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> RequestMyExpensesResponse:
    """
    Get expenses data from myDATA API.

    - **q**: Expenses query parameters including date ranges and filters
    - **ctl**: Injected myDATA controller

    Returns:
        RequestMyExpensesResponse: API response containing expenses data

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    return await ctl.get_my_expenses(q)


@router.get(
    "/mydata/expenses/iterate",
    response_model=List[RequestMyExpensesResponse],
    summary="Iterate over paginated expenses data",
    description="Get an iterator over expenses data with server-side pagination.",
)
async def iterate_my_expenses(
    q: BookInfoQuery = Depends(),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=1000,
        description="Maximum number of expense records to return per request",
    ),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> List[RequestMyExpensesResponse]:
    """
    Iterate over paginated expenses data.

    - **q**: Expenses query parameters
    - **limit**: Maximum items to return (1-1000, optional)
    - **ctl**: Injected myDATA controller

    Returns:
        List[RequestMyExpensesResponse]: Paginated expenses data results

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    iterator = ctl.iterate_my_expenses(q)

    if limit:
        result = []
        async for item in iterator:
            result.append(item)
            if len(result) >= limit:
                break
        return result
    else:
        return await ctl.collect_my_expenses(q)


# -----------------------------
# VAT/E3 Routes
# -----------------------------
@router.get(
    "/mydata/vat-info",
    response_model=RequestVatInfoResponse,
    summary="Get VAT information from myDATA API",
    description="Retrieve VAT (Value Added Tax) information from the myDATA system. "
    "Includes VAT declarations, returns, and payment status.",
)
async def get_vat_info(
    q: RequestVatInfoQuery = Depends(),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> RequestVatInfoResponse:
    """
    Get VAT information from myDATA API.

    - **q**: VAT info query parameters including tax periods and declarations
    - **ctl**: Injected myDATA controller

    Returns:
        RequestVatInfoResponse: API response containing VAT data

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    return await ctl.get_vat_info(q)


@router.get(
    "/mydata/vat-info/iterate",
    response_model=List[RequestVatInfoResponse],
    summary="Iterate over paginated VAT information",
    description="Get an iterator over VAT information with server-side pagination.",
)
async def iterate_vat_info(
    q: RequestVatInfoQuery = Depends(),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=1000,
        description="Maximum number of VAT records to return per request",
    ),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> List[RequestVatInfoResponse]:
    """
    Iterate over paginated VAT information.

    - **q**: VAT info query parameters
    - **limit**: Maximum items to return (1-1000, optional)
    - **ctl**: Injected myDATA controller

    Returns:
        List[RequestVatInfoResponse]: Paginated VAT info results

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    iterator = ctl.iterate_vat_info(q)

    if limit:
        result = []
        async for item in iterator:
            result.append(item)
            if len(result) >= limit:
                break
        return result
    else:
        return await ctl.collect_vat_info(q)


@router.get(
    "/mydata/e3-info",
    response_model=RequestE3InfoResponse,
    summary="Get E3 information from myDATA API",
    description="Retrieve E3 (Annual Income Statement) information from the myDATA system. "
    "Required for annual tax declarations and financial reporting.",
)
async def get_e3_info(
    q: RequestE3InfoQuery = Depends(),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> RequestE3InfoResponse:
    """
    Get E3 information from myDATA API.

    - **q**: E3 info query parameters including tax years and periods
    - **ctl**: Injected myDATA controller

    Returns:
        RequestE3InfoResponse: API response containing E3 data

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    return await ctl.get_e3_info(q)


@router.get(
    "/mydata/e3-info/iterate",
    response_model=List[RequestE3InfoResponse],
    summary="Iterate over paginated E3 information",
    description="Get an iterator over E3 information with server-side pagination.",
)
async def iterate_e3_info(
    q: RequestE3InfoQuery = Depends(),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=1000,
        description="Maximum number of E3 records to return per request",
    ),
    ctl: MyDataController = Depends(get_mydata_controller),
) -> List[RequestE3InfoResponse]:
    """
    Iterate over paginated E3 information.

    - **q**: E3 info query parameters
    - **limit**: Maximum items to return (1-1000, optional)
    - **ctl**: Injected myDATA controller

    Returns:
        List[RequestE3InfoResponse]: Paginated E3 info results

    Raises:
        HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for server errors
    """
    iterator = ctl.iterate_e3_info(q)

    if limit:
        result = []
        async for item in iterator:
            result.append(item)
            if len(result) >= limit:
                break
        return result
    else:
        return await ctl.collect_e3_info(q)
