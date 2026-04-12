from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.COMMUNITY)
class CommunityAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.COMMUNITY

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.MANUAL

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Draft community engagement responses: DM replies, shoutouts, milestone celebrations.
        Always runs in MANUAL mode — creator must approve before sending.
        """
        action = input_data.get("action", "draft_responses")
        platform = input_data.get("platform", "discord")

        # Fetch top community members and recent chat
        members = await self._core_get("/v1/community/members?limit=10&tier=subscriber")
        milestones = await self._core_get("/v1/community/milestones")

        member_context = ""
        if members and members.get("data"):
            top = members["data"][:5]
            names = [m.get("username", "") for m in top]
            member_context = f"Top subscribers: {', '.join(names)}. "

        milestone_context = ""
        if milestones and isinstance(milestones, list):
            upcoming = [m for m in milestones if not m.get("reachedAt")][:2]
            if upcoming:
                milestone_context = f"Upcoming milestones: {', '.join([m.get('title', '') for m in upcoming])}. "

        prompt = (
            f"Draft community engagement content for {platform}.\n"
            f"Action: {action}\n"
            f"{member_context}{milestone_context}\n\n"
            f"Draft:\n"
            f"1. A warm community update post (highlight active members)\n"
            f"2. 3 personalised thank-you messages for top supporters\n"
            f"3. A milestone hype message (if any milestones upcoming)\n"
            f"Keep the tone authentic and grateful — avoid sounding robotic."
        )

        response = await self._route(
            task_type="content",
            prompt=prompt,
            context={"system_prompt": "You are the creator's community manager. Write warm, authentic messages that feel personal."},
        )

        return {
            "task_id": task_id,
            "agent": "community",
            "action": action,
            "platform": platform,
            "ai_response": response,
            "requires_approval": True,  # community actions always need creator sign-off
            "status": "awaiting_approval",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack community agent. Help draft DMs, shoutouts, Discord announcements, and engagement strategies."},
        )
