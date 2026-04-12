from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.GROWTH)
class GrowthAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.GROWTH

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.COPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a growth strategy: trending topics, SEO, posting schedule, collaboration ideas.
        Uses real trending data from core-app competitors/trends endpoints.
        """
        goal = input_data.get("goal", "grow followers")
        platform = input_data.get("platform", "all")
        niche = input_data.get("niche", "gaming")

        # Pull trending data
        trending = await self._core_get("/v1/competitors/trending")
        seo_trending = await self._core_get("/v1/seo/trending")
        competitors = await self._core_get("/v1/competitors")

        trends_context = ""
        if trending and isinstance(trending, list):
            top_games = [t.get("game") for t in trending[:3]]
            trends_context += f"Trending games: {', '.join(top_games)}. "
        if seo_trending and isinstance(seo_trending, list):
            top_keywords = [k.get("keyword") for k in seo_trending[:5] if k.get("keyword")]
            trends_context += f"Hot keywords: {', '.join(top_keywords)}. "

        prompt = (
            f"Build a 7-day growth strategy for a {niche} creator.\n"
            f"Goal: {goal}\n"
            f"Platform focus: {platform}\n"
            f"Current trends: {trends_context if trends_context else 'No trend data yet.'}\n\n"
            f"Provide:\n"
            f"1. Daily content plan (day 1-7, one post per day with topic)\n"
            f"2. 3 collaboration/raid suggestions (type of creator to collab with)\n"
            f"3. SEO titles/tags to target this week\n"
            f"4. One growth experiment to try\n"
            f"Be specific and actionable."
        )

        response = await self._route(
            task_type="strategy",
            prompt=prompt,
            context={"system_prompt": "You are a growth strategist for streaming creators. Produce concrete, executable plans."},
        )

        return {
            "task_id": task_id,
            "agent": "growth",
            "goal": goal,
            "platform": platform,
            "ai_response": response,
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack growth agent. Help with SEO, trends, collaboration strategies, and audience growth tactics."},
        )
