FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl iputils-ping netcat-traditional gnupg \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Change the working directory to the `app` directory
WORKDIR /app

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

# Copy the project into the image
ADD . .

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Run with uvicorn
CMD ["uv", "run", "python", "app/main.py"]

# CMD ["ping", "zpqgqoklcosilwmppqal.supabase.co"]
# # ---- Base image ----
#     FROM python:3.12-slim AS app

#     # 1) Install uv into this image (fast Python package manager)
#     COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/ 
    
#     # 2) Create workdir
#     WORKDIR /app
    
#     # 3) (Optional) System deps for packages with native extensions
#     # RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
    
#     # 4) Copy only lockfile + pyproject first (better Docker layer caching)
#     COPY uv.lock pyproject.toml ./
    
#     # 5) Sync dependencies into a local virtualenv at /app/.venv
#     #    --frozen respects uv.lock; --no-cache keeps layers small
#     RUN uv sync --frozen --no-cache
    
#     # 6) Put venv on PATH so uvicorn/fastapi are found without full path
#     ENV PATH="/app/.venv/bin:${PATH}" \
#         PYTHONDONTWRITEBYTECODE=1 \
#         PYTHONUNBUFFERED=1
    
#     # 7) Copy the rest of your project
#     COPY . .
    
#     # RUN mkdir -p /uploads/images /uploads/files

#     # 8) (Security) Run as a non-root user at runtime
#     RUN useradd -u 10001 -m appuser
#     USER appuser
    
#     # 9) Expose the service port
#     EXPOSE 8000

#     # 10) Health check
#     HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
#         CMD curl -f http://localhost:8000/health || exit 1

#     # 11) Start the server
#     #     Replace "app.main:app" with your <module>:<app> path
#     CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# # Use Python 3.11 slim image for smaller size
# FROM python:3.11-slim

# # Set environment variables
# ENV PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1 \
#     PYTHONPATH=/app

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     tesseract-ocr \
#     tesseract-ocr-eng \
#     libglib2.0-0 \
#     libgomp1 \
#     curl \
#     && rm -rf /var/lib/apt/lists/*

# # Install uv package manager
# RUN pip install uv

# # Create non-root user for security
# RUN groupadd -r appuser && useradd -r -g appuser appuser

# # Set working directory
# WORKDIR /app

# # Copy pyproject.toml first for better caching
# COPY pyproject.toml .

# # Install Python dependencies using uv
# RUN uv pip install --system -e .

# # Copy application code
# COPY . .

# # Create uploads directory and set permissions
# RUN mkdir -p /app/uploads/images /app/uploads/files && \
#     chown -R appuser:appuser /app

# # Switch to non-root user
# USER appuser

# # Expose port
# EXPOSE 8000

# # Health check
# HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
#     CMD curl -f http://localhost:8000/health || exit 1

# # Run the application with hot-reload for development
# CMD ["python", "-m", "uvicorn", "app.main:application", "--host", "0.0.0.0", "--port", "8000", "--reload"]