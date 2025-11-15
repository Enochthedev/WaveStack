"""
Moderation API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from ..moderation.engine import moderation_engine
from ..moderation.filter import content_filter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/moderate", tags=["moderation"])


class ModerateRequest(BaseModel):
    message: str
    user_id: str
    username: str
    platform: str  # discord, twitch, etc.
    channel_id: str
    user_roles: Optional[List[str]] = None


class ModerateResponse(BaseModel):
    should_delete: bool
    should_timeout: bool
    should_ban: bool
    timeout_duration: int
    violations: List[str]
    scores: dict
    actions: List[str]
    reason: Optional[str]


@router.post("/check", response_model=ModerateResponse)
async def check_message(request: ModerateRequest):
    """
    Check if a message violates moderation rules

    This is the main endpoint called by Discord/Twitch bots
    """
    try:
        result = await moderation_engine.moderate_message(
            message=request.message,
            user_id=request.user_id,
            username=request.username,
            platform=request.platform,
            channel_id=request.channel_id,
            user_roles=request.user_roles,
        )

        return ModerateResponse(**result)

    except Exception as e:
        logger.error(f"Moderation check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/filter/add-word")
async def add_banned_word(word: str):
    """Add a word to the banned list"""
    content_filter.add_banned_word(word)
    return {"message": f"Added '{word}' to banned words"}


@router.post("/filter/add-phrase")
async def add_banned_phrase(phrase: str):
    """Add a phrase to the banned list"""
    content_filter.add_phrase(phrase)
    return {"message": f"Added '{phrase}' to banned phrases"}


@router.delete("/filter/remove-word")
async def remove_banned_word(word: str):
    """Remove a word from the banned list"""
    content_filter.remove_word(word)
    return {"message": f"Removed '{word}' from banned words"}


@router.get("/filter/words")
async def get_banned_words():
    """Get list of banned words"""
    return {"banned_words": content_filter.get_banned_words()}


@router.get("/violations/{user_id}")
async def get_user_violations(user_id: str):
    """Get violation count for a user"""
    count = moderation_engine.get_user_violations(user_id)
    return {
        "user_id": user_id,
        "violation_count": count,
    }


@router.delete("/violations/{user_id}")
async def clear_user_violations(user_id: str):
    """Clear violations for a user"""
    moderation_engine.clear_user_violations(user_id)
    return {"message": f"Cleared violations for user {user_id}"}
