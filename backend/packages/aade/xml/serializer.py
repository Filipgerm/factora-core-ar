from __future__ import annotations
from typing import Any, Dict, List, Optional, Iterable
from xml.etree import ElementTree as ET
from datetime import datetime
import html

# -------------- Core utilities (namespace-agnostic) --------------


def _local(tag: str) -> str:
    """Return localname of a tag, dropping the namespace if present."""
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _text(el: ET.Element) -> Optional[str]:
    if el is None:
        return None
    txt = (el.text or "").strip()
    return txt or None


def _is_scalar_container(el: ET.Element) -> bool:
    """Heuristic: true if element has no child elements (only text)."""
    return len(list(el)) == 0


def xml_to_dict(el: ET.Element) -> Any:
    """
    Convert an XML element into nested dict/list primitives:
    - elements with only text -> return text
    - repeated child tags become lists
    - attributes are ignored (AADE payloads use element text)
    """
    children = list(el)
    if not children:
        return _text(el)

    grouped: Dict[str, List[ET.Element]] = {}
    for child in children:
        name = _local(child.tag)
        grouped.setdefault(name, []).append(child)

    result: Dict[str, Any] = {}
    for name, elems in grouped.items():
        if len(elems) == 1:
            result[name] = xml_to_dict(elems[0])
        else:
            result[name] = [xml_to_dict(e) for e in elems]
    return result


def parse_xml(xml_text: str) -> ET.Element:
    """Parse XML text and return the root element."""
    return ET.fromstring(xml_text)


def _findall(root: ET.Element, name: str) -> List[ET.Element]:
    """Find all descendants by localname, ignoring namespaces."""
    out: List[ET.Element] = []
    for el in root.iter():
        if _local(el.tag) == name:
            out.append(el)
    return out


def _findfirst(root: ET.Element, name: str) -> Optional[ET.Element]:
    for el in root.iter():
        if _local(el.tag) == name:
            return el
    return None


# -------------- Continuation token extraction --------------


def _extract_continuation_token(root: ET.Element) -> Dict[str, Any]:
    """
    Look for nextPartitionKey/nextRowKey anywhere in the document.
    Returns {} if not found.
    """
    token: Dict[str, Any] = {}
    npk = _findfirst(root, "nextPartitionKey")
    nrk = _findfirst(root, "nextRowKey")
    if npk is not None and _text(npk):
        token["nextPartitionKey"] = _text(npk)
    if nrk is not None and _text(nrk):
        token["nextRowKey"] = _text(nrk)
    return token


# -------------- RequestedDocs & RequestTransmittedDocs --------------


