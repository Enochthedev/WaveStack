"""
Task submission API — accepts tasks from external services (Twitch bot, Discord bot, etc.)
and routes them through the approval gate when the agent is in copilot mode.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from ..config import settings
from ..store import get_redis

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ── Request / Response models ─────────────────────────────────────────────────

class TaskSubmitRequest(BaseModel):
    org_id: str
    agent_type: str
    title: str
    description: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    urgency: str = "medium"


class TaskSubmitResponse(BaseModel):
    task_id: str
    approval_id: Optional[str]
    status: str


class TaskDetail(BaseModel):
    id: str
    org_id: str
    agent_type: str
    title: str
    status: str
    urgency: str
    core_task_id: Optional[str]
    approval_id: Optional[str]
    created_at: str
    updated_at: str
    payload: Optional[Dict[str, Any]] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

_TASK_TTL = 86_400 * 7  # 7 days


async def _store_task(task: Dict[str, Any]) -> None:
    redis = await get_redis()
    await redis.setex(f"task:{task['id']}", _TASK_TTL, json.dumps(task))
    # Index by org for listing
    await redis.sadd(f"org:{task['org_id']}:tasks", task["id"])
    # Reverse-lookup: approval_id → task_id (for callback from core-app)
    if task.get("approval_id"):
        await redis.setex(f"approval:{task['approval_id']}:task_id", _TASK_TTL, task["id"])


async def _get_task(task_id: str) -> Optional[Dict[str, Any]]:
    redis = await get_redis()
    raw = await redis.get(f"task:{task_id}")
    return json.loads(raw) if raw else None


async def _update_task(task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    task = await _get_task(task_id)
    if not task:
        return None
    task.update(updates)
    task["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
    redis = await get_redis()
    await redis.setex(f"task:{task_id}", _TASK_TTL, json.dumps(task))
    return task


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/submit", response_model=TaskSubmitResponse, status_code=201)
async def submit_task(body: TaskSubmitRequest) -> TaskSubmitResponse:
    """
    Accept a task submission from an external service.
    Calls core-app to create AgentTask + ApprovalRequest, then stores
    orchestrator-side state in Redis.
    """
    task_id = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()

    # Call core-app to create the DB records and notify the web UI
    approval_id: Optional[str] = None
    core_task_id: Optional[str] = None
    initial_status = "awaiting_approval"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.CORE_APP_URL}/internal/tasks",
                json={
                    "org_id": body.org_id,
                    "agent_type": body.agent_type,
                    "title": body.title,
                    "description": body.description,
                    "payload": body.payload,
                    "urgency": body.urgency,
                },
                headers={
                    "Content-Type": "application/json",
                    "x-internal-service": settings.INTERNAL_SERVICE_SECRET,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            core_task_id = data.get("task_id")
            approval_id = data.get("approval_id")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"core-app returned {exc.response.status_code}: {exc.response.text}",
        )
    except httpx.RequestError:
        # core-app unreachable — store locally only, UI won't show it
        initial_status = "queued"

    task = {
        "id": task_id,
        "org_id": body.org_id,
        "agent_type": body.agent_type,
        "title": body.title,
        "description": body.description,
        "payload": body.payload,
        "urgency": body.urgency,
        "status": initial_status,
        "core_task_id": core_task_id,
        "approval_id": approval_id,
        "created_at": now,
        "updated_at": now,
    }
    await _store_task(task)

    return TaskSubmitResponse(
        task_id=task_id,
        approval_id=approval_id,
        status=initial_status,
    )


@router.get("", tags=["Tasks"])
async def list_tasks(org_id: Optional[str] = None) -> Dict[str, Any]:
    redis = await get_redis()
    task_ids: list[str] = []
    if org_id:
        members = await redis.smembers(f"org:{org_id}:tasks")
        task_ids = list(members)
    # Fetch all task records
    tasks = []
    for tid in task_ids:
        raw = await redis.get(f"task:{tid}")
        if raw:
            tasks.append(json.loads(raw))
    tasks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return {"data": tasks, "meta": {"total": len(tasks)}}


@router.get("/{task_id}", tags=["Tasks"])
async def get_task(task_id: str) -> Dict[str, Any]:
    task = await _get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/cancel", tags=["Tasks"])
async def cancel_task(task_id: str) -> Dict[str, Any]:
    task = await _update_task(task_id, {"status": "cancelled"})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
