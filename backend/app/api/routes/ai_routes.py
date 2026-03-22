"""AI routes — streaming chat (Server-Sent Events)."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.dependencies import AICtrl, CurrentOrgId
from app.models.ai import ChatStreamRequest

router = APIRouter()


@router.post("/chat/stream")
async def chat_stream(
    req: ChatStreamRequest,
    _org: CurrentOrgId,
    ctl: AICtrl,
) -> StreamingResponse:
    """Stream LLM tokens as SSE ``data:`` lines (Vercel AI SDK–compatible shape)."""
    return StreamingResponse(
        ctl.stream_chat_sse(req.message),
        media_type="text/event-stream",
    )
