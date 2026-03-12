from __future__ import annotations
from typing import Optional, List, Union
from pydantic import BaseModel

# Reuse the MetaObject we already use for pagination (next_id, next_page)
from packages.saltedge.models.connections import MetaObject


class Customer(BaseModel):
    # Base customer (Client flow)
    customer_id: Optional[str] = None
    identifier: Optional[str] = None
    categorization_type: Optional[str] = None  # personal|business
    blocked_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PartnerCustomer(BaseModel):
    # Partner flow adds email; otherwise similar shape
    email: Optional[str] = None
    customer_id: Optional[str] = None
    identifier: Optional[str] = None
    blocked_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CustomerResponse(BaseModel):
    data: Customer


class CreatedClientCustomerResponse(BaseModel):
    data: Customer


class CreatedPartnerCustomerResponse(BaseModel):
    data: PartnerCustomer


class RemovedCustomerData(BaseModel):
    deleted: bool = True
    # id: Optional[str] = None
    customer_id: Optional[str] = None


class RemovedCustomerResponse(BaseModel):
    data: RemovedCustomerData


class CustomersResponse(BaseModel):
    data: List[Customer]
    meta: Optional[MetaObject] = None


# # A convenience union you might use in service/controller if needed
# CreatedCustomerUnion = Union[
#     CreatedClientCustomerResponse, CreatedPartnerCustomerResponse
# ]
