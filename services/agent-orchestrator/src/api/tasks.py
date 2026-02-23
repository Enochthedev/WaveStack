from fastapi import APIRouter

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("")
async def create_task():
    return {"message": "Task queued"}

@router.get("")
async def list_tasks():
    return {"message": "List of tasks"}

@router.get("/{id}")
async def get_task(id: str):
    return {"message": f"Task detail for {id}"}

@router.post("/{id}/cancel")
async def cancel_task(id: str):
    return {"message": f"Cancelled task {id}"}
