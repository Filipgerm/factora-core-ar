# endpoints/income_expenses.py
from __future__ import annotations
from typing import Dict, Any, Iterator, Optional, Protocol, TypeVar, Type
from pydantic import BaseModel
from packages.aade.http import AadeClient
from packages.aade.utils.pagination import paginate
from packages.aade.models.my_book_info import (
    BookInfoQuery,
    RequestMyIncomeQuery,  # alias of BookInfoQuery (for readability)
    RequestMyExpensesQuery,  # alias of BookInfoQuery (for readability)
    RequestMyIncomeResponse,
    RequestMyExpensesResponse,
)


# XML parser dependency for income/expenses endpoints
class BookInfoXMLSerializer(Protocol):
    def parse_book_info(self, xml_text: str) -> Dict[str, Any]: ...


TResp = TypeVar("TResp", bound=BaseModel)


class IncomeExpensesAPI:
    """
    Endpoint wrappers for:
      - GET /myDATA/RequestMyIncome
      - GET /myDATA/RequestMyExpenses

    Notes:
      - Query DTO is the same (BookInfoQuery); we keep explicit names via aliases.
      - Responses are XML; we rely on a serializer that returns a dict matching
        RequestMyIncomeResponse / RequestMyExpensesResponse for Pydantic validation.
    """

    def __init__(
        self, client: AadeClient, *, serializer: Optional[BookInfoXMLSerializer] = None
    ) -> None:
        self._client = client
        self._serializer = serializer

    def _request(
        self,
        endpoint: str,
        params: Dict[str, Any],
        model: Type[TResp],
    ) -> TResp:
        xml = self._client.get(endpoint, params=params).text
        if not self._serializer:
            raise RuntimeError(
                "XML serializer not set: inject one with parse_book_info(xml) -> dict"
            )
        data = self._serializer.parse_book_info(xml)
        return model.model_validate(data)

    def _iterate(
        self,
        endpoint: str,
        base_params: Dict[str, Any],
        model: Type[TResp],
    ) -> Iterator[TResp]:
        def _fetch(p: Dict[str, Any]) -> Dict[str, Any]:
            merged = {**base_params, **p}
            xml = self._client.get(endpoint, params=merged).text
            if not self._serializer:
                raise RuntimeError(
                    "XML serializer not set: inject one with parse_book_info(xml) -> dict"
                )
            return self._serializer.parse_book_info(xml)

        for page in paginate(_fetch, {}):
            yield model.model_validate(page)

    # Thin wrappers
    def request_my_income(self, q: RequestMyIncomeQuery) -> RequestMyIncomeResponse:
        return self._request(
            "/RequestMyIncome",
            q.model_dump(exclude_none=True),
            RequestMyIncomeResponse,
        )

    def iterate_my_income(
        self, q: RequestMyIncomeQuery
    ) -> Iterator[RequestMyIncomeResponse]:
        return self._iterate(
            "/RequestMyIncome",
            q.model_dump(exclude_none=True),
            RequestMyIncomeResponse,
        )

    def request_my_expenses(
        self, q: RequestMyExpensesQuery
    ) -> RequestMyExpensesResponse:
        return self._request(
            "/RequestMyExpenses",
            q.model_dump(exclude_none=True),
            RequestMyExpensesResponse,
        )

    def iterate_my_expenses(
        self, q: RequestMyExpensesQuery
    ) -> Iterator[RequestMyExpensesResponse]:
        return self._iterate(
            "/RequestMyExpenses",
            q.model_dump(exclude_none=True),
            RequestMyExpensesResponse,
        )
