"""FileController — bridges file routes and FileService."""

from __future__ import annotations

import io

from fastapi.responses import StreamingResponse

from app.core.exceptions import NotFoundError
from app.services.file_service import FileService


class FileController:
    def __init__(self, service: FileService) -> None:
        self.service = service

    async def get_file(self, filename: str) -> StreamingResponse:
        """Serve a stored file by filename."""
        file_info = await self.service.fetch_file(filename)
        if file_info is None:
            raise NotFoundError(
                f"File '{filename}' not found", code="file.not_found"
            )

        file_data = file_info["data"]
        content_type = file_info.get("content_type", "application/octet-stream")

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(file_data)),
            },
        )
