"""Personality API routes"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.main import get_personality_engine
from app.engine.personality_engine import PersonalityEngine

router = APIRouter()


class GenerateRequest(BaseModel):
    user_id: str
    message: str
    platform: Optional[str] = None
    channel_id: Optional[str] = None
    username: Optional[str] = None


class GenerateResponse(BaseModel):
    response: str
    user_id: str


class LearnRequest(BaseModel):
    user_id: str
    message: str
    platform: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/generate", response_model=GenerateResponse)
async def generate_response(request: GenerateRequest):
    """Generate a response in the creator's voice"""
    engine = get_personality_engine()

    context = {
        "platform": request.platform,
        "channelId": request.channel_id,
        "username": request.username,
    }

    response = await engine.generate_response(
        request.user_id,
        request.message,
        context
    )

    if not response:
        raise HTTPException(status_code=500, detail="Failed to generate response")

    return GenerateResponse(
        response=response,
        user_id=request.user_id
    )


@router.post("/learn")
async def learn_from_message(request: LearnRequest):
    """Add a message to training data"""
    engine = get_personality_engine()

    await engine.learn_from_message(
        request.user_id,
        request.message,
        request.metadata
    )

    return {"status": "success", "message": "Message added to training data"}


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Get personality profile for a user"""
    engine = get_personality_engine()

    profile = await engine._get_or_create_profile(user_id)

    return {
        "user_id": user_id,
        "profile": profile
    }
