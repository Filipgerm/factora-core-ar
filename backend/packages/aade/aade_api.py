from __future__ import annotations
from typing import Dict, Any
from .http import AadeClient
from packages.aade.endpoints.docs import DocsAPI, DocsXMLSerializer
from packages.aade.endpoints.income_expenses import (
    IncomeExpensesAPI,
    BookInfoXMLSerializer,
)
from packages.aade.endpoints.vat_e3 import VatE3API, VatE3XMLSerializer
from packages.aade.xml.serializer import (
    parse_requested_docs,
    parse_book_info,
    parse_vat_info,
    parse_e3_info,
)


class DocsSerializer(DocsXMLSerializer):
    """Wrapper to make parse_requested_docs function compatible with DocsXMLSerializer protocol."""

    def parse_requested_docs(self, xml_text: str) -> Dict[str, Any]:
        return parse_requested_docs(xml_text)


class BookInfoSerializer(BookInfoXMLSerializer):
    "Wrapper to make parse_book_info function compatible with BookInfoXMLSerializer protocol."

    def parse_book_info(self, xml_text: str) -> Dict[str, Any]:
        return parse_book_info(xml_text)


class VatE3Serializer(VatE3XMLSerializer):
    """Wrapper to make parse_vat_info and parse_e3_info functions compatible with VatE3XMLSerializer protocol."""

    def parse_vat_info(self, xml_text: str) -> Dict[str, Any]:
        return parse_vat_info(xml_text)

    def parse_e3_info(self, xml_text: str) -> Dict[str, Any]:
        return parse_e3_info(xml_text)


class API:
    """Facade to group AADE endpoint clients."""

    def __init__(self, client: AadeClient) -> None:
        self.docs = DocsAPI(client, serializer=DocsSerializer())
        self.income_expenses = IncomeExpensesAPI(
            client, serializer=BookInfoSerializer()
        )
        self.vat_e3 = VatE3API(client, serializer=VatE3Serializer())
