from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.postgres import AsyncSessionLocal, get_supabase, SUPABASE_BUCKET
from app.db.database_models import Document


async def fetch_file_from_storage(filename: str):
    """
    Fetch a file from Supabase storage by filename.
    Returns the file data and metadata.
    """
    async with AsyncSessionLocal() as session:
        # Find document in PostgreSQL by original_name
        result = await session.execute(
            select(Document).where(Document.original_name == filename)
        )
        doc = result.scalar_one_or_none()

        if not doc:
            return None

        # Download file from Supabase Storage
        supabase = get_supabase()
        try:
            file_data = supabase.storage.from_(SUPABASE_BUCKET).download(doc.path)
            return {
                "data": file_data,
                "content_type": doc.content_type or "application/octet-stream",
                "original_name": doc.original_name,
                "size": doc.size,
                "metadata": doc.metadata,
            }
        except Exception as e:
            print(f"Error downloading file from storage: {e}")
            return None


# For backward compatibility
async def fetch_file_from_gridfs(filename: str):
    """Backward compatibility wrapper."""
    return await fetch_file_from_storage(filename)
