from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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


def get_cors_origins() -> list[str]:
    """Parse and return the list of allowed CORS origins from settings.

    An empty ``CORS_ORIGINS`` string disables cross-origin access entirely
    (safe production default).  Pass a comma-separated list or the literal
    ``"*"`` only for development environments.

    Returns:
        List of allowed origin strings, e.g. ``["https://app.factora.eu"]``.
    """
    raw = settings.CORS_ORIGINS.strip()
    if not raw:
        return []
    if raw == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


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
