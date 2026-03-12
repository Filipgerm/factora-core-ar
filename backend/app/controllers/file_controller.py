from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from app.services.file_service import fetch_file_from_storage
import io


async def get_file_by_filename(filename: str):
    file_info = await fetch_file_from_storage(filename)
    if file_info is None:
        raise HTTPException(status_code=404, detail="File not found")

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
