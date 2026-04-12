"""Memory API routes"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.main import get_memory_manager

router = APIRouter()


class StoreMemoryRequest(BaseModel):
    user_id: str
    content: str
    memory_type: str  # fact, preference, event, relationship
    tags: Optional[List[str]] = None
    source: Optional[str] = None


class GetMemoriesRequest(BaseModel):
    user_id: str
    query: Optional[str] = None
    limit: int = 10
    use_semantic_search: bool = True


@router.post("/store")
async def store_memory(request: StoreMemoryRequest):
    """Store a new memory"""
    manager = get_memory_manager()

    metadata = {
        "tags": request.tags or [],
        "source": request.source or "api"
    }

    memory = await manager.store_memory(
        request.user_id,
        request.content,
        request.memory_type,
        metadata
    )

    if not memory:
        raise HTTPException(status_code=500, detail="Failed to store memory")

    return {
        "status": "success",
        "memory": memory
    }


@router.post("/retrieve")
async def get_memories(request: GetMemoriesRequest):
    """Retrieve relevant memories"""
    manager = get_memory_manager()

    memories = await manager.get_relevant_memories(
        request.user_id,
        request.query or "",
        request.limit,
        request.use_semantic_search
    )

    return {
        "user_id": request.user_id,
        "count": len(memories),
        "memories": memories
    }


@router.post("/consolidate/{user_id}")
async def consolidate_memories(user_id: str):
    """Consolidate memories for a user"""
    manager = get_memory_manager()

    merged_count = await manager.consolidate_memories(user_id)

    return {
        "status": "success",
        "merged_count": merged_count
    }


@router.post("/prune/{user_id}")
async def prune_memories(user_id: str):
    """Prune old memories for a user"""
    manager = get_memory_manager()

    pruned_count = await manager.prune_old_memories(user_id)

    return {
        "status": "success",
        "pruned_count": pruned_count
    }
