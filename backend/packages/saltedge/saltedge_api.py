"""Salt Edge v6 API facade (grouped endpoint clients).

Demo mode: all HTTP is handled in ``SaltEdgeClient`` (``packages/saltedge/http.py``)
when ``settings.demo_mode`` is true — synthetic JSON from
``app/core/demo_fixtures/`` with no real requests.
"""
from __future__ import annotations
from .http import SaltEdgeClient
from packages.saltedge.api.connections import ConnectionsAPI
from packages.saltedge.api.accounts import AccountsAPI
from packages.saltedge.api.consents import ConsentsAPI
from packages.saltedge.api.rates import RatesAPI
from packages.saltedge.api.customers import CustomersAPI
from packages.saltedge.api.transactions import TransactionsAPI
from packages.saltedge.api.providers import ProvidersAPI
from packages.saltedge.api.payments import PaymentsAPI


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
