from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from .types import AgentType, AutonomyLevel

class BaseAgent(ABC):
    """
    Abstract base class for all AI agents in the orchestrator.
    """
    
    def __init__(
        self,
        org_id: str,
        config: Dict[str, Any],
        autonomy_level: AutonomyLevel = AutonomyLevel.COPILOT,
        allowed_skills: Optional[List[str]] = None,
        system_prompt: Optional[str] = None
    ):
        self.org_id = org_id
        self.config = config
        self.autonomy_level = autonomy_level
        self.allowed_skills = allowed_skills or []
        self.system_prompt = system_prompt

    @property
    @abstractmethod
    def agent_type(self) -> AgentType:
        """Returns the specific AgentType for this agent."""
        pass
        
    @property
    @abstractmethod
    def default_autonomy(self) -> AutonomyLevel:
        """Returns the default level of autonomy for this type of agent."""
        pass

    @abstractmethod
    async def process_task(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for processing an AgentTask.
        """
        pass
        
    @abstractmethod
    async def handle_message(self, session_id: str, message: str) -> str:
        """
        Handle direct chat messages addressed to this agent.
        """
        pass
