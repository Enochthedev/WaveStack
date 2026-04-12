from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import httpx

from .types import AgentType, AutonomyLevel

logger = logging.getLogger(__name__)

MODEL_ROUTER_URL = os.getenv("MODEL_ROUTER_URL", "http://model-router:3700")
CORE_APP_URL = os.getenv("CORE_APP_URL", "http://core-app:3000/api")
INTERNAL_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "dev-internal-secret")


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents in the orchestrator.
    """

    def __init__(
        self,
        org_id: str,
        config: Dict[str, Any],
        autonomy_level: AutonomyLevel = AutonomyLevel.COPILOT,
        allowed_skills: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
    ):
        self.org_id = org_id
        self.config = config
        self.autonomy_level = autonomy_level
        self.allowed_skills = allowed_skills or config.get("allowedSkills") or []
        self.system_prompt = system_prompt or config.get("systemPrompt")

    @property
    @abstractmethod
    def agent_type(self) -> AgentType:
        pass

    @property
    @abstractmethod
    def default_autonomy(self) -> AutonomyLevel:
        pass

    @abstractmethod
    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def handle_message(self, session_id: str, message: str) -> str:
        pass

    # ── Shared helpers ────────────────────────────────────────────────────────

    async def _route(
        self,
        task_type: str,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Call model-router for an AI response. Returns the response text.
        Falls back to a descriptive error string so tasks never hard-crash.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{MODEL_ROUTER_URL}/v1/route",
                    headers={"x-internal-service": INTERNAL_SECRET},
                    json={
                        "task_type": task_type,
                        "org_id": self.org_id,
                        "prompt": prompt,
                        "user_id": user_id,
                        "platform": "agent",
                        "context": context or {},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("response", "")
        except Exception as exc:
            logger.warning("[%s] model-router call failed: %s", self.agent_type, exc)
            return f"[model-router unavailable: {exc}]"

    async def _core_get(self, path: str) -> Any:
        """GET from core-app internal API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{CORE_APP_URL}{path}",
                    headers={
                        "x-org-id": self.org_id,
                        "x-internal-service": INTERNAL_SECRET,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()
        except Exception as exc:
            logger.debug("[%s] core-app GET %s failed: %s", self.agent_type, path, exc)
        return None

    async def _core_post(self, path: str, body: Dict[str, Any]) -> Any:
        """POST to core-app internal API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{CORE_APP_URL}{path}",
                    headers={
                        "x-org-id": self.org_id,
                        "x-internal-service": INTERNAL_SECRET,
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
                if resp.status_code in (200, 201):
                    return resp.json()
        except Exception as exc:
            logger.debug("[%s] core-app POST %s failed: %s", self.agent_type, path, exc)
        return None
