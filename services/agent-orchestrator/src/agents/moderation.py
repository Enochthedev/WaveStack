from typing import Any, Dict
from .base import BaseAgent
from .types import AgentType, AutonomyLevel
from .registry import AgentRegistry

@AgentRegistry.register(AgentType.MODERATION)
class ModerationAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.MODERATION
        
    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.AUTOPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"result": f"Moderated content for {task_id}", "status": "success"}
        
    async def handle_message(self, session_id: str, message: str) -> str:
        return "I am the moderation agent. Flagged content has been reviewed."
