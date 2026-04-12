from fastapi import APIRouter

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("")
async def list_agents():
    return {"message": "List of agent configs"}

@router.get("/{agentType}")
async def get_agent(agentType: str):
    return {"message": f"Get agent config for {agentType}"}

@router.put("/{agentType}")
async def update_agent(agentType: str):
    return {"message": f"Updated config for {agentType}"}
