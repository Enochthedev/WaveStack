"""
YouTube Video API Routes
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import logging
from pathlib import Path
import aiofiles

from ..youtube.auth import YouTubeAuth
from ..youtube.uploader import YouTubeUploader
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/youtube", tags=["youtube"])


class AuthURLResponse(BaseModel):
    authorization_url: str
    message: str


class VideoUploadRequest(BaseModel):
    org_id: str
    title: str
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    category: Optional[str] = None
    privacy: Optional[str] = "private"
    playlist_id: Optional[str] = None
    use_ai_metadata: bool = True


@router.get("/auth/url")
async def get_auth_url(org_id: str):
    """Get YouTube OAuth authorization URL"""
    try:
        auth = YouTubeAuth(org_id)
        url = auth.get_authorization_url()

        return AuthURLResponse(
            authorization_url=url,
            message="Visit this URL to authorize YouTube access"
        )

    except Exception as e:
        logger.error(f"Failed to generate auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/oauth2callback")
async def oauth_callback(code: str, state: str, org_id: str):
    """OAuth callback endpoint"""
    try:
        auth = YouTubeAuth(org_id)
        success = auth.exchange_code(code, state)

        if success:
            return {"message": "YouTube authorization successful"}
        else:
            raise HTTPException(status_code=400, detail="Authorization failed")

    except Exception as e:
        logger.error(f"OAuth callback failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_video(
    org_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated
    privacy: str = Form("private"),
    video: UploadFile = File(...),
):
    """Upload a video to YouTube"""
    try:
        # Save uploaded video temporarily
        upload_path = Path(settings.UPLOAD_DIR) / f"{org_id}_{video.filename}"
        upload_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(upload_path, 'wb') as f:
            content = await video.read()
            await f.write(content)

        # Parse tags
        tag_list = [t.strip() for t in tags.split(',')] if tags else None

        # Upload to YouTube
        uploader = YouTubeUploader(org_id)
        result = await uploader.upload_video(
            video_path=str(upload_path),
            title=title,
            description=description,
            tags=tag_list,
            privacy=privacy,
        )

        # Cleanup
        upload_path.unlink()

        return result

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{org_id}")
async def get_auth_status(org_id: str):
    """Check YouTube authentication status"""
    auth = YouTubeAuth(org_id)
    is_authenticated = auth.is_authenticated()

    return {
        "org_id": org_id,
        "authenticated": is_authenticated,
        "message": "Ready to upload" if is_authenticated else "Authorization required"
    }
