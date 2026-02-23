from typing import Any, Dict
from .base import BaseAgent
from .types import AgentType, AutonomyLevel
from .registry import AgentRegistry

@AgentRegistry.register(AgentType.CONTENT)
class ContentAgent(BaseAgent):
    @property
    def agent_type(self) -> AgentType:
        return AgentType.CONTENT
        
    @property
    def default_autonomy(self) -> AutonomyLevel:
        return AutonomyLevel.COPILOT

    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"result": f"Content processed for {task_id}", "status": "success"}
        
    async def handle_message(self, session_id: str, message: str) -> str:
        return "I am the content agent. How can I help you draft your post?"
