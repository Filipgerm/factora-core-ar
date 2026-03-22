from __future__ import annotations

from typing import Literal

from dotenv import load_dotenv
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings

# Load environment variables before Settings is instantiated
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file.

    All fields marked ``...`` (no default) are required.  Optional fields
    have sensible defaults that are safe to use in production.

    See ``.env.example`` for the full list with explanations.
    """

    # --- Database ---
    SUPABASE_URI: str = Field(
        ..., description="Supabase async PostgreSQL URI (asyncpg driver, port 5432)"
    )
    SUPABASE_URI_SHARED_POOLER: str = Field(
        ..., description="Supabase pooled URI (asyncpg driver, port 6543)"
    )
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_SECRET_KEY: str = Field(..., description="Supabase service-role key")
    ALEMBIC_DATABASE_URL: str = Field(
        ..., description="Synchronous URI for Alembic migrations (psycopg driver)"
    )
    SUPABASE_BUCKET: str = Field(..., description="Supabase storage bucket name")

    # --- External integrations ---
    GEMH_API_KEY: str = Field(..., description="Greek Business Registry (GEMI) API key")
    BREVO_API_KEY: str = Field(..., description="Brevo REST API key")
    BREVO_SMTP_KEY: str = Field(..., description="Brevo SMTP API key")
    BREVO_SENDER_EMAIL: str = Field(..., description="Verified Brevo sender address")
    BREVO_SENDER_NAME: str = Field(
        ..., description="Display name for outbound email/SMS"
    )
    AADE_USERNAME: str = Field(..., description="AADE/myDATA account username")
    AADE_SUBSCRIPTION_KEY: str = Field(..., description="AADE/myDATA subscription key")
    SALTEDGE_APP_ID: str = Field(..., description="SaltEdge application ID")
    SALTEDGE_SECRET: str = Field(..., description="SaltEdge API secret")

    # --- AI / embeddings (optional in dev; required for live agent flows) ---
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key for chat and embeddings")
    OPENAI_CHAT_MODEL: str = Field(
        default="gpt-4o-mini",
        description="Default chat model for LLM client and agents",
    )
    OPENAI_EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="Embedding model for pgvector RAG",
    )
    OPENAI_EMBEDDING_DIMENSIONS: int = Field(
        default=1536,
        ge=256,
        le=3072,
        description="Must match the vector column width in organization_embeddings",
    )
    ANTHROPIC_API_KEY: str = Field(
        default="",
        description="Optional Anthropic API key (alternative LLM provider)",
    )

    # --- Stripe (optional until billing is live) ---
    STRIPE_SECRET_KEY: str = Field(default="", description="Stripe secret API key")
    STRIPE_WEBHOOK_SECRET: str = Field(
        default="",
        description="Stripe signing secret for webhook verification",
    )

    # --- Gmail / SMTP (optional; collections agent outbound) ---
    GMAIL_SMTP_HOST: str = Field(default="", description="SMTP host for Gmail or workspace relay")
    GMAIL_SMTP_PORT: int = Field(default=587, description="SMTP port (587 TLS recommended)")
    GMAIL_SMTP_USER: str = Field(default="", description="SMTP auth username (often full email)")
    GMAIL_SMTP_PASSWORD: str = Field(default="", description="SMTP app password or relay secret")
    GMAIL_FROM_EMAIL: str = Field(default="", description="From address for agent-sent mail")

    # --- Security ---
    CODE_PEPPER: str = Field(
        ..., description="Server-side pepper for Argon2 hashes (>= 16 random chars)"
    )
    JWT_SECRET_KEY: str = Field(
        ...,
        description=(
            "HS256 signing key for JWT access tokens. "
            "Must be >= 32 random bytes. "
            'Generate: python -c "import secrets; print(secrets.token_urlsafe(48))"'
        ),
    )

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = Field(
        default="",
        description=(
            "Google OAuth 2.0 client ID.  Required for Google Sign-In. "
            "Obtain from https://console.cloud.google.com/apis/credentials"
        ),
    )
    GOOGLE_CLIENT_SECRET: str = Field(
        default="",
        description=(
            "Google OAuth 2.0 client secret.  Stored securely; never exposed to the client."
        ),
    )

    # --- URLs ---
    FRONTEND_BASE_URL: str = Field(
        ...,
        description=(
            "Canonical frontend URL used in outbound email links (password reset, "
            "onboarding invitations). "
            "Production: https://app.factora.eu  "
            "Development: https://<ngrok-subdomain>.ngrok-free.app or http://localhost:3000"
        ),
    )

    # --- Environment / Demo Mode ---
    ENVIRONMENT: Literal["production", "development", "demo"] = Field(
        default="production",
        description=(
            "Runtime environment.  Controls external API call behaviour and UI signals. "
            "  'production'  — real API calls, real emails, real data. "
            "  'development' — real API calls, local URLs. "
            "  'demo'        — all external calls return static fixtures; "
            "                  emails are logged, not sent; X-Demo-Mode header added."
        ),
    )

    @computed_field  # type: ignore[misc]
    @property
    def demo_mode(self) -> bool:
        """True when ENVIRONMENT=demo.

        All external API calls return static fixtures; emails are logged only;
        every HTTP response carries ``X-Demo-Mode: true``.
        """
        return self.ENVIRONMENT == "demo"

    @computed_field  # type: ignore[misc]
    @property
    def is_production(self) -> bool:
        """True when ENVIRONMENT=production."""
        return self.ENVIRONMENT == "production"

    @computed_field  # type: ignore[misc]
    @property
    def is_development(self) -> bool:
        """True when ENVIRONMENT=development."""
        return self.ENVIRONMENT == "development"

    # --- CORS and Proxy Configuration ---
    CORS_ORIGINS: str = Field(
        default="",
        description=(
            "Comma-separated allowed CORS origins. "
            "Leave empty (production default) to deny all cross-origin requests. "
            "Development: http://localhost:3000  "
            "Example: https://app.factora.eu,https://www.factora.eu"
        ),
    )
    TRUSTED_PROXIES: str = Field(
        default="*",
        description=(
            "Comma-separated trusted proxy IPs/CIDRs for ProxyHeadersMiddleware. "
            "Use '*' in dev; '172.16.0.0/12' for Docker bridge in production."
        ),
    )
    ALLOWED_HOSTS: str = Field(
        default="*",
        description=(
            "Comma-separated allowed Host header values for TrustedHostMiddleware. "
            "Use '*' in dev; 'app.factora.eu,api.factora.eu' in production."
        ),
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Create settings instance with better error handling
try:
    settings = Settings()
except Exception as e:
    print(f"❌ Failed to load settings: {e}")
    print(
        "Make sure you have a .env file with all required variables. "
        "See backend/.env.example for the full list."
    )
    raise