def parse_requested_docs(xml_text: str) -> Dict[str, Any]:
    """
    Build a dict matching models.RequestedDocsResponse:
    {
      "invoicesDoc": [ ...AadeBookInvoiceType dicts... ],
      "cancelledInvoicesDoc": [ ...CancelledInvoiceType dicts... ],
      "incomeClassificationsDoc": [ ...IncomeClassificationType dicts... ],
      "expensesClassificationsDoc": [ ...ExpensesClassificationType dicts... ],
      "paymentMethodsDoc": [ {"invoiceMark": ..., "paymentMethodDetails": [...]}, ... ],
      "continuationToken": {"nextPartitionKey": "...", "nextRowKey": "..."}?
    }
    """
    root = parse_xml(xml_text)

    # Detect wrapper <string> and unpack inner XML
    if root.tag.endswith("string") and root.text and "<RequestedDoc" in root.text:
        xml_text = html.unescape(root.text)

    # Now parse the real payload
    root = parse_xml(xml_text)

    def _collect(section: str, item_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Collect items from a section; if item_name is None, collect all direct children.
        Works even if AADE omits the section (returns []).
        """
        out: List[Dict[str, Any]] = []
        # find all section elements (namespace-agnostic)
        for sec in _findall(root, section):
            # iterate children; if item_name is provided, filter by that name
            for child in list(sec):
                lname = _local(child.tag)
                if item_name and lname != item_name:
                    continue
                out.append(xml_to_dict(child) if list(child) else {lname: _text(child)})
        return out

    # Sections we expect
    invoices = _collect("invoicesDoc", "invoice") or _collect(
        "invoice"
    )  # some payloads flatten

    # 🔧 Normalize nested structures so they match the Pydantic models
    # This handles AADE's XML structure where some fields are wrapped in containers
    for inv in invoices:
        # 1) paymentMethods: AADE wraps the real details inside paymentMethodDetails
        # XSD: <paymentMethods><paymentMethodDetails maxOccurs="unbounded">...</paymentMethodDetails></paymentMethods>
        pm = inv.get("paymentMethods")
        if isinstance(pm, dict):
            # Extract the inner details
            details = pm.get("paymentMethodDetails") or pm.get("paymentMethodDetail")

            # Normalize to a list of dicts
            if isinstance(details, dict):
                details = [details]
            elif details is None:
                details = []

            # The pydantic model expects paymentMethods: List[PaymentMethodDetailType]
            # so we assign the list of detail dicts directly
            inv["paymentMethods"] = details

        # 2) invoiceDetails: dict -> list[dict]
        # XSD: invoiceDetails maxOccurs="unbounded", but AADE sometimes sends single dict
        inv_details = inv.get("invoiceDetails")
        if isinstance(inv_details, dict):
            inv["invoiceDetails"] = [inv_details]

        # 3) Handle ECRToken field name mapping (XML uses ECRToken, model uses ecrToken)
        # The xml_to_dict function handles camelCase conversion automatically
        # XSD: <ECRToken><SigningAuthor>...</SigningAuthor><SessionNumber>...</SessionNumber></ECRToken>
        # Model: ECRTokenType with signingAuthor and sessionNumber fields

    cancelled = _collect("cancelledInvoicesDoc")
    income_cls = _collect("incomeClassificationsDoc")
    expenses_cls = _collect("expensesClassificationsDoc")

    # Payment methods: may appear as <paymentMethodsDoc><paymentMethod>...</paymentMethod></paymentMethodsDoc>
    payments: List[Dict[str, Any]] = []
    for pm_sec in _findall(root, "paymentMethodsDoc"):
        for pm in _findall(pm_sec, "paymentMethod"):
            pm_dict = xml_to_dict(pm)
            # normalize to expected shape: { invoiceMark, paymentMethodDetails: [...] }
            if isinstance(pm_dict, dict):
                # common AADE shapes: invoiceMark, paymentMethodDetails/paymentMethodDetail
                details = pm_dict.get("paymentMethodDetails") or pm_dict.get(
                    "paymentMethodDetail"
                )
                if isinstance(details, dict):
                    details = [details]
                payments.append(
                    {
                        "invoiceMark": pm_dict.get("invoiceMark"),
                        "paymentMethodDetails": details or [],
                    }
                )
            else:
                # fallback: treat as text
                payments.append({"raw": pm_dict})

    token = _extract_continuation_token(root)
    out: Dict[str, Any] = {
        "invoicesDoc": invoices,
        "cancelledInvoicesDoc": cancelled,
        "incomeClassificationsDoc": income_cls,
        "expensesClassificationsDoc": expenses_cls,
        "paymentMethodsDoc": payments,
    }
    if token:
        out["continuationToken"] = token
    return out


# -------------- MyIncome / MyExpenses (BookInfo) --------------


def parse_book_info(xml_text: str) -> Dict[str, Any]:
    """
    Build a dict for models.RequestBookInfoResponse:
    { "bookInfo": [ {...row...}, ... ], "continuationToken": {...}? }

    XSD structure (RequestedStatementDoc/SendStatement):
    <RequestedBookInfo>
      <bookInfo>...</bookInfo> (maxOccurs="unbounded")
      <bookInfo>...</bookInfo>
      <continuationToken>...</continuationToken>?
    </RequestedBookInfo>

    Each <bookInfo> contains:
    - counterVatNumber (optional)
    - issueDate (required)
    - invType (required)
    - selfpricing (optional, lowercase in XML)
    - invoiceDetailType (optional)
    - netValue, vatAmount, etc. (optional amounts)
    - count (required)
    - minMark, maxMark (optional)
    """
    root = parse_xml(xml_text)

    # Handle AADE wrapper case: <string> wrapper with escaped inner XML
    if root.tag.endswith("string") and root.text and "<RequestedBookInfo" in root.text:
        xml_text = html.unescape(root.text)
        root = parse_xml(xml_text)

    rows: List[Dict[str, Any]] = []

    # Look for <bookInfo> elements - these are the row containers
    # The root element is <RequestedBookInfo>, and <bookInfo> elements are direct children
    for bi_container in _findall(root, "bookInfo"):
        # Each <bookInfo> element represents one row
        row_dict = xml_to_dict(bi_container)
        rows.append(row_dict)

    # Fallback: if no bookInfo elements found, look for common alternative names
    if not rows:
        # Try looking for statement elements (from RequestedStatementDoc XSD)
        for stmt_el in _findall(root, "requestedStatement"):
            stmt_dict = xml_to_dict(stmt_el)
            # Extract statement if nested
            if "statement" in stmt_dict:
                rows.append(stmt_dict["statement"])
            else:
                rows.append(stmt_dict)

        # If still no rows, try direct children (excluding continuation token fields)
        if not rows:
            for child in list(root):
                if _local(child.tag) not in (
                    "continuationToken",
                    "nextPartitionKey",
                    "nextRowKey",
                ):
                    rows.append(xml_to_dict(child))

    token = _extract_continuation_token(root)
    out: Dict[str, Any] = {"bookInfo": rows}
    if token:
        out["continuationToken"] = token
    return out


# -------------- VAT Info --------------


def parse_vat_info(xml_text: str) -> Dict[str, Any]:
    """
    Build a dict for models.RequestVatInfoResponse:
    { "rows": [ {...VatInfoRow...}, ... ], "continuationToken": {...}? }

    XSD structure:
    <RequestedVatInfo>
      <continuationToken>...</continuationToken>?
      <VatInfo>...</VatInfo>*  (InvoiceVatDetailType, maxOccurs="unbounded")
    </RequestedVatInfo>
    """
    root = parse_xml(xml_text)
    rows: List[Dict[str, Any]] = []

    # XSD: <xs:element name="VatInfo" type="InvoiceVatDetailType" minOccurs="0" maxOccurs="unbounded"/>
    # Look for "VatInfo" elements (the actual element name from XSD)
    for vat_info_el in _findall(root, "VatInfo"):
        row_dict = xml_to_dict(vat_info_el)
        rows.append(row_dict)

    # Fallback: if no VatInfo elements found, try alternative names (for backward compatibility)
    if not rows:
        candidate_tags = {
            "invoiceVatDetail",
            "VatInfoRow",
            "row",
            "vatInfoRow",
            "InvoiceVatDetail",
        }
        for el in root.iter():
            name = _local(el.tag)
            if name in candidate_tags:
                rows.append(xml_to_dict(el))

    # Last resort: treat each direct child (except continuationToken) as a row
    if not rows:
        for child in list(root):
            if _local(child.tag) != "continuationToken":
                rows.append(xml_to_dict(child))

    token = _extract_continuation_token(root)
    out: Dict[str, Any] = {"rows": rows}
    if token:
        out["continuationToken"] = token
    return out


# -------------- E3 Info --------------


def parse_e3_info(xml_text: str) -> Dict[str, Any]:
    """
    Build a dict for models.RequestE3InfoResponse:
    { "rows": [ {...E3InfoRow...}, ... ], "continuationToken": {...}? }

    XSD structure:
    <RequestedE3Info>
      <continuationToken>...</continuationToken>?
      <E3Info>...</E3Info>*  (InvoiceE3DetailType, maxOccurs="unbounded")
    </RequestedE3Info>
    """
    root = parse_xml(xml_text)
    rows: List[Dict[str, Any]] = []

    # XSD: <xs:element name="E3Info" type="InvoiceE3DetailType" minOccurs="0" maxOccurs="unbounded"/>
    # Look for "E3Info" elements (the actual element name from XSD)
    for e3_info_el in _findall(root, "E3Info"):
        row_dict = xml_to_dict(e3_info_el)
        rows.append(row_dict)

    # Fallback: if no E3Info elements found, try alternative names (for backward compatibility)
    if not rows:
        candidate_tags = {
            "E3InfoRow",
            "invoiceE3Detail",
            "row",
            "e3InfoRow",
            "InvoiceE3Detail",
        }
        for el in root.iter():
            name = _local(el.tag)
            if name in candidate_tags:
                rows.append(xml_to_dict(el))

    # Last resort: treat each direct child (except continuationToken) as a row
    if not rows:
        for child in list(root):
            if _local(child.tag) != "continuationToken":
                rows.append(xml_to_dict(child))

    token = _extract_continuation_token(root)
    out: Dict[str, Any] = {"rows": rows}
    if token:
        out["continuationToken"] = token
    return out
