"""
Chat streaming endpoint.
/api/v1/chat        — non-streaming (legacy)
/v1/chat/stream     — SSE streaming (called by core-app agents route)
"""
from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator, Dict, Optional

import httpx
from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

# Mounted at /api/v1/chat in api_router
# Also mounted as standalone /v1/chat in main.py for the stream sub-path

_AGENT_SYSTEM_PROMPTS: dict[str, str] = {
    "personal":   "You are Wave, the creator's personal AI assistant. You know their content, brand, and goals. Be concise, helpful, and proactive.",
    "content":    "You are the WaveStack content agent. Help draft posts, captions, and content ideas. Be creative and platform-aware.",
    "analytics":  "You are the WaveStack analytics agent. Explain data clearly, give actionable insights. Be concise.",
    "growth":     "You are the WaveStack growth agent. Focus on trends, SEO, and audience growth strategies.",
    "community":  "You are the WaveStack community agent. Help with engagement, DMs, and community building.",
    "revenue":    "You are the WaveStack revenue agent. Advise on monetisation, sponsorships, and revenue growth.",
    "moderation": "You are the WaveStack moderation agent. Help review content and manage community safety.",
    "clip":       "You are the WaveStack clip agent. Help identify and produce great stream highlights.",
}


class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    agentType: Optional[str] = "personal"


async def _stream_from_model_router(
    org_id: str,
    user_id: Optional[str],
    message: str,
    agent_type: str,
) -> AsyncGenerator[str, None]:
    system_prompt = _AGENT_SYSTEM_PROMPTS.get(agent_type, _AGENT_SYSTEM_PROMPTS["personal"])

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{settings.MODEL_ROUTER_URL}/v1/route/stream",
                headers={
                    "Content-Type": "application/json",
                    "x-internal-service": settings.INTERNAL_SERVICE_SECRET,
                },
                json={
                    "task_type": "chat_response",
                    "org_id": org_id,
                    "user_id": user_id,
                    "prompt": message,
                    "platform": "dashboard",
                    "context": {"system_prompt": system_prompt},
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data:"):
                        yield f"{line}\n\n"
    except httpx.HTTPStatusError as exc:
        logger.warning("model-router stream error %s", exc)
        yield f"data: {json.dumps({'error': 'Model router unavailable'})}\n\n"
    except Exception as exc:
        logger.error("chat stream error: %s", exc)
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"


# ── /api/v1/chat (non-streaming, legacy) ─────────────────────────────────────

@router.post("")
async def send_chat_message(
    body: ChatRequest,
    x_org_id: Optional[str] = Header(default=None, alias="x-org-id"),
    x_user_id: Optional[str] = Header(default=None, alias="x-user-id"),
) -> Dict[str, Any]:
    org_id = x_org_id or "unknown"
    system_prompt = _AGENT_SYSTEM_PROMPTS.get(body.agentType or "personal", _AGENT_SYSTEM_PROMPTS["personal"])

    full_response = ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.MODEL_ROUTER_URL}/v1/route",
                headers={"x-internal-service": settings.INTERNAL_SERVICE_SECRET},
                json={
                    "task_type": "chat_response",
                    "org_id": org_id,
                    "user_id": x_user_id,
                    "prompt": body.message,
                    "platform": "dashboard",
                    "context": {"system_prompt": system_prompt},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            full_response = data.get("response", "")
    except Exception as exc:
        logger.warning("model-router error: %s", exc)
        full_response = "I'm having trouble connecting right now. Please try again."

    return {
        "response": full_response,
        "sessionId": body.sessionId,
        "agentType": body.agentType,
    }


# ── /api/v1/chat/stream (SSE) ─────────────────────────────────────────────────

@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    x_org_id: Optional[str] = Header(default=None, alias="x-org-id"),
    x_user_id: Optional[str] = Header(default=None, alias="x-user-id"),
):
    """
    SSE streaming endpoint. Also reachable at /v1/chat/stream (registered in main.py).
    core-app agents route calls this to stream responses to the browser.
    """
    return StreamingResponse(
        _stream_from_model_router(
            org_id=x_org_id or "unknown",
            user_id=x_user_id,
            message=body.message,
            agent_type=body.agentType or "personal",
        ),
        media_type="text/event-stream",
    )


@router.get("/{session_id}")
async def get_chat_history(session_id: str) -> Dict[str, Any]:
    return {"sessionId": session_id, "messages": []}
