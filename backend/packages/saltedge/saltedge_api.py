from __future__ import annotations
from .http import SaltEdgeClient
from packages.saltedge.endpoints.connections import ConnectionsAPI
from packages.saltedge.endpoints.accounts import AccountsAPI
from packages.saltedge.endpoints.consents import ConsentsAPI
from packages.saltedge.endpoints.rates import RatesAPI
from packages.saltedge.endpoints.customers import CustomersAPI
from packages.saltedge.endpoints.transactions import TransactionsAPI
from packages.saltedge.endpoints.providers import ProvidersAPI
from packages.saltedge.endpoints.payments import PaymentsAPI


class API:
    """Facade to group endpoint clients."""

    def __init__(self, client: SaltEdgeClient) -> None:
        self.connections = ConnectionsAPI(client)
        self.accounts = AccountsAPI(client)
        self.consents = ConsentsAPI(client)
        self.rates = RatesAPI(client)
        self.customers = CustomersAPI(client)
        self.transactions = TransactionsAPI(client)
        self.providers = ProvidersAPI(client)
        self.payments = PaymentsAPI(client)
