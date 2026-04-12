"""
Social Publisher API Routes
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import logging
from pathlib import Path
import aiofiles

from ..platforms.instagram import InstagramPublisher
from ..platforms.tiktok import TikTokPublisher
from ..platforms.facebook import FacebookPublisher
from ..platforms.linkedin import LinkedInPublisher
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/publish", tags=["publisher"])


class PublishRequest(BaseModel):
    org_id: str
    platforms: List[str]  # instagram, tiktok, facebook, linkedin
    caption: str
    media_type: str  # text, photo, video, link
    media_url: Optional[str] = None
    link_url: Optional[str] = None
    use_ai_enhancement: bool = True


@router.post("/multi-platform")
async def publish_multi_platform(
    org_id: str = Form(...),
    platforms: str = Form(...),  # Comma-separated
    caption: str = Form(...),
    media_type: str = Form("text"),
    media: Optional[UploadFile] = File(None),
):
    """
    Publish content to multiple platforms simultaneously

    This is the main endpoint for cross-platform publishing.
    """
    try:
        platform_list = [p.strip() for p in platforms.split(',')]
        results = {}

        # Save uploaded media if provided
        media_path = None
        if media:
            media_path = Path(settings.UPLOAD_DIR) / f"{org_id}_{media.filename}"
            media_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(media_path, 'wb') as f:
                content = await media.read()
                await f.write(content)

        # Publish to each platform
        for platform in platform_list:
            try:
                if platform == "instagram":
                    result = await _publish_instagram(org_id, caption, media_type, media_path)
                elif platform == "tiktok":
                    result = await _publish_tiktok(org_id, caption, media_type, media_path)
                elif platform == "facebook":
                    result = await _publish_facebook(org_id, caption, media_type, media_path)
                elif platform == "linkedin":
                    result = await _publish_linkedin(org_id, caption, media_type, media_path)
                else:
                    result = {"error": f"Unknown platform: {platform}"}

                results[platform] = result

            except Exception as e:
                logger.error(f"Failed to publish to {platform}: {e}")
                results[platform] = {"error": str(e)}

        # Cleanup uploaded file
        if media_path and media_path.exists():
            media_path.unlink()

        return {
            "org_id": org_id,
            "platforms": platform_list,
            "results": results,
        }

    except Exception as e:
        logger.error(f"Multi-platform publish failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/instagram")
async def publish_instagram(
    org_id: str = Form(...),
    caption: str = Form(...),
    post_type: str = Form("photo"),  # photo, video, reel, story
    media: UploadFile = File(...),
):
    """Publish to Instagram"""
    try:
        # Save media
        media_path = Path(settings.TEMP_DIR) / f"{org_id}_{media.filename}"
        media_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(media_path, 'wb') as f:
            content = await media.read()
            await f.write(content)

        # Publish
        result = await _publish_instagram(org_id, caption, post_type, str(media_path))

        # Cleanup
        media_path.unlink()

        return result

    except Exception as e:
        logger.error(f"Instagram publish failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tiktok")
async def publish_tiktok(
    org_id: str = Form(...),
    caption: str = Form(...),
    video: UploadFile = File(...),
):
    """Publish to TikTok"""
    try:
        # Save video
        video_path = Path(settings.TEMP_DIR) / f"{org_id}_{video.filename}"
        video_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(video_path, 'wb') as f:
            content = await video.read()
            await f.write(content)

        # Publish
        result = await _publish_tiktok(org_id, caption, "video", str(video_path))

        # Cleanup
        video_path.unlink()

        return result

    except Exception as e:
        logger.error(f"TikTok publish failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/facebook")
async def publish_facebook(
    org_id: str = Form(...),
    message: str = Form(...),
    post_type: str = Form("text"),  # text, photo, video, link
    media: Optional[UploadFile] = File(None),
    link: Optional[str] = Form(None),
):
    """Publish to Facebook"""
    try:
        media_path = None
        if media:
            media_path = Path(settings.TEMP_DIR) / f"{org_id}_{media.filename}"
            media_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(media_path, 'wb') as f:
                content = await media.read()
                await f.write(content)

        # Publish
        result = await _publish_facebook(org_id, message, post_type, media_path, link)

        # Cleanup
        if media_path and media_path.exists():
            media_path.unlink()

        return result

    except Exception as e:
        logger.error(f"Facebook publish failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/linkedin")
async def publish_linkedin(
    org_id: str = Form(...),
    text: str = Form(...),
    post_type: str = Form("text"),  # text, link, image, video
    media: Optional[UploadFile] = File(None),
    link: Optional[str] = Form(None),
):
    """Publish to LinkedIn"""
    try:
        media_path = None
        if media:
            media_path = Path(settings.TEMP_DIR) / f"{org_id}_{media.filename}"
            media_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(media_path, 'wb') as f:
                content = await media.read()
                await f.write(content)

        # Publish
        result = await _publish_linkedin(org_id, text, post_type, media_path, link)

        # Cleanup
        if media_path and media_path.exists():
            media_path.unlink()

        return result

    except Exception as e:
        logger.error(f"LinkedIn publish failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions

async def _publish_instagram(org_id: str, caption: str, post_type: str, media_path: Optional[str]):
    """Publish to Instagram helper"""
    publisher = InstagramPublisher(org_id)

    # Load credentials (would typically come from database)
    username = settings.INSTAGRAM_USERNAME
    password = settings.INSTAGRAM_PASSWORD

    await publisher.login(username, password)

    if post_type == "photo":
        return await publisher.post_photo(media_path, caption)
    elif post_type == "video" or post_type == "reel":
        return await publisher.post_video(media_path, caption)
    elif post_type == "story":
        return await publisher.post_story(media_path)
    else:
        raise ValueError(f"Unknown Instagram post type: {post_type}")


async def _publish_tiktok(org_id: str, caption: str, post_type: str, media_path: Optional[str]):
    """Publish to TikTok helper"""
    publisher = TikTokPublisher(org_id)

    # Set session (would typically come from database)
    if settings.TIKTOK_SESSION_ID:
        await publisher.set_session(settings.TIKTOK_SESSION_ID)

    return await publisher.post_video(media_path, caption)


async def _publish_facebook(org_id: str, message: str, post_type: str, media_path: Optional[str], link: Optional[str] = None):
    """Publish to Facebook helper"""
    publisher = FacebookPublisher(org_id)

    # Set credentials (would typically come from database)
    access_token = settings.FACEBOOK_ACCESS_TOKEN
    page_id = settings.FACEBOOK_PAGE_ID

    await publisher.set_credentials(access_token, page_id)

    if post_type == "text":
        return await publisher.post_text(message, link)
    elif post_type == "photo":
        return await publisher.post_photo(media_path, message)
    elif post_type == "video":
        return await publisher.post_video(media_path, "Video Title", message)
    elif post_type == "link":
        return await publisher.post_link(link, message)
    else:
        raise ValueError(f"Unknown Facebook post type: {post_type}")


async def _publish_linkedin(org_id: str, text: str, post_type: str, media_path: Optional[str], link: Optional[str] = None):
    """Publish to LinkedIn helper"""
    publisher = LinkedInPublisher(org_id)

    # Set credentials (would typically come from database)
    access_token = settings.LINKEDIN_ACCESS_TOKEN

    await publisher.set_credentials(access_token)

    if post_type == "text":
        return await publisher.post_text(text)
    elif post_type == "link":
        return await publisher.post_link(text, link)
    elif post_type == "image":
        return await publisher.post_image(text, media_path)
    elif post_type == "video":
        return await publisher.post_video(text, media_path)
    else:
        raise ValueError(f"Unknown LinkedIn post type: {post_type}")
