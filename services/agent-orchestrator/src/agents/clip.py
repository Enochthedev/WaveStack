from __future__ import annotations

from typing import Any, Dict

from .base import BaseAgent
from .registry import AgentRegistry
from .types import AgentType, AutonomyLevel


@AgentRegistry.register(AgentType.CLIP)
class ClipAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.CLIP

    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.COPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyse a stream moment and decide whether it's worth clipping.
        Returns a proposed clip with AI-generated title + caption.
        """
        stream_id = input_data.get("stream_id", "")
        start_sec = input_data.get("start_sec")
        duration = input_data.get("duration_sec", 30)
        context = input_data.get("context", "")

        prompt = (
            f"A stream moment has been flagged for clipping.\n"
            f"Stream ID: {stream_id}\n"
            f"Timestamp: {start_sec}s, Duration: {duration}s\n"
            f"Context: {context}\n\n"
            f"Generate:\n"
            f"1. A punchy clip title (max 60 chars)\n"
            f"2. A short caption for social media (max 150 chars, include relevant hashtags)\n"
            f"3. Recommended platforms: tiktok, youtube_shorts, twitter\n"
            f"4. Confidence score 0-1 that this is worth clipping\n"
            f"Respond as JSON: {{title, caption, platforms, confidence}}"
        )

        response = await self._route(
            task_type="content",
            prompt=prompt,
            context={"system_prompt": "You are a viral content expert for gaming/streaming creators."},
        )

        return {
            "task_id": task_id,
            "agent": "clip",
            "ai_response": response,
            "proposed": {
                "stream_id": stream_id,
                "start_sec": start_sec,
                "duration_sec": duration,
            },
            "status": "success",
        }

    async def handle_message(self, session_id: str, message: str) -> str:
        return await self._route(
            task_type="chat_response",
            prompt=message,
            context={"system_prompt": "You are the WaveStack clip agent. Help the creator identify and clip great stream moments."},
        )
