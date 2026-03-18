from __future__ import annotations
from typing import List, Optional, Iterator, Union, Dict, Any
from datetime import date
from fastapi import HTTPException
from packages.aade.models.docs import DocsQuery, RequestedDocsResponse
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
from packages.aade.errors import AadeError, NetworkError, ApiError
from app.services.mydata_service import MyDataService
from app.db.models.aade import InvoiceDirection
from sqlalchemy.ext.asyncio import AsyncSession


class MyDataController:
    """
    Controller for myDATA API endpoints.

    Orchestrates myDATA service calls with proper error handling and
    consistent interface following the application's controller pattern.
    """

    def __init__(self, mydata_service: MyDataService) -> None:
        self.mydata_service = mydata_service

    # -----------------------------
    # Error Handling Helper
    # -----------------------------
    async def _handle_aade_error(
        self, operation: str, error: Exception
    ) -> HTTPException:
        """
        Handle AADE-specific errors and return appropriate HTTP exceptions.

        Args:
            operation: Description of the operation for error messages
            error: The caught exception

        Returns:
            HTTPException: Appropriate HTTP exception based on error type
        """
        if isinstance(error, ApiError):
            return HTTPException(
                status_code=502,
                detail=f"myDATA API error during {operation}: {error.message}",
            )
        elif isinstance(error, NetworkError):
            return HTTPException(
                status_code=503,
                detail=f"Network error during {operation}: {str(error)}",
            )
        elif isinstance(error, AadeError):
            return HTTPException(
                status_code=400,
                detail=f"Invalid request during {operation}: {str(error)}",
            )
        else:
            return HTTPException(
                status_code=500,
                detail=f"Unexpected error during {operation}: {str(error)}",
            )

    # -----------------------------
    # Docs Operations
    # -----------------------------
    async def get_docs(
        self, query: DocsQuery, transmitted: bool = False
    ) -> RequestedDocsResponse:
        """
        Get documents from myDATA API.

        Args:
            query: Document query parameters
            transmitted: If true, fetch transmitted documents (RequestTransmittedDocs),
                        otherwise fetch received documents (RequestDocs)

        Returns:
            RequestedDocsResponse: API response with document data

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.get_docs(query, transmitted=transmitted)
        except ApiError as e:
            raise HTTPException(
                status_code=502, detail=f"myDATA API error: {e.message}"
            )
        except NetworkError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Network error connecting to myDATA API: {str(e)}",
            )
        except AadeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid request to myDATA API: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch documents: {str(e)}"
            )

    async def iterate_docs(
        self, query: DocsQuery, transmitted: bool = False
    ) -> Iterator[RequestedDocsResponse]:
        """
        Iterate over paginated documents.

        Args:
            query: Document query parameters
            transmitted: If true, fetch transmitted documents (RequestTransmittedDocs),
                        otherwise fetch received documents (RequestDocs)
        Returns:
            Iterator[RequestedDocsResponse]: Async iterator over document pages

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.iter_docs(query, transmitted=transmitted)
        except ApiError as e:
            raise HTTPException(
                status_code=502, detail=f"myDATA API error: {e.message}"
            )
        except NetworkError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Network error connecting to myDATA API: {str(e)}",
            )
        except AadeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid request to myDATA API: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to iterate documents: {str(e)}"
            )

    async def collect_docs(
        self, query: DocsQuery, max_pages: Optional[int] = None
    ) -> List[RequestedDocsResponse]:
        """
        Collect all documents (with optional pagination limits).

        Args:
            query: Document query parameters
            max_pages: Maximum number of pages to collect (None for all)

        Returns:
            List[RequestedDocsResponse]: All collected document responses

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.collect_docs(query, max_pages=max_pages)
        except ApiError as e:
            raise HTTPException(
                status_code=502, detail=f"myDATA API error: {e.message}"
            )
        except NetworkError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Network error connecting to myDATA API: {str(e)}",
            )
        except AadeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid request to myDATA API: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to collect documents: {str(e)}"
            )

    # -----------------------------
    # Income/Expenses Operations
    # -----------------------------
    async def get_my_income(self, query: BookInfoQuery) -> RequestMyIncomeResponse:
        """
        Get income data from myDATA API.

        Args:
            query: Income query parameters

        Returns:
            RequestMyIncomeResponse: API response with income data

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.get_my_income(query)
        except Exception as e:
            raise self._handle_aade_error("income data fetch", e)

    async def iterate_my_income(
        self, query: BookInfoQuery
    ) -> Iterator[RequestMyIncomeResponse]:
        """
        Iterate over paginated income data.

        Args:
            query: Income query parameters

        Returns:
            Iterator[RequestMyIncomeResponse]: Async iterator over income data pages

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.iter_my_income(query)
        except Exception as e:
            raise self._handle_aade_error("income data iteration", e)

    async def collect_my_income(
        self, query: BookInfoQuery, max_pages: Optional[int] = None
    ) -> List[RequestMyIncomeResponse]:
        """
        Collect all income data (with optional pagination limits).

        Args:
            query: Income query parameters
            max_pages: Maximum number of pages to collect (None for all)

        Returns:
            List[RequestMyIncomeResponse]: All collected income responses

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.collect_my_income(
                query, max_pages=max_pages
            )
        except Exception as e:
            raise self._handle_aade_error("income data collection", e)

    async def get_my_expenses(self, query: BookInfoQuery) -> RequestMyExpensesResponse:
        """
        Get expenses data from myDATA API.

        Args:
            query: Expenses query parameters

        Returns:
            RequestMyExpensesResponse: API response with expenses data

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.get_my_expenses(query)
        except Exception as e:
            raise self._handle_aade_error("expenses data fetch", e)

    async def iterate_my_expenses(
        self, query: BookInfoQuery
    ) -> Iterator[RequestMyExpensesResponse]:
        """
        Iterate over paginated expenses data.

        Args:
            query: Expenses query parameters

        Returns:
            Iterator[RequestMyExpensesResponse]: Async iterator over expenses data pages

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.iter_my_expenses(query)
        except Exception as e:
            raise self._handle_aade_error("expenses data iteration", e)

    async def collect_my_expenses(
        self, query: BookInfoQuery, max_pages: Optional[int] = None
    ) -> List[RequestMyExpensesResponse]:
        """
        Collect all expenses data (with optional pagination limits).

        Args:
            query: Expenses query parameters
            max_pages: Maximum number of pages to collect (None for all)

        Returns:
            List[RequestMyExpensesResponse]: All collected expenses responses

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.collect_my_expenses(
                query, max_pages=max_pages
            )
        except Exception as e:
            raise self._handle_aade_error("expenses data collection", e)

    # -----------------------------
    # VAT/E3 Operations
    # -----------------------------
    async def get_vat_info(self, query: RequestVatInfoQuery) -> RequestVatInfoResponse:
        """
        Get VAT information from myDATA API.

        Args:
            query: VAT info query parameters

        Returns:
            RequestVatInfoResponse: API response with VAT data

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.get_vat_info(query)
        except Exception as e:
            raise self._handle_aade_error("VAT info fetch", e)

    async def iterate_vat_info(
        self, query: RequestVatInfoQuery
    ) -> Iterator[RequestVatInfoResponse]:
        """
        Iterate over paginated VAT information.

        Args:
            query: VAT info query parameters

        Returns:
            Iterator[RequestVatInfoResponse]: Async iterator over VAT info pages

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.iter_vat_info(query)
        except Exception as e:
            raise self._handle_aade_error("VAT info iteration", e)

    async def collect_vat_info(
        self, query: RequestVatInfoQuery, max_pages: Optional[int] = None
    ) -> List[RequestVatInfoResponse]:
        """
        Collect all VAT information (with optional pagination limits).

        Args:
            query: VAT info query parameters
            max_pages: Maximum number of pages to collect (None for all)

        Returns:
            List[RequestVatInfoResponse]: All collected VAT info responses

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.collect_vat_info(
                query, max_pages=max_pages
            )
        except Exception as e:
            raise self._handle_aade_error("VAT info collection", e)

    async def get_e3_info(self, query: RequestE3InfoQuery) -> RequestE3InfoResponse:
        """
        Get E3 information from myDATA API.

        Args:
            query: E3 info query parameters

        Returns:
            RequestE3InfoResponse: API response with E3 data

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.get_e3_info(query)
        except Exception as e:
            raise self._handle_aade_error("E3 info fetch", e)

    async def iterate_e3_info(
        self, query: RequestE3InfoQuery
    ) -> Iterator[RequestE3InfoResponse]:
        """
        Iterate over paginated E3 information.

        Args:
            query: E3 info query parameters

        Returns:
            Iterator[RequestE3InfoResponse]: Async iterator over E3 info pages

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.iter_e3_info(query)
        except Exception as e:
            raise self._handle_aade_error("E3 info iteration", e)

    async def collect_e3_info(
        self, query: RequestE3InfoQuery, max_pages: Optional[int] = None
    ) -> List[RequestE3InfoResponse]:
        """
        Collect all E3 information (with optional pagination limits).

        Args:
            query: E3 info query parameters
            max_pages: Maximum number of pages to collect (None for all)

        Returns:
            List[RequestE3InfoResponse]: All collected E3 info responses

        Raises:
            HTTPException: 400 for bad requests, 502 for API errors, 503 for network errors, 500 for other failures
        """
        try:
            return await self.mydata_service.collect_e3_info(query, max_pages=max_pages)
        except Exception as e:
            raise self._handle_aade_error("E3 info collection", e)

    # -----------------------------
    # AADE Documents Persistence
    # -----------------------------
    async def save_documents(
        self,
        query: DocsQuery,
        organization_id: str,
        db: AsyncSession,
        transmitted: bool = False,
        use_iterator: bool = False,
    ) -> Dict[str, Any]:
        """Fetch documents from myDATA API and save them to the database."""
        try:
            # Determine direction based on transmitted flag
            direction = (
                InvoiceDirection.TRANSMITTED
                if transmitted
                else InvoiceDirection.RECEIVED
            )
            if not use_iterator:
                # Fetch documents from API
                response = await self.mydata_service.get_docs(
                    query, transmitted=transmitted
                )

                # Save to database (raw XML is optional, can be added later if needed)
                result = await self.mydata_service.save_documents(
                    response=response,
                    query=query,
                    organization_id=organization_id,
                    db=db,
                    direction=direction,
                    raw_xml=None,
                )

                return result

            # --- ITERATOR MODE (used by /mydata/docs/iterate) ---
            # Here we fetch *all* pages via iter_docs and save them one by one.
            iterator = await self.mydata_service.iter_docs(
                query, transmitted=transmitted
            )

            aggregated_result: Dict[str, Any] = {
                "pages_saved": 0,
                "documents_saved": 0,
                "details": [],
            }

            # iter_docs is sync in your earlier snippet, so plain `for`, not `async for`
            for page in iterator:
                page_result = await self.mydata_service.save_documents(
                    response=page,
                    query=query,
                    organization_id=organization_id,
                    db=db,
                    direction=direction,
                    raw_xml=None,
                )

                # How you aggregate depends on what save_documents returns.
                # Here’s a generic example:
                aggregated_result["pages_saved"] += 1
                if "documents_saved" in page_result:
                    aggregated_result["documents_saved"] += page_result[
                        "documents_saved"
                    ]
                aggregated_result["details"].append(page_result)

            return aggregated_result

        except ApiError as e:
            raise HTTPException(
                status_code=502, detail=f"myDATA API error: {e.message}"
            )
        except NetworkError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Network error connecting to myDATA API: {str(e)}",
            )
        except AadeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid request to myDATA API: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to save documents: {str(e)}"
            )
