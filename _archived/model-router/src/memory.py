"""
Memory & Data Capture for Model Router

- Memory:  per-org/user key-value store fetched before routing, updated after.
- Capture: every interaction is saved as a TrainingExample (respecting opt-out).
"""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from .config import settings

logger = logging.getLogger(__name__)

CORE = settings.core_api_url
SECRET = settings.internal_service_secret

# Max memory entries per org — LRU eviction handled by the put endpoint
MAX_MEMORY_ENTRIES = 50


def _headers(org_id: str) -> dict[str, str]:
    return {"x-org-id": org_id, "x-internal-service": SECRET}


# ── Memory ────────────────────────────────────────────────────────────────────

async def fetch_memory(org_id: str, user_id: str | None = None) -> dict[str, str]:
    """
    Fetch all memory entries for an org (optionally scoped to a user).
    Returns a flat {key: value} dict.  Falls back to {} on any error.
    """
    params = {"userId": user_id} if user_id else {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{CORE}/v1/memory",
                headers=_headers(org_id),
                params=params,
            )
            if resp.status_code == 200:
                entries = resp.json()  # [{ key, value }]
                return {e["key"]: e["value"] for e in entries}
    except Exception as exc:
        logger.debug("memory fetch failed: %s", exc)
    return {}


def build_memory_summary(memories: dict[str, str]) -> str:
    """Convert flat memory dict to a compact context string for model prompts."""
    if not memories:
        return ""
    lines = [f"{k}: {v}" for k, v in memories.items()]
    return "Creator context — " + "; ".join(lines)


async def upsert_memory(
    org_id: str,
    key: str,
    value: str,
    user_id: str | None = None,
    source: str = "auto",
) -> None:
    """Save or update a single memory entry. Fire-and-forget; swallows errors."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.put(
                f"{CORE}/v1/memory",
                headers=_headers(org_id),
                json={"key": key, "value": value, "userId": user_id, "source": source},
            )
    except Exception as exc:
        logger.debug("memory upsert failed: %s", exc)


async def extract_and_save_memories(
    org_id: str,
    user_id: str | None,
    prompt: str,
    response: str,
) -> None:
    """
    Use Claude to extract structured memories from each interaction.
    Saves facts worth remembering: schedule, preferences, tone, goals, etc.
    Only runs when there's meaningful content (skips very short exchanges).
    """
    combined = f"{prompt} {response}".strip()
    if len(combined) < 80:
        # Too short to extract anything meaningful
        return

    extraction_prompt = (
        "Extract memorable facts from this creator interaction.\n"
        "Only extract facts that are genuinely worth remembering for future conversations.\n"
        "Return a JSON array of objects: [{\"key\": \"...\", \"value\": \"...\"}]\n"
        "Keys should be short and descriptive (e.g. stream_schedule, favourite_game, tone_preference, content_goal).\n"
        "Values should be concise (max 120 chars).\n"
        "Return an empty array [] if nothing is worth saving.\n"
        "DO NOT invent facts. Only extract what is explicitly stated.\n\n"
        f"Interaction:\nUser: {prompt[:600]}\nAssistant: {response[:600]}"
    )

    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        msg = await client.messages.create(
            model=settings.claude_model,
            max_tokens=256,
            system="You are a memory extraction assistant. Respond only with valid JSON.",
            messages=[{"role": "user", "content": extraction_prompt}],
        )
        raw = msg.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        facts: list[dict[str, str]] = json.loads(raw)
        if not isinstance(facts, list):
            return

        for fact in facts[:5]:  # cap at 5 facts per interaction
            key = str(fact.get("key", "")).strip()
            value = str(fact.get("value", "")).strip()
            if key and value and len(key) <= 60 and len(value) <= 200:
                await upsert_memory(org_id, key, value, user_id, source="auto")
                logger.debug("Saved memory [%s/%s]: %s = %s", org_id, user_id, key, value[:40])

    except (json.JSONDecodeError, IndexError):
        # Model returned non-JSON — skip silently
        pass
    except Exception as exc:
        logger.debug("memory extraction failed: %s", exc)


# ── Training data capture ─────────────────────────────────────────────────────

async def capture_interaction(
    org_id: str,
    user_id: str | None,
    prompt: str,
    response: str,
    model_used: str,
    platform: str | None = None,
    example_type: str = "chat_response",
    consent_given: bool = True,
) -> None:
    """
    Save an interaction as a TrainingExample.
    Skipped if consent_given is False (user opted out).
    Fire-and-forget; swallows errors so routing is never blocked.
    """
    if not consent_given:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{CORE}/v1/training/examples",
                headers=_headers(org_id),
                json={
                    "orgId": org_id,
                    "userId": user_id,
                    "exampleType": example_type,
                    "prompt": prompt,
                    "response": response,
                    "modelUsed": model_used,
                    "platform": platform,
                    "source": "auto",
                    "consentGiven": consent_given,
                },
            )
    except Exception as exc:
        logger.debug("training capture failed: %s", exc)
