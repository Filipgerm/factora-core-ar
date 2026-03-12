from fastapi import APIRouter, HTTPException
from app.controllers.file_controller import get_file_by_filename

router = APIRouter()


@router.get("/{filename}")
async def get_file(filename: str):
    """
    Serve a stored file by its filename.

    Purpose:
        Fetches a file previously uploaded (e.g., GEMI documents) from the
        backend storage/database and streams it back to the client. Designed
        so the frontend can display or download files (typically PDFs).

    Returns:
        A streaming HTTP response containing the file's binary data, with appropriate
        headers (e.g., `Content-Type`, `Content-Disposition`) so the browser or frontend
        viewer can display or download it.
    """
    return await get_file_by_filename(filename)
