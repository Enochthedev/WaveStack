"""Tests for model-router service."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.config import settings

INTERNAL_HEADER = {"x-internal-service": settings.internal_service_secret}
client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_route_requires_internal_header():
    resp = client.post("/v1/route", json={"task_type": "caption", "org_id": "org-1", "prompt": "Test"})
    assert resp.status_code == 403


@patch("src.router.call_claude", new_callable=AsyncMock)
@patch("src.router.get_creator_model_info", new_callable=AsyncMock)
def test_complex_task_always_escalates_to_claude(mock_model_info, mock_claude):
    mock_model_info.return_value = None
    mock_claude.return_value = ("Claude response", 1.0)

    resp = client.post(
        "/v1/route",
        json={"task_type": "strategy", "org_id": "org-1", "prompt": "Plan my content strategy"},
        headers=INTERNAL_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "claude"
    assert data["escalated"] is True
    assert data["reason"] == "complex_task"
    mock_claude.assert_called_once()


@patch("src.router.call_together", new_callable=AsyncMock)
@patch("src.router.get_creator_model_info", new_callable=AsyncMock)
def test_routes_to_platform_base_when_no_personal_model(mock_model_info, mock_together):
    mock_model_info.return_value = None
    mock_together.return_value = ("Platform base response", 0.8)

    resp = client.post(
        "/v1/route",
        json={"task_type": "caption", "org_id": "org-1", "prompt": "Write a caption"},
        headers=INTERNAL_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "platform_base"
    assert data["escalated"] is False


@patch("src.router.call_claude", new_callable=AsyncMock)
@patch("src.router.call_together", new_callable=AsyncMock)
@patch("src.router.get_creator_model_info", new_callable=AsyncMock)
def test_escalates_to_claude_on_low_confidence(mock_model_info, mock_together, mock_claude):
    mock_model_info.return_value = None
    mock_together.return_value = ("Low confidence response", 0.3)  # Below threshold
    mock_claude.return_value = ("Claude response", 1.0)

    resp = client.post(
        "/v1/route",
        json={"task_type": "caption", "org_id": "org-1", "prompt": "Write a caption"},
        headers=INTERNAL_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "claude"
    assert data["escalated"] is True
    assert data["reason"] == "low_confidence"


@patch("src.router.call_together", new_callable=AsyncMock)
@patch("src.router.get_creator_model_info", new_callable=AsyncMock)
def test_routes_to_personal_model_when_ready(mock_model_info, mock_together):
    mock_model_info.return_value = {
        "status": "deployed",
        "confidenceScore": 0.85,
        "trainingExamplesCount": 600,
        "endpointUrl": "personal-model-endpoint",
    }
    mock_together.return_value = ("Personal model response", 0.9)

    resp = client.post(
        "/v1/route",
        json={"task_type": "chat_response", "org_id": "org-1", "prompt": "Hey what's up"},
        headers=INTERNAL_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "personal"
    assert data["escalated"] is False
