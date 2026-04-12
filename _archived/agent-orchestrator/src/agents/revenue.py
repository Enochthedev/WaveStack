from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.REVENUE)
class RevenueAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.REVENUE

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.MANUAL

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyse revenue streams and suggest monetisation improvements.
        Pulls real sponsor + revenue data from core-app.
        """
        action = input_data.get("action", "revenue_report")  # revenue_report | sponsor_pitch

        revenue = await self._core_get("/v1/revenue/overview")
        sponsors = await self._core_get("/v1/revenue/sponsors?status=active")

        revenue_summary = ""
        if revenue:
            revenue_summary = (
                f"This month: ${revenue.get('month', 0) / 100:.2f}. "
                f"Forecast: ${revenue.get('forecast', 0) / 100:.2f}. "
            )
            breakdown = revenue.get("breakdown", {})
            if breakdown:
                top_source = max(breakdown, key=lambda k: breakdown[k]) if breakdown else "unknown"
                revenue_summary += f"Top revenue source: {top_source}. "

        sponsor_summary = ""
        if sponsors and sponsors.get("data"):
            active = sponsors["data"]
            sponsor_summary = f"Active sponsors: {len(active)}. "
            if active:
                names = [s.get("name", "") for s in active[:3]]
                sponsor_summary += f"Partners: {', '.join(names)}. "

        if action == "sponsor_pitch":
            prompt = (
                f"Draft a sponsor outreach strategy.\n"
                f"{revenue_summary}{sponsor_summary}\n\n"
                f"Provide:\n"
                f"1. Ideal sponsor categories for this creator's niche\n"
                f"2. A 3-sentence pitch template\n"
                f"3. Suggested rate card based on audience size\n"
                f"4. Top 5 companies to approach (realistic for a mid-tier creator)\n"
                f"Respond as JSON: {{categories, pitch_template, rate_card, targets}}"
            )
        else:
            prompt = (
                f"Analyse the creator's revenue and suggest improvements.\n"
                f"{revenue_summary}{sponsor_summary}\n\n"
                f"Provide:\n"
                f"1. Revenue health assessment\n"
                f"2. Top 3 untapped revenue opportunities\n"
                f"3. One quick win this week (achievable in < 7 days)\n"
                f"4. 90-day revenue growth plan"
            )

        response = await self._route(
            task_type="strategy",
            prompt=prompt,
            context={"system_prompt": "You are a creator monetisation strategist. Be realistic and specific — avoid generic advice."},
        )

        return {
            "task_id": task_id,
            "agent": "revenue",
            "action": action,
            "ai_response": response,
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack revenue agent. Help with sponsorships, Patreon, merch, and monetisation strategy."},
        )
