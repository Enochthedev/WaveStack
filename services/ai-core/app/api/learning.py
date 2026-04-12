"""Learning pipeline API routes"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

from app.main import get_learning_pipeline, get_personality_engine

router = APIRouter()


class SubmitTrainingDataRequest(BaseModel):
    user_id: str
    platform: str
    data_type: str  # message, stream_transcript, tweet, etc.
    content: str
    metadata: Optional[Dict[str, Any]] = None


class BatchTrainingDataRequest(BaseModel):
    user_id: str
    platform: str
    data_type: str
    items: List[Dict[str, Any]]  # [{"content": "...", "metadata": {...}}, ...]


@router.post("/train/single")
async def submit_training_data(request: SubmitTrainingDataRequest):
    """Submit a single piece of training data"""
    engine = get_personality_engine()

    await engine.learn_from_message(
        request.user_id,
        request.content,
        {
            "platform": request.platform,
            "dataType": request.data_type,
            **(request.metadata or {})
        }
    )

    return {
        "status": "success",
        "message": "Training data submitted"
    }


@router.post("/train/batch")
async def submit_batch_training_data(request: BatchTrainingDataRequest):
    """Submit multiple pieces of training data at once"""
    engine = get_personality_engine()

    for item in request.items:
        await engine.learn_from_message(
            request.user_id,
            item.get("content", ""),
            {
                "platform": request.platform,
                "dataType": request.data_type,
                **item.get("metadata", {})
            }
        )

    return {
        "status": "success",
        "message": f"Submitted {len(request.items)} training data items"
    }


@router.get("/stats/{user_id}")
async def get_learning_stats(user_id: str):
    """Get learning statistics for a user"""
    from app.main import db

    # Get profile
    profile = await db.personalityprofile.find_unique(
        where={"userId": user_id}
    )

    if not profile:
        return {
            "user_id": user_id,
            "messages_seen": 0,
            "confidence": 0.0,
            "last_trained_at": None
        }

    # Get training data count
    training_count = await db.trainingdata.count(
        where={
            "userId": user_id,
            "isProcessed": True
        }
    )

    # Get memory count
    memory_count = await db.memory.count(
        where={"userId": user_id}
    )

    # Get conversation count
    conversation_count = await db.conversation.count(
        where={"userId": user_id}
    )

    return {
        "user_id": user_id,
        "messages_seen": profile.messagesSeen,
        "confidence": profile.confidence,
        "last_trained_at": profile.lastTrainedAt.isoformat() if profile.lastTrainedAt else None,
        "training_data_processed": training_count,
        "memories_stored": memory_count,
        "conversations_logged": conversation_count,
    }
