from fastapi import APIRouter

router = APIRouter(prefix="/crews", tags=["Crews"])

@router.post("")
async def create_crew():
    return {"message": "Crew created"}

@router.get("")
async def list_crews():
    return {"message": "List of crews"}

@router.get("/{id}")
async def get_crew(id: str):
    return {"message": f"Crew detail for {id}"}

@router.post("/{id}/start")
async def start_crew(id: str):
    return {"message": f"Started crew {id}"}

@router.post("/{id}/stop")
async def stop_crew(id: str):
    return {"message": f"Stopped crew {id}"}
