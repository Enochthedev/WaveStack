from fastapi import APIRouter

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("")
async def list_approvals():
    return {"message": "List pending approvals"}

@router.post("/{id}/approve")
async def approve_action(id: str):
    return {"message": f"Approved {id}"}

@router.post("/{id}/reject")
async def reject_action(id: str):
    return {"message": f"Rejected {id}"}
