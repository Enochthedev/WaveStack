"""
Internal endpoints — called by core-app to notify the orchestrator of
approval decisions.  NOT exposed via the public /api/v1 prefix.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..api.tasks import _get_task, _update_task
from ..orchestration.executor import ExecutorEngine
from ..agents.types import AgentType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])

executor = ExecutorEngine()


# ── Models ────────────────────────────────────────────────────────────────────

class ApprovalDecision(BaseModel):
    status: str           # "approved" | "rejected"
    feedback: Optional[str] = None
    taskId: Optional[str] = None   # core-app AgentTask id (optional extra context)


# ── Auth helper ───────────────────────────────────────────────────────────────

def _verify_internal(secret: Optional[str]) -> None:
    if secret != settings.INTERNAL_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Internal access only")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/approvals/{approval_id}")
async def handle_approval_decision(
    approval_id: str,
    body: ApprovalDecision,
    x_internal_service: Optional[str] = Header(default=None),
) -> dict:
    """
    Called by core-app after a creator approves or rejects an approval request.
    Finds the matching orchestrator task by approval_id, updates its status,
    and triggers execution if approved.
    """
    _verify_internal(x_internal_service)

    # Find orchestrator task by approval_id
    task = await _find_task_by_approval(approval_id)
    if not task:
        # Unknown approval — could be from a different source; return 200 so
        # core-app doesn't retry endlessly.
        logger.warning("Received decision for unknown approval_id=%s", approval_id)
        return {"status": "ignored", "reason": "unknown_approval"}

    task_id = task["id"]

    if body.status == "approved":
        updated = await _update_task(task_id, {"status": "running"})
        logger.info("Task %s approved, dispatching execution", task_id)
        # Fire-and-forget execution — errors are captured in task state
        try:
            agent_type = AgentType(task.get("agent_type", "clip"))
            result = await executor.execute_task_step(
                agent_type,
                task_id,
                task.get("payload") or {},
                org_id=task.get("org_id", "system"),
            )
            await _update_task(task_id, {"status": "completed", "output": result})
            logger.info("Task %s completed successfully", task_id)
        except Exception as exc:
            logger.error("Task %s failed: %s", task_id, exc)
            await _update_task(task_id, {"status": "failed", "error": str(exc)})
    else:
        await _update_task(task_id, {
            "status": "rejected",
            "feedback": body.feedback,
        })
        logger.info("Task %s rejected. Feedback: %s", task_id, body.feedback)

    return {"status": "ok", "task_id": task_id}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _find_task_by_approval(approval_id: str):
    """
    Scan Redis for a task whose approval_id matches.
    In production this could be a secondary index; for now we use a reverse
    lookup key set at submit time.
    """
    from ..store import get_redis
    redis = await get_redis()
    # Direct reverse-lookup key written at task submission time
    task_id = await redis.get(f"approval:{approval_id}:task_id")
    if task_id:
        return await _get_task(task_id)
    return None
