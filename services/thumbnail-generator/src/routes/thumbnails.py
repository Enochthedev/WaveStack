"""
Thumbnail Generator API Routes
"""
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
import logging
from pathlib import Path
import io
from datetime import datetime
import hashlib

from ..generator.image_gen import image_generator
from ..generator.text_overlay import text_overlay
from ..generator.templates import thumbnail_templates
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/thumbnails", tags=["thumbnails"])


class GenerateThumbnailRequest(BaseModel):
    """Request to generate a thumbnail"""
    # Video metadata
    title: str = Field(..., description="Video title")
    description: Optional[str] = Field(None, description="Video description")
    tags: Optional[list[str]] = Field(None, description="Video tags")

    # Generation options
    prompt: Optional[str] = Field(None, description="Custom image generation prompt")
    style: Optional[str] = Field(None, description="Visual style (dramatic, colorful, gaming, etc.)")
    template: Optional[str] = Field(None, description="Template name (bold, minimal, split, etc.)")

    # Text overlay
    overlay_text: Optional[str] = Field(None, description="Text to overlay on thumbnail")
    subtitle: Optional[str] = Field(None, description="Subtitle text")

    # Advanced options
    use_ai_prompt: bool = Field(True, description="Use AI to generate optimized prompt")
    org_id: Optional[str] = Field(None, description="Organization ID for caching")


class ThumbnailResponse(BaseModel):
    """Thumbnail generation response"""
    success: bool
    thumbnail_url: Optional[str] = None
    cache_key: Optional[str] = None
    message: Optional[str] = None


@router.post("/generate", response_model=ThumbnailResponse)
async def generate_thumbnail(request: GenerateThumbnailRequest):
    """
    Generate a thumbnail from video metadata

    This endpoint:
    1. Generates or uses provided image generation prompt
    2. Creates base image using AI (DALL-E, Stability, or local SD)
    3. Applies template styling if specified
    4. Adds text overlays
    5. Returns the thumbnail image

    Returns a cache key that can be used to retrieve the image.
    """
    try:
        # Generate cache key
        cache_key = _generate_cache_key(request)

        # Check cache
        cached_path = Path(settings.OUTPUT_DIR) / f"{cache_key}.{settings.DEFAULT_FORMAT}"
        if settings.CACHE_THUMBNAILS and cached_path.exists():
            logger.info(f"Returning cached thumbnail: {cache_key}")
            return ThumbnailResponse(
                success=True,
                thumbnail_url=f"/api/v1/thumbnails/{cache_key}",
                cache_key=cache_key,
                message="Thumbnail retrieved from cache",
            )

        # Generate base image
        if request.prompt:
            # Use custom prompt
            base_image = await image_generator.generate_image(
                prompt=request.prompt,
                style=request.style,
            )
        else:
            # Generate from metadata
            base_image = await image_generator.generate_from_video_metadata(
                title=request.title,
                description=request.description,
                tags=request.tags,
                style=request.style,
            )

        # Resize to standard thumbnail size
        base_image = base_image.resize(
            (settings.THUMBNAIL_WIDTH, settings.THUMBNAIL_HEIGHT),
            Image.Resampling.LANCZOS
        )

        # Apply template if specified
        if request.template:
            thumbnail = thumbnail_templates.apply_template(
                base_image,
                template_name=request.template,
                title=request.overlay_text or request.title,
                subtitle=request.subtitle,
            )
        elif request.overlay_text:
            # Just add text without template
            thumbnail = text_overlay.add_text(
                base_image,
                request.overlay_text,
                position="center",
            )
            if request.subtitle:
                thumbnail = text_overlay.add_text(
                    thumbnail,
                    request.subtitle,
                    position="bottom",
                    font_size=50,
                )
        else:
            # No text overlay
            thumbnail = base_image

        # Save thumbnail
        output_path = Path(settings.OUTPUT_DIR)
        output_path.mkdir(parents=True, exist_ok=True)

        thumbnail.save(
            cached_path,
            format=settings.DEFAULT_FORMAT,
            quality=settings.QUALITY,
        )

        logger.info(f"Thumbnail generated successfully: {cache_key}")

        return ThumbnailResponse(
            success=True,
            thumbnail_url=f"/api/v1/thumbnails/{cache_key}",
            cache_key=cache_key,
            message="Thumbnail generated successfully",
        )

    except Exception as e:
        logger.error(f"Failed to generate thumbnail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cache_key}")
