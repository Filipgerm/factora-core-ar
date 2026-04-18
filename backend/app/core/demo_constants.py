"""Stable identifiers shared across demo fixtures and demo-mode service shortcuts.

The dashboard PL metrics flow and SaltEdge customer resolution must agree on the
same ``customer_id`` so ``GET /v1/saltedge/customers`` (first row) matches the
``customer_id`` query param used by ``GET /v1/dashboard/pl-metrics``.
"""

DEMO_SALTEDGE_CUSTOMER_ID = "demo-customer-se-001"

# Canonical demo user created by scripts/seed_demo_db.py.
# The demo-login endpoint issues tokens for this user without password validation.
DEMO_USER_EMAIL = "demo-dashboard@example.org"
