from pydantic_settings import BaseSettings
from pydantic import Field
import os
from dotenv import load_dotenv

# Load environment variables before anything else
load_dotenv()


class Settings(BaseSettings):
    SUPABASE_URI: str = Field(
        ..., description="Supabase database URI for PostgreSQL connection"
    )
    SUPABASE_URI_SHARED_POOLER: str = Field(
        ..., description="Supabase database IPv4 URL for PostgreSQL connection"
    )
    SUPABASE_URL: str = Field(
        ..., description="Supabase project URL for client initialization"
    )
    SUPABASE_SECRET_KEY: str = Field(..., description="Supabase service role key")
    ALEMBIC_DATABASE_URL: str = Field(
        ...,
        description="Supabase service role key for alembic migrations: port changed",
    )
    SUPABASE_BUCKET: str = Field(..., description="Supabase storage bucket name")
    GEMH_API_KEY: str = Field(..., description="GEMI API key")
    BREVO_API_KEY: str = Field(..., description="Brevo API key")
    BREVO_SMTP_KEY: str = Field(..., description="Brevo SMTP key")
    BREVO_SENDER_EMAIL: str = Field(..., description="Brevo sender email")
    BREVO_SENDER_NAME: str = Field(..., description="Brevo sender name")
    AADE_USERNAME: str = Field(..., description="AADE username")
    AADE_SUBSCRIPTION_KEY: str = Field(..., description="AADE api key")
    NGROK_DEV_BASE_URL: str = Field(
        ..., description="Ngrok base url for reset password functionality"
    )
    SALTEDGE_APP_ID: str = Field(..., description="Saltedge app id")
    SALTEDGE_SECRET: str = Field(..., description="Saltedge API key")
    CODE_PEPPER: str = Field(..., description="Code pepper for hashing")

    # --- JWT Authentication ---
    JWT_SECRET_KEY: str = Field(
        ...,
        description=(
            "Secret key for signing JWT access tokens (HS256). "
            "Must be at least 32 random bytes. "
            "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        ),
    )

    # CORS and Proxy Configuration
    CORS_ORIGINS: str = Field(
        default="",
        description=(
            "Comma-separated list of allowed CORS origins. "
            "Leave empty to deny all cross-origin requests (production default). "
            "Use 'http://localhost:3000' for local development. "
            "Example: 'https://app.factora.eu,https://www.factora.eu'"
        ),
    )
    TRUSTED_PROXIES: str = Field(
        default="*",
        description=(
            "Comma-separated list of trusted proxy IPs/CIDRs. "
            "Use '*' to trust all (only for local dev). "
            "Example: '172.16.0.0/12' covers the Docker bridge network."
        ),
    )
    ALLOWED_HOSTS: str = Field(
        default="*",
        description=(
            "Comma-separated list of allowed Host header values. "
            "Use '*' to allow all (only for local dev). "
            "Example: 'app.factora.eu,api.factora.eu'"
        ),
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",  # Ignore extra fields in env file
    }


# Create settings instance with better error handling
try:
    settings = Settings()
except Exception as e:
    print(f"❌ Failed to load settings: {e}")
    print("Make sure you have a .env file with all required environment variables:")
    print("- SUPABASE_URI")
    print("- SUPABASE_URL")
    print("- SUPABASE_SECRET_KEY")
    print("- SUPABASE_BUCKET")
    print("- GEMH_API_KEY")
    print("- BREVO_API_KEY")
    print("- BREVO_SMTP_KEY")
    print("- BREVO_SENDER_EMAIL")
    print("- BREVO_SENDER_NAME")
    print("- CODE_PEPPER")
    raise
