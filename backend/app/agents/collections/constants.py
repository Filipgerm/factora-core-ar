"""Collections tuning: alert page size and placeholder outbound address.

``UNRESOLVED_ALERTS_FETCH_LIMIT`` bounds ``discover`` query volume.
``PLACEHOLDER_COLLECTIONS_EMAIL`` stands in until Counterparty billing emails exist.
"""

UNRESOLVED_ALERTS_FETCH_LIMIT = 20
PLACEHOLDER_COLLECTIONS_EMAIL = "collections@example.com"
