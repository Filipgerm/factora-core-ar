from __future__ import annotations
from typing import Optional
from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.models.providers import ProviderResponse, ProvidersResponse


class ProvidersAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # GET /providers
    def list(
        self,
        *,
        include_sandboxes: Optional[bool] = None,
        country_code: Optional[str] = None,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
        exclude_inactive: Optional[bool] = None,
        key_owner: Optional[str] = None,
        mode: Optional[str] = None,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> ProvidersResponse:
        params = {
            "include_sandboxes": include_sandboxes,
            "country_code": country_code,
            "include_ais_fields": include_ais_fields,
            "include_pis_fields": include_pis_fields,
            "include_credentials_fields": include_credentials_fields,
            "exclude_inactive": exclude_inactive,
            "key_owner": key_owner,
            "mode": mode,
            "from_id": from_id,
            "per_page": per_page,
        }
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}

        raw = self._client.get("/providers", params=params).json()
        return ProvidersResponse.model_validate(raw)

    # GET /providers/{provider_code}
    def show(
        self,
        *,
        provider_code: str,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
    ) -> ProviderResponse:
        params = {
            "include_ais_fields": include_ais_fields,
            "include_pis_fields": include_pis_fields,
            "include_credentials_fields": include_credentials_fields,
        }
        params = {k: v for k, v in params.items() if v is not None}

        raw = self._client.get(f"/providers/{provider_code}", params=params).json()
        return ProviderResponse.model_validate(raw)
