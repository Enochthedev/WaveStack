from typing import Any, Dict
from ..agents.registry import AgentRegistry
from ..agents.types import AgentType

class ExecutorEngine:
    """
    Executes task steps via assigned agents or MCP skills.
    """
    
    async def execute_task_step(self, agent_type: AgentType, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Routes the task payload to the specific Agent implementation.
        """
        agent_class = AgentRegistry.get_agent_class(agent_type)
        # Instantiate agent (using mock config/org_id for now)
        agent_instance = agent_class(org_id="system", config={})
        return await agent_instance.process_task(task_id, input_data)
