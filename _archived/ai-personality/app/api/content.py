"""Content generation API routes"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.main import get_content_generator

router = APIRouter()


class GenerateTweetRequest(BaseModel):
    user_id: str
    prompt: Optional[str] = None
    max_length: int = 280


class GeneratePostRequest(BaseModel):
    user_id: str
    platform: str  # twitter, instagram, tiktok, discord
    prompt: Optional[str] = None
    max_length: Optional[int] = None


class ReviewContentRequest(BaseModel):
    content_id: str
    approved: bool
    feedback: Optional[str] = None


@router.post("/generate/tweet")
async def generate_tweet(request: GenerateTweetRequest):
    """Generate a tweet"""
    generator = get_content_generator()

    result = await generator.generate_tweet(
        request.user_id,
        request.prompt,
        request.max_length
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate tweet")

    return result


@router.post("/generate/post")
async def generate_post(request: GeneratePostRequest):
    """Generate a social media post"""
    generator = get_content_generator()

    result = await generator.generate_post(
        request.user_id,
        request.platform,
        request.prompt,
        request.max_length
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate post")

    return result


@router.get("/pending/{user_id}")
async def get_pending_content(user_id: str, platform: Optional[str] = None):
    """Get content pending review"""
    generator = get_content_generator()

    content = await generator.get_pending_content(user_id, platform)

    return {
        "user_id": user_id,
        "count": len(content),
        "content": content
    }


@router.post("/review")
async def review_content(request: ReviewContentRequest):
    """Review and approve/reject content"""
    generator = get_content_generator()

    if request.approved:
        success = await generator.approve_content(request.content_id)
        message = "Content approved for posting"
    else:
        success = await generator.reject_content(
            request.content_id,
            request.feedback or "Rejected by user"
        )
        message = "Content rejected"

    if not success:
        raise HTTPException(status_code=500, detail="Failed to review content")

    return {
        "status": "success",
        "message": message
    }
