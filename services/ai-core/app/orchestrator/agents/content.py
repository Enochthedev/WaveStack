from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.CONTENT)
class ContentAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.CONTENT

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.COPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Draft content (captions, titles, post copy) for a given topic or asset.
        Queues the draft for creator review via core-app.
        """
        topic = input_data.get("topic", "")
        platform = input_data.get("platform", "twitter")
        tone = input_data.get("tone", "casual")
        asset_id = input_data.get("asset_id")

        # Fetch creator context (recent posts, performance data) from core-app
        analytics = await self._core_get("/v1/analytics/growth-score")
        context_hint = ""
        if analytics:
            context_hint = f"Creator growth score: {analytics.get('score')}. "
            if analytics.get("working"):
                context_hint += f"What's working: {', '.join(analytics['working'][:3])}. "

        prompt = (
            f"Draft content for platform: {platform}\n"
            f"Topic/asset: {topic}\n"
            f"Tone: {tone}\n"
            f"{context_hint}\n"
            f"Generate:\n"
            f"1. Main post copy (platform-appropriate length)\n"
            f"2. 5 relevant hashtags\n"
            f"3. Best time to post suggestion\n"
            f"4. A/B variant (slightly different angle)\n"
            f"Respond as JSON: {{copy, hashtags, best_time, variant}}"
        )

        response = await self._route(
            task_type="content",
            prompt=prompt,
            context={"system_prompt": f"You are a {platform} content strategist for gaming/streaming creators."},
        )

        # Queue the draft for review
        if asset_id:
            await self._core_post("/v1/queue", {
                "assetId": asset_id,
                "title": topic[:120],
                "caption": response[:500] if response else "",
                "platforms": [platform],
                "aiGenerated": True,
                "approvalRequired": True,
            })

        return {
            "task_id": task_id,
            "agent": "content",
            "ai_response": response,
            "platform": platform,
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack content agent. Help draft posts, captions, and content ideas for the creator."},
        )
