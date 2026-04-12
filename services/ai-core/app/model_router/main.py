from __future__ import annotations

import asyncio
import json
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

import uvicorn
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import settings
from .memory import (
    build_memory_summary,
    capture_interaction,
    extract_and_save_memories,
    fetch_memory,
)
from .router import route


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(title="WaveStack Model Router", version="1.0.0", lifespan=lifespan)


class RouteRequest(BaseModel):
    task_type: str
    org_id: str
    prompt: str
    # Caller can pass user_id to scope memory and capture to a specific user
    user_id: str | None = None
    # Platform context for data labeling (twitch, discord, twitter, etc.)
    platform: str | None = None
    # If false, interaction is not captured for training (user opted out)
    consent: bool = True
    # Caller may inject extra context; memory is fetched automatically
    context: dict[str, Any] | None = None


class RouteResponse(BaseModel):
    response: str
    model_used: str
    confidence: float
    escalated: bool
    reason: str | None = None
    latency_ms: int


def _check_auth(token: str | None) -> None:
    if token != settings.internal_service_secret:
        raise HTTPException(status_code=403, detail="Internal use only")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/v1/route", response_model=RouteResponse)
async def route_request(
    body: RouteRequest,
    x_internal_service: str | None = Header(default=None, alias="x-internal-service"),
):
    _check_auth(x_internal_service)

    # ── Fetch memory and inject into context ──────────────────────────────────
    memories = await fetch_memory(body.org_id, body.user_id)
    ctx = dict(body.context or {})
    if memories:
        ctx["memory_summary"] = build_memory_summary(memories)

    # ── Route ─────────────────────────────────────────────────────────────────
    result = await route(
        task_type=body.task_type,
        org_id=body.org_id,
        prompt=body.prompt,
        context=ctx,
    )

    # ── Post-route: capture + memory update (fire-and-forget) ─────────────────
    asyncio.create_task(capture_interaction(
        org_id=body.org_id,
        user_id=body.user_id,
        prompt=body.prompt,
        response=result["response"],
        model_used=result["model_used"],
        platform=body.platform,
        consent_given=body.consent,
    ))
    if body.consent:
        asyncio.create_task(extract_and_save_memories(
            org_id=body.org_id,
            user_id=body.user_id,
            prompt=body.prompt,
            response=result["response"],
        ))

    return RouteResponse(**result)


@app.post("/v1/route/stream")
async def stream_route(
    body: RouteRequest,
    x_internal_service: str | None = Header(default=None, alias="x-internal-service"),
):
    """
    Streaming variant of /v1/route.
    Yields SSE chunks: `data: {"chunk": "..."}` while generating,
    then a final `data: {"done": true, "model_used": "...", "latency_ms": N}`.
    """
    _check_auth(x_internal_service)

    memories = await fetch_memory(body.org_id, body.user_id)
    ctx = dict(body.context or {})
    if memories:
        ctx["memory_summary"] = build_memory_summary(memories)

    async def _generate() -> AsyncGenerator[str, None]:
        start = time.monotonic()
        full_response = ""
        model_used = "claude"

        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            system = ctx.get("system_prompt", "You are a helpful AI assistant for a content creator.")

            extra_parts: list[str] = []
            if ctx.get("memory_summary"):
                extra_parts.append(f"[Creator context] {ctx['memory_summary']}")
            if ctx.get("history"):
                for msg in ctx["history"][-6:]:
                    extra_parts.append(f"[{msg['role']}] {msg['content']}")
            if extra_parts:
                system = system + "\n\n" + "\n".join(extra_parts)

            chosen_model = (
                settings.claude_complex_model
                if body.task_type in {"strategy", "novel_situation", "multi_step", "legal", "compliance", "reasoning", "planning"}
                else settings.claude_model
            )

            async with client.messages.stream(
                model=chosen_model,
                max_tokens=1024,
                system=system,
                messages=[{"role": "user", "content": body.prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    full_response += text
                    yield f"data: {json.dumps({'chunk': text})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            return

        latency_ms = int((time.monotonic() - start) * 1000)
        yield f"data: {json.dumps({'done': True, 'model_used': model_used, 'latency_ms': latency_ms})}\n\n"

        # Fire-and-forget: capture interaction + extract memories
        if body.consent:
            asyncio.create_task(capture_interaction(
                body.org_id, body.user_id, body.prompt, full_response,
                model_used, body.platform, consent_given=body.consent,
            ))
            asyncio.create_task(extract_and_save_memories(
                body.org_id, body.user_id, body.prompt, full_response,
            ))

    return StreamingResponse(_generate(), media_type="text/event-stream")


@app.post("/v1/route/batch")
async def batch_route(
    items: list[RouteRequest],
    x_internal_service: str | None = Header(default=None, alias="x-internal-service"),
):
    _check_auth(x_internal_service)

    async def _one(item: RouteRequest) -> dict:
        memories = await fetch_memory(item.org_id, item.user_id)
        ctx = dict(item.context or {})
        if memories:
            ctx["memory_summary"] = build_memory_summary(memories)
        result = await route(item.task_type, item.org_id, item.prompt, ctx)
        asyncio.create_task(capture_interaction(
            item.org_id, item.user_id, item.prompt,
            result["response"], result["model_used"],
            item.platform, item.consent,
        ))
        return result

    return await asyncio.gather(*[_one(i) for i in items])


if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.port, reload=True)
