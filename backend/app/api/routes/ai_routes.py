"""AI routes — streaming chat (Server-Sent Events) and embedding feedback."""

from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import StreamingResponse

from app.dependencies import AICtrl, CurrentOrgId
from app.models.ai import AIFeedbackRequest, AIFeedbackResponse, ChatStreamRequest

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


@router.post(
    "/feedback",
    response_model=AIFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ai_feedback(
    req: AIFeedbackRequest,
    _org: CurrentOrgId,
    ctl: AICtrl,
) -> AIFeedbackResponse:
    """Record a human correction for active learning (pgvector)."""
    return await ctl.submit_feedback(req)
