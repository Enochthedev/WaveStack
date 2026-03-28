from __future__ import annotations

import logging
from typing import Any, Dict

from ..agents.registry import AgentRegistry
from ..agents.types import AgentType
from ..config import settings

logger = logging.getLogger(__name__)


class ExecutorEngine:
    """
    Executes task steps via the appropriate agent.
    Each agent receives the real org_id from the task, its DB config,
    and uses the model-router for all AI calls.
    """

    async def execute_task_step(
        self,
        agent_type: AgentType,
        task_id: str,
        input_data: Dict[str, Any],
        org_id: str = "system",
    ) -> Dict[str, Any]:
        """
        Routes the task payload to the specific Agent implementation.
        """
        agent_config = await self._load_agent_config(org_id, agent_type)

        agent_class = AgentRegistry.get_agent_class(agent_type)
        agent_instance = agent_class(
            org_id=org_id,
            config=agent_config,
        )

        logger.info("Executing task %s (type=%s org=%s)", task_id, agent_type, org_id)
        return await agent_instance.process_task(task_id, input_data)

    async def _load_agent_config(self, org_id: str, agent_type: AgentType) -> Dict[str, Any]:
        """
        Fetch agent config from core-app. Falls back to empty config on error.
        """
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{settings.CORE_APP_URL}/v1/agents/config",
                    headers={
                        "x-org-id": org_id,
                        "x-internal-service": settings.INTERNAL_SERVICE_SECRET,
                    },
                )
                if resp.status_code == 200:
                    configs = resp.json().get("data", [])
                    for cfg in configs:
                        if cfg.get("agentType") == agent_type.value:
                            return cfg
        except Exception as exc:
            logger.debug("Could not load agent config for %s/%s: %s", org_id, agent_type, exc)
        return {}
