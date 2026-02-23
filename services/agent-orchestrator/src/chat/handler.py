from typing import Any, Dict
from ..agents.registry import AgentRegistry
from ..agents.types import AgentType

class ChatHandler:
    """
    Routes chat messages to the appropriate agent based on context or explicit mentions.
    """
    
    async def process_user_message(self, session_id: str, message: str) -> str:
        """
        Determines which agent should reply and invokes its handle_message method.
        """
        # For now, default to Community agent or a generic response
        agent_type = AgentType.COMMUNITY
        agent_class = AgentRegistry.get_agent_class(agent_type)
        agent_instance = agent_class(org_id="system", config={})
        
        reply = await agent_instance.handle_message(session_id, message)
        return reply
