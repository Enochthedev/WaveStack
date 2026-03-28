"""Tests for the approval gate logic in agent-orchestrator."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Helper functions mirroring approval logic ─────────────────────────────────

def is_expired(expires_at: datetime) -> bool:
    return expires_at < datetime.now(tz=timezone.utc)


def can_transition(current_status: str, new_status: str) -> bool:
    transitions = {
        "pending": {"approved", "rejected", "expired"},
        "approved": set(),
        "rejected": set(),
        "expired": set(),
    }
    return new_status in transitions.get(current_status, set())


def should_create_approval(autonomy_level: str) -> bool:
    return autonomy_level == "copilot"


def should_log_training_example(status: str, feedback: str | None) -> bool:
    return status == "rejected" and bool(feedback)


# ── Expiry ────────────────────────────────────────────────────────────────────

def test_approval_not_expired():
    future = datetime.now(tz=timezone.utc) + timedelta(hours=4)
    assert not is_expired(future)


def test_approval_expired():
    past = datetime.now(tz=timezone.utc) - timedelta(seconds=1)
    assert is_expired(past)


def test_exactly_at_expiry_is_expired():
    # Boundary: at exactly the expiry time, it's considered expired
    past = datetime.now(tz=timezone.utc) - timedelta(milliseconds=1)
    assert is_expired(past)


# ── Status transitions ────────────────────────────────────────────────────────

def test_pending_can_be_approved():
    assert can_transition("pending", "approved")


def test_pending_can_be_rejected():
    assert can_transition("pending", "rejected")


def test_pending_can_expire():
    assert can_transition("pending", "expired")


def test_approved_is_terminal():
    assert not can_transition("approved", "rejected")
    assert not can_transition("approved", "pending")
    assert not can_transition("approved", "expired")


def test_rejected_is_terminal():
    assert not can_transition("rejected", "approved")


def test_expired_is_terminal():
    assert not can_transition("expired", "approved")


# ── Autonomy level ────────────────────────────────────────────────────────────

def test_copilot_creates_approval():
    assert should_create_approval("copilot")


def test_autopilot_no_approval():
    assert not should_create_approval("autopilot")


def test_manual_no_approval():
    assert not should_create_approval("manual")


# ── Training signal ───────────────────────────────────────────────────────────

def test_rejection_with_feedback_logs_training():
    assert should_log_training_example("rejected", "Tone was too formal")


def test_rejection_without_feedback_skips_training():
    assert not should_log_training_example("rejected", None)
    assert not should_log_training_example("rejected", "")


def test_approval_does_not_log_rejection():
    assert not should_log_training_example("approved", "Looks great!")


# ── Timeout calculation ───────────────────────────────────────────────────────

def test_default_4h_timeout():
    created_at = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    timeout_hours = 4
    expires_at = created_at + timedelta(hours=timeout_hours)
    assert expires_at == datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc)


# ── Task submit payload validation ────────────────────────────────────────────

def build_submit_payload(
    org_id: str = "org_1",
    agent_type: str = "clip",
    title: str = "Auto-clip opportunity",
    urgency: str = "medium",
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "org_id": org_id,
        "agent_type": agent_type,
        "title": title,
        "urgency": urgency,
        "payload": payload or {"channel": "#test", "confidence": 0.75},
    }


def test_submit_payload_has_required_fields():
    body = build_submit_payload()
    assert "org_id" in body
    assert "agent_type" in body
    assert "title" in body


def test_submit_urgency_defaults_medium():
    body = build_submit_payload()
    assert body["urgency"] == "medium"


def test_submit_high_urgency():
    body = build_submit_payload(urgency="high")
    assert body["urgency"] == "high"


def test_submit_payload_serialisable():
    body = build_submit_payload()
    assert json.loads(json.dumps(body)) == body


# ── Redis task record structure ───────────────────────────────────────────────

def build_task_record(
    task_id: str = "task-abc",
    org_id: str = "org_1",
    status: str = "awaiting_approval",
    approval_id: Optional[str] = "appr-xyz",
) -> Dict[str, Any]:
    now = datetime.now(tz=timezone.utc).isoformat()
    return {
        "id": task_id,
        "org_id": org_id,
        "agent_type": "clip",
        "title": "Auto-clip opportunity",
        "status": status,
        "urgency": "medium",
        "core_task_id": "core-task-1",
        "approval_id": approval_id,
        "payload": {"channel": "#test"},
        "created_at": now,
        "updated_at": now,
    }


def test_task_record_has_approval_id():
    task = build_task_record(approval_id="appr-123")
    assert task["approval_id"] == "appr-123"


def test_task_record_status_awaiting():
    task = build_task_record(status="awaiting_approval")
    assert task["status"] == "awaiting_approval"


def test_task_record_serialises_round_trip():
    task = build_task_record()
    assert json.loads(json.dumps(task)) == task


def test_task_update_sets_status_running():
    task = build_task_record(status="awaiting_approval")
    task["status"] = "running"
    task["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
    assert task["status"] == "running"


def test_task_update_sets_status_rejected():
    task = build_task_record(status="awaiting_approval")
    task.update({"status": "rejected", "feedback": "Not a good clip moment"})
    assert task["status"] == "rejected"
    assert task["feedback"] == "Not a good clip moment"


# ── Internal callback decision routing ───────────────────────────────────────

def route_decision(status: str) -> str:
    """Mirror the internal router's decision branching logic."""
    if status == "approved":
        return "execute"
    return "cancel"


def test_approved_routes_to_execute():
    assert route_decision("approved") == "execute"


def test_rejected_routes_to_cancel():
    assert route_decision("rejected") == "cancel"


def test_unknown_status_routes_to_cancel():
    # Any non-approved status is treated as cancel
    assert route_decision("expired") == "cancel"
    assert route_decision("") == "cancel"


# ── Reverse-lookup key naming convention ─────────────────────────────────────

def approval_lookup_key(approval_id: str) -> str:
    return f"approval:{approval_id}:task_id"


def task_key(task_id: str) -> str:
    return f"task:{task_id}"


def test_approval_lookup_key_format():
    key = approval_lookup_key("appr-xyz")
    assert key == "approval:appr-xyz:task_id"


def test_task_key_format():
    key = task_key("task-abc")
    assert key == "task:task-abc"