async def get_thumbnail(cache_key: str):
    """
    Retrieve a generated thumbnail by cache key

    Returns the thumbnail image as PNG/JPEG
    """
    try:
        # Find thumbnail file
        thumbnail_path = Path(settings.OUTPUT_DIR) / f"{cache_key}.{settings.DEFAULT_FORMAT}"

        if not thumbnail_path.exists():
            raise HTTPException(status_code=404, detail="Thumbnail not found")

        # Read and return image
        with open(thumbnail_path, "rb") as f:
            image_data = f.read()

        media_type = f"image/{settings.DEFAULT_FORMAT.lower()}"

        return Response(content=image_data, media_type=media_type)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve thumbnail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-from-prompt")
async def generate_from_prompt(
    prompt: str,
    style: Optional[str] = None,
    template: Optional[str] = None,
    title: Optional[str] = None,
    subtitle: Optional[str] = None,
):
    """
    Generate thumbnail directly from a text prompt

    Simpler endpoint for quick thumbnail generation
    """
    try:
        # Generate image
        image = await image_generator.generate_image(prompt, style=style)

        # Resize
        image = image.resize(
            (settings.THUMBNAIL_WIDTH, settings.THUMBNAIL_HEIGHT),
            Image.Resampling.LANCZOS
        )

        # Apply template if specified
        if template and title:
            image = thumbnail_templates.apply_template(
                image,
                template_name=template,
                title=title,
                subtitle=subtitle,
            )
        elif title:
            image = text_overlay.add_text(image, title, position="center")
            if subtitle:
                image = text_overlay.add_text(image, subtitle, position="bottom", font_size=50)

        # Return image directly
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format=settings.DEFAULT_FORMAT, quality=settings.QUALITY)
        img_byte_arr.seek(0)

        return StreamingResponse(
            img_byte_arr,
            media_type=f"image/{settings.DEFAULT_FORMAT.lower()}",
        )

    except Exception as e:
        logger.error(f"Failed to generate from prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/list")
async def list_templates():
    """List available thumbnail templates"""
    return {
        "templates": [
            {
                "name": "bold",
                "description": "Large text with strong contrast and yellow accent",
                "features": ["Vignette", "Large title", "High contrast"]
            },
            {
                "name": "dramatic",
                "description": "High contrast with desaturated background and red accent",
                "features": ["Desaturated", "Red text", "Heavy shadow"]
            },
            {
                "name": "colorful",
                "description": "Vibrant colors with rainbow gradient",
                "features": ["Enhanced saturation", "Rainbow gradient", "Playful"]
            },
            {
                "name": "minimal",
                "description": "Clean design with blurred background",
                "features": ["Blur", "Clean text", "Semi-transparent bar"]
            },
            {
                "name": "gaming",
                "description": "Neon aesthetics for gaming content",
                "features": ["Neon colors", "Tech vibe", "Cyan/Lime"]
            },
            {
                "name": "split",
                "description": "Title at top, subtitle at bottom",
                "features": ["Divided layout", "Gradient bars", "Clear separation"]
            },
            {
                "name": "gradient",
                "description": "Colorful gradient overlay with modern style",
                "features": ["Purple gradient", "Modern", "Stylish"]
            },
            {
                "name": "vlog",
                "description": "Casual vlog-style with warm tones",
                "features": ["Warm colors", "Personal feel", "Light vignette"]
            },
        ]
    }


@router.get("/styles/list")
async def list_styles():
    """List available visual styles for image generation"""
    return {
        "styles": [
            "dramatic",
            "colorful",
            "minimalist",
            "gaming",
            "tech",
            "professional",
            "fun",
            "dark",
        ]
    }


@router.delete("/{cache_key}")
async def delete_thumbnail(cache_key: str):
    """Delete a cached thumbnail"""
    try:
        thumbnail_path = Path(settings.OUTPUT_DIR) / f"{cache_key}.{settings.DEFAULT_FORMAT}"

        if not thumbnail_path.exists():
            raise HTTPException(status_code=404, detail="Thumbnail not found")

        thumbnail_path.unlink()

        return {"message": "Thumbnail deleted successfully", "cache_key": cache_key}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete thumbnail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_cache_key(request: GenerateThumbnailRequest) -> str:
    """Generate a unique cache key for a thumbnail request"""
    # Combine request parameters into a string
    key_parts = [
        request.title,
        request.description or "",
        ",".join(request.tags or []),
        request.prompt or "",
        request.style or "",
        request.template or "",
        request.overlay_text or "",
        request.subtitle or "",
    ]

    key_string = "|".join(key_parts)

    # Hash to create short key
    hash_obj = hashlib.sha256(key_string.encode())
    cache_key = hash_obj.hexdigest()[:16]

    return cache_key


# Import PIL here to avoid circular imports
from PIL import Image
