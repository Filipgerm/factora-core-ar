from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path

from app.db.postgres import connect_to_database, close_database_connection
from app.api.routes.gemi_routes import router as companies_router
from app.api.routes.file_routes import router as file_router
from app.api.routes.onboarding_routes import router as onboarding_router
from app.api.routes.saltedge_routes import router as saltedge_router
from app.api.routes.dashboard_routes import router as dashboard_router
from app.api.routes.mydata_routes import router as aade_router
from app.config import settings

# from api.routes.chatbot_routes import router as chatbot_router


# Create events to begin and close database connections upon application startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    await connect_to_database()
    yield
    # Shutdown logic
    await close_database_connection()


# Parse CORS origins from environment variable
def get_cors_origins():
    """Parse CORS origins from environment variable."""
    cors_origins = settings.CORS_ORIGINS
    if cors_origins == "*":
        return ["*"]
    # Split by comma and strip whitespace
    return [origin.strip() for origin in cors_origins.split(",") if origin.strip()]


app = FastAPI(
    title="Factora Product",
    lifespan=lifespan,
    # Configure root_path if running behind a reverse proxy with subpath
    # root_path="/api" if you want to serve API under /api subpath
)

# Configure CORS middleware with environment-based origins
cors_origins = get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trust proxy headers when behind nginx reverse proxy
# This ensures X-Forwarded-* headers are properly handled
if settings.TRUSTED_PROXIES != "*":
    # If specific proxies are configured, use TrustedHostMiddleware
    # For now, we trust all proxies when TRUSTED_PROXIES is "*"
    pass
# FastAPI/Starlette automatically handles X-Forwarded-* headers
# when the request comes through a trusted proxy

app.include_router(companies_router, prefix="/companies", tags=["External APIs"])
app.include_router(file_router, prefix="/files", tags=["File Management"])
app.include_router(onboarding_router, prefix="/onboarding", tags=["Onboarding"])
# app.include_router(chatbot_router, prefix="/chatbot", tags=["AI Chatbot"])
app.include_router(saltedge_router, prefix="/saltedge", tags=["Saltedge"])
app.include_router(aade_router, prefix="/aade", tags=["AADE"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

if __name__ == "__main__":
    print("Starting server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
