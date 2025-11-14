"""
API Routes for AI Personality Service
"""
import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from ..main import db, redis_client, personality_engine, memory_manager, content_generator

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class GenerateResponseRequest(BaseModel):
    user_id: str
    message: str
    platform: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class GenerateResponseResponse(BaseModel):
    response: str
    confidence: Optional[float] = None


class StoreMemoryRequest(BaseModel):
    user_id: str
    content: str
    memory_type: str
    metadata: Optional[Dict[str, Any]] = None


class GenerateTweetRequest(BaseModel):
    user_id: str
    topic: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class PostTweetRequest(BaseModel):
    user_id: str
    content_id: str
    auto_approve: bool = False


class LearnFromMessageRequest(BaseModel):
    user_id: str
    message: str
    platform: str
    metadata: Optional[Dict[str, Any]] = None


# Personality Routes
@router.post("/personality/respond", response_model=GenerateResponseResponse)
async def generate_response(request: GenerateResponseRequest):
    """Generate a response in the creator's voice"""
    try:
        context = request.context or {}
        if request.platform:
            context["platform"] = request.platform

        response = await personality_engine.generate_response(
            request.user_id,
            request.message,
            context
        )

        if not response:
            raise HTTPException(status_code=500, detail="Failed to generate response")

        # Get confidence from profile
        profile = await db.personalityprofile.find_unique(
            where={"userId": request.user_id}
        )

        return {
            "response": response,
            "confidence": profile.confidence if profile else 0.0
        }

    except Exception as e:
        logger.error(f"Error in generate_response: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/personality/learn")
async def learn_from_message(request: LearnFromMessageRequest):
    """Learn from a message"""
    try:
        await personality_engine.learn_from_message(
            request.user_id,
            request.message,
            {"platform": request.platform, **(request.metadata or {})}
        )

        return {"status": "success", "message": "Learning processed"}

    except Exception as e:
        logger.error(f"Error in learn_from_message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Memory Routes
@router.post("/memory/store")
async def store_memory(request: StoreMemoryRequest):
    """Store a memory"""
    try:
        memory = await memory_manager.store_memory(
            request.user_id,
            request.content,
            request.memory_type,
            request.metadata
        )

        if not memory:
            raise HTTPException(status_code=500, detail="Failed to store memory")

        return {
            "status": "success",
            "memory_id": memory.id,
            "importance": memory.importance
        }

    except Exception as e:
        logger.error(f"Error in store_memory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory/{user_id}")
async def get_memories(user_id: str, query: Optional[str] = None, limit: int = 10):
    """Get relevant memories"""
    try:
        if query:
            memories = await memory_manager.get_relevant_memories(user_id, query, limit)
        else:
            memories = await db.memory.find_many(
                where={"userId": user_id},
                order={"importance": "desc"},
                take=limit
            )

        return {
            "memories": [
                {
                    "id": m.id,
                    "content": m.content,
                    "type": m.memoryType,
                    "importance": m.importance,
                    "created_at": m.learnedAt.isoformat()
                }
                for m in memories
            ]
        }

    except Exception as e:
        logger.error(f"Error in get_memories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Content Generation Routes
@router.post("/content/tweet")
async def generate_tweet(request: GenerateTweetRequest):
    """Generate a tweet"""
    try:
        tweet = await content_generator.generate_tweet(
            request.user_id,
            request.topic,
            request.context
        )

        if not tweet:
            raise HTTPException(status_code=500, detail="Failed to generate tweet")

        return tweet

    except Exception as e:
        logger.error(f"Error in generate_tweet: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/content/post-tweet")
async def post_tweet(request: PostTweetRequest):
    """Post a tweet to Twitter"""
    try:
        success = await content_generator.post_to_twitter(
            request.user_id,
            request.content_id,
            request.auto_approve
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to post tweet")

        return {"status": "success", "message": "Tweet posted"}

    except Exception as e:
        logger.error(f"Error in post_tweet: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/content/{user_id}/recent")
async def get_recent_content(
    user_id: str,
    platform: str = "twitter",
    limit: int = 10
):
    """Get recent generated content"""
    try:
        content_items = await db.generatedcontent.find_many(
            where={"userId": user_id, "platform": platform},
            order={"createdAt": "desc"},
            take=limit
        )

        return {
            "content": [
                {
                    "id": c.id,
                    "text": c.generatedText,
                    "status": c.status,
                    "sentiment": c.sentiment,
                    "created_at": c.createdAt.isoformat(),
                    "posted_at": c.postedAt.isoformat() if c.postedAt else None
                }
                for c in content_items
            ]
        }

    except Exception as e:
        logger.error(f"Error in get_recent_content: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Profile Routes
@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Get personality profile"""
    try:
        profile = await db.personalityprofile.find_unique(
            where={"userId": user_id}
        )

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        return {
            "user_id": profile.userId,
            "name": profile.name,
            "platform": profile.platform,
            "tone": profile.tone,
            "vocabulary": profile.vocabulary[:20] if profile.vocabulary else [],
            "catchphrases": profile.catchphrases if profile.catchphrases else [],
            "messages_seen": profile.messagesSeen,
            "confidence": profile.confidence,
            "last_trained": profile.lastTrainedAt.isoformat() if profile.lastTrainedAt else None
        }

    except Exception as e:
        logger.error(f"Error in get_profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Stats Routes
@router.get("/stats/{user_id}")
async def get_stats(user_id: str):
    """Get AI stats for user"""
    try:
        stats = await redis_client.hgetall(f"ai:stats:{user_id}")

        # Get memory count
        memory_count = await db.memory.count(where={"userId": user_id})

        # Get conversation count
        conversation_count = await db.conversation.count(where={"userId": user_id})

        # Get content count
        content_count = await db.generatedcontent.count(where={"userId": user_id})

        return {
            "responses_generated": int(stats.get("responses_generated", 0)),
            "memories_stored": memory_count,
            "conversations": conversation_count,
            "content_generated": content_count
        }

    except Exception as e:
        logger.error(f"Error in get_stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
