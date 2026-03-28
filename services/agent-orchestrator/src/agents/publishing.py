from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.PUBLISHING)
class PublishingAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.PUBLISHING

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.COPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimise the publishing schedule and suggest the best time/platform for a queued item.
        Can also create queue items directly via core-app.
        """
        queue_item_id = input_data.get("queue_item_id")
        platforms = input_data.get("platforms", [])
        content_type = input_data.get("content_type", "clip")

        # Get best posting times from analytics
        best_times = await self._core_get("/v1/analytics/best-times")
        best_time_hint = ""
        if best_times and isinstance(best_times, list) and len(best_times) > 0:
            top = best_times[0]
            best_time_hint = f"Best posting time: {top.get('label', 'unknown')} ({top.get('avgViewers', 0)} avg viewers). "

        prompt = (
            f"Optimise the publishing schedule for a {content_type}.\n"
            f"Target platforms: {', '.join(platforms) if platforms else 'all connected'}\n"
            f"{best_time_hint}\n"
            f"Provide:\n"
            f"1. Recommended publish time (ISO 8601)\n"
            f"2. Platform priority order\n"
            f"3. Cross-posting strategy (tweak copy per platform)\n"
            f"4. Expected reach score 0-10\n"
            f"Respond as JSON: {{schedule_at, platform_order, strategy, reach_score}}"
        )

        response = await self._route(
            task_type="strategy",
            prompt=prompt,
            context={"system_prompt": "You are a publishing strategist who maximises reach for streaming creators."},
        )

        return {
            "task_id": task_id,
            "agent": "publishing",
            "queue_item_id": queue_item_id,
            "ai_response": response,
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack publishing agent. Help schedule and optimise content across platforms."},
        )
