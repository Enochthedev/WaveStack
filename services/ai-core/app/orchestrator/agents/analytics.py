from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.ANALYTICS)
class AnalyticsAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.ANALYTICS

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.AUTOPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyse the creator's performance data and produce actionable insights.
        Pulls real data from core-app analytics endpoints.
        """
        period = input_data.get("period", "7d")
        focus = input_data.get("focus", "overview")  # overview|growth|revenue|content

        # Fetch real data from core-app
        overview = await self._core_get(f"/v1/analytics/overview?period={period}")
        growth_score = await self._core_get("/v1/analytics/growth-score")
        best_times = await self._core_get("/v1/analytics/best-times")

        data_summary = ""
        if overview:
            platforms = overview.get("platforms", [])
            data_summary += f"Platforms active: {len(platforms)}. "
        if growth_score:
            data_summary += (
                f"Growth score: {growth_score.get('score', 'N/A')}/100. "
                f"Working: {', '.join(growth_score.get('working', [])[:3])}. "
                f"Needs work: {', '.join(growth_score.get('notWorking', [])[:2])}. "
            )
        if best_times and isinstance(best_times, list) and len(best_times) > 0:
            data_summary += f"Best streaming time: {best_times[0].get('label', 'unknown')}. "

        prompt = (
            f"Analyse the creator's performance for the past {period}.\n"
            f"Focus area: {focus}\n"
            f"Data: {data_summary if data_summary else 'No data available yet — account is new.'}\n\n"
            f"Provide:\n"
            f"1. Top 3 insights (what's working, what's not)\n"
            f"2. 3 specific actionable recommendations\n"
            f"3. One metric to watch this week\n"
            f"4. Overall performance grade A-F with reasoning\n"
            f"Keep it concise and creator-friendly (not overly technical)."
        )

        response = await self._route(
            task_type="reasoning",
            prompt=prompt,
            context={"system_prompt": "You are a data analyst for content creators. Be concise, actionable, and encouraging."},
        )

        return {
            "task_id": task_id,
            "agent": "analytics",
            "period": period,
            "focus": focus,
            "ai_response": response,
            "raw_data": {
                "growth_score": growth_score,
                "best_times": best_times[:3] if isinstance(best_times, list) else [],
            },
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        # Pull current growth score to give context-aware answers
        growth = await self._core_get("/v1/analytics/growth-score")
        context_hint = ""
        if growth:
            context_hint = f"Current growth score: {growth.get('score')}/100. "

        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": f"You are the WaveStack analytics agent. {context_hint}Help the creator understand their performance data and make data-driven decisions."},
        )
