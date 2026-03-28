"""
Model Router — WaveStack AI routing

Routing logic (in order):
1. Personal model  — everyone starts with the shared base model (Together AI).
                     If the creator has a deployed fine-tune, that endpoint is used instead.
                     This handles all day-to-day interactions: chat, replies, captions.
2. Claude          — the "brain". Only called when:
                       a) task_type is in BRAIN_TASK_TYPES (complex reasoning)
                       b) personal model returns confidence below threshold on an important task
                     Claude is NEVER a generic fallback.
3. OpenRouter      — safety net only. Called when personal model throws an error
                     (rate limit, timeout, unavailable). Keeps the bot alive.
"""
from __future__ import annotations

import json
import time
from typing import Any

import httpx
import redis.asyncio as aioredis

from .config import settings

# Tasks that always go to Claude — reasoning, planning, novel situations
BRAIN_TASK_TYPES = {"strategy", "novel_situation", "multi_step", "legal", "compliance", "reasoning", "planning"}

# Tasks where low confidence should trigger Claude escalation (important enough to get right)
ESCALATE_ON_LOW_CONFIDENCE = {"strategy", "legal", "compliance", "multi_step"}

redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return redis_client


async def get_personal_model_endpoint(org_id: str) -> str:
    """
    Return the model endpoint for this org.
    - If they have a deployed fine-tune → their personal endpoint URL
    - Otherwise → the shared base personal model (platform_base_model)
    Both are Together AI; the base model is what all users start with.
    Cached in Redis for 60s.
    """
    redis = await get_redis()
    cache_key = f"creator_model:{org_id}"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        if data.get("status") == "deployed" and data.get("endpointUrl"):
            return data["endpointUrl"]
        return settings.platform_base_model

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.core_api_url}/api/v1/creator-model",
                headers={
                    "x-org-id": org_id,
                    "x-internal-service": settings.internal_service_secret,
                },
                timeout=5.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                await redis.setex(cache_key, 60, json.dumps(data))
                if data.get("status") == "deployed" and data.get("endpointUrl"):
                    return data["endpointUrl"]
        except Exception:
            pass
    return settings.platform_base_model


def is_brain_task(task_type: str) -> bool:
    return task_type.lower() in BRAIN_TASK_TYPES


def should_escalate_on_low_confidence(task_type: str) -> bool:
    return task_type.lower() in ESCALATE_ON_LOW_CONFIDENCE


async def call_personal_model(
    endpoint: str, prompt: str, context: dict[str, Any]
) -> tuple[str, float]:
    """
    Call the personal model (base or fine-tuned) via Together AI.
    Includes memory and personality context.
    """
    messages = []
    if context.get("memory_summary"):
        messages.append({"role": "system", "content": f"[Memory] {context['memory_summary']}"})
    messages.append({
        "role": "system",
        "content": context.get("system_prompt", "You are a helpful AI for a content creator."),
    })
    if context.get("history"):
        messages.extend(context["history"])
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.together.xyz/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.together_api_key}"},
            json={"model": endpoint, "messages": messages, "max_tokens": 512, "temperature": 0.7},
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return text, 0.78


async def call_claude(
    prompt: str, context: dict[str, Any], model: str | None = None
) -> tuple[str, float]:
    """
    Call Claude — the brain. Used for complex reasoning, planning, and novel situations.
    Also used when personal model signals it needs escalation.
    """
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    chosen_model = model or settings.claude_model
    system = context.get("system_prompt", "You are an expert AI assistant for a content creator.")

    extra = []
    if context.get("memory_summary"):
        extra.append(f"[Creator context] {context['memory_summary']}")
    if context.get("history"):
        # Flatten recent history into system context for Claude
        for msg in context["history"][-6:]:
            extra.append(f"[{msg['role']}] {msg['content']}")
    if extra:
        system = system + "\n\n" + "\n".join(extra)

    msg = await client.messages.create(
        model=chosen_model,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text, 1.0


async def call_openrouter(
    model: str, prompt: str, context: dict[str, Any]
) -> tuple[str, float]:
    """
    Call OpenRouter — safety net only (personal model error/unavailable).
    OpenAI-compatible API, access to hundreds of models with one key.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "https://wavestack.io",
                "X-Title": "WaveStack",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": context.get("system_prompt", "You are a helpful AI.")},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 512,
                "temperature": 0.7,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"], 0.72


async def route(
    task_type: str,
    org_id: str,
    prompt: str,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Route a generation request to the appropriate model.
    Returns: { response, model_used, confidence, escalated, reason, latency_ms }

    All bots and agents call this endpoint — Twitch bot, Discord bot, agents, etc.
    """
    ctx = context or {}
    start = time.monotonic()

    # ── Brain tasks: always go to Claude ─────────────────────────────────────
    if is_brain_task(task_type):
        response, confidence = await call_claude(prompt, ctx, settings.claude_complex_model)
        return {
            "response": response,
            "model_used": "claude",
            "confidence": confidence,
            "escalated": True,
            "reason": "brain_task",
            "latency_ms": int((time.monotonic() - start) * 1000),
        }

    # ── Personal model: primary for all day-to-day ───────────────────────────
    # Every org starts with the shared base model; promoted to their fine-tune when deployed.
    endpoint = await get_personal_model_endpoint(org_id)
    personal_error = False
    try:
        response, confidence = await call_personal_model(endpoint, prompt, ctx)

        # Escalate to Claude if confidence is low on an important task type
        if confidence < settings.escalation_confidence_threshold and should_escalate_on_low_confidence(task_type):
            response, confidence = await call_claude(prompt, ctx)
            return {
                "response": response,
                "model_used": "claude",
                "confidence": confidence,
                "escalated": True,
                "reason": "low_confidence_escalation",
                "latency_ms": int((time.monotonic() - start) * 1000),
            }

        model_label = "personal_finetuned" if endpoint != settings.platform_base_model else "personal_base"
        return {
            "response": response,
            "model_used": model_label,
            "confidence": confidence,
            "escalated": False,
            "latency_ms": int((time.monotonic() - start) * 1000),
        }
    except Exception:
        personal_error = True

    # ── OpenRouter: safety net (personal model error only) ───────────────────
    if personal_error and settings.openrouter_api_key:
        try:
            response, confidence = await call_openrouter(settings.openrouter_base_model, prompt, ctx)
            return {
                "response": response,
                "model_used": "openrouter_fallback",
                "confidence": confidence,
                "escalated": False,
                "reason": "personal_model_error",
                "latency_ms": int((time.monotonic() - start) * 1000),
            }
        except Exception:
            pass

    # ── Last resort: Claude (should almost never reach here) ─────────────────
    response, confidence = await call_claude(prompt, ctx)
    return {
        "response": response,
        "model_used": "claude",
        "confidence": confidence,
        "escalated": True,
        "reason": "all_models_failed",
        "latency_ms": int((time.monotonic() - start) * 1000),
    }
