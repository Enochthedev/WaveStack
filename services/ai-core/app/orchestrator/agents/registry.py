from typing import Dict, Type
from .base import BaseAgent
from .types import AgentType

class AgentRegistry:
    """
    Registry for tracking and instantiating agent classes.
    """
    _agents: Dict[AgentType, Type[BaseAgent]] = {}

    @classmethod
    def register(cls, agent_type: AgentType):
        def wrapper(agent_class: Type[BaseAgent]):
            cls._agents[agent_type] = agent_class
            return agent_class
        return wrapper

    @classmethod
    def get_agent_class(cls, agent_type: AgentType) -> Type[BaseAgent]:
        if agent_type not in cls._agents:
            raise ValueError(f"Agent type {agent_type} not registered.")
        return cls._agents[agent_type]

    @classmethod
    def get_registered_types(cls) -> list[AgentType]:
        return list(cls._agents.keys())
