from fastapi import APIRouter

from .agents import router as agents_router
from .tasks import router as tasks_router
from .approvals import router as approvals_router
from .crews import router as crews_router
from .chat import router as chat_router

api_router = APIRouter()

api_router.include_router(agents_router)
api_router.include_router(tasks_router)
api_router.include_router(approvals_router)
api_router.include_router(crews_router)
api_router.include_router(chat_router)
