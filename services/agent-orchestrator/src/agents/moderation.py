from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.MODERATION)
class ModerationAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.MODERATION

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.AUTOPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Review flagged messages and update moderation rules based on patterns.
        Pulls flagged content from core-app, generates rule suggestions.
        """
        action = input_data.get("action", "review_flagged")  # review_flagged | suggest_rules

        if action == "suggest_rules":
            # Analyse recent flagged messages and suggest new rules
            flagged = await self._core_get("/v1/moderation/flagged?limit=50&status=pending")
            stats = await self._core_get("/v1/moderation/stats")

            flagged_summary = ""
            if flagged and flagged.get("data"):
                reasons = {}
                for msg in flagged["data"][:20]:
                    reason = msg.get("reason", "unknown")
                    reasons[reason] = reasons.get(reason, 0) + 1
                flagged_summary = f"Recent violations: {reasons}. "

            stats_summary = ""
            if stats:
                stats_summary = (
                    f"Flagged today: {stats.get('flaggedToday', 0)}. "
                    f"Pending review: {stats.get('pendingReview', 0)}. "
                    f"False positive rate: {stats.get('falsePositiveRate', 0):.1%}. "
                )

            prompt = (
                f"Review moderation patterns and suggest rule improvements.\n"
                f"{flagged_summary}{stats_summary}\n\n"
                f"Suggest:\n"
                f"1. 3 new keyword rules to add (pattern, action, reason)\n"
                f"2. Any rules that may be too aggressive (high false positives)\n"
                f"3. Overall moderation health assessment\n"
                f"Respond as JSON: {{new_rules: [{{name, type, pattern, action}}], review_rules: [], assessment}}"
            )

            response = await self._route(
                task_type="reasoning",
                prompt=prompt,
                context={"system_prompt": "You are a community moderation expert for live streamers."},
            )
        else:
            # Default: summarise pending flagged messages
            flagged = await self._core_get("/v1/moderation/flagged?limit=20&status=pending")
            count = flagged.get("meta", {}).get("total", 0) if flagged else 0

            response = f"There are {count} messages pending moderation review."
            if count > 0 and flagged.get("data"):
                examples = [m.get("content", "")[:80] for m in flagged["data"][:3]]
                response += f" Recent examples: {'; '.join(examples)}"

        return {
            "task_id": task_id,
            "agent": "moderation",
            "action": action,
            "ai_response": response,
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack moderation agent. Help review flagged content, update rules, and maintain a positive community environment."},
        )
