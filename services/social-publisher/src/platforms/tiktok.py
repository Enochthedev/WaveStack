"""
TikTok Publisher
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx
from moviepy.editor import VideoFileClip

from ..config import settings

logger = logging.getLogger(__name__)


class TikTokPublisher:
    """Publish content to TikTok"""

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.session_id = None

    async def set_session(self, session_id: str):
        """
        Set TikTok session ID

        Args:
            session_id: TikTok session cookie (sessionid)
        """
        self.session_id = session_id
        logger.info("TikTok session ID configured")

    async def post_video(
        self,
        video_path: str,
        caption: str,
        privacy: str = "public",  # public, friends, private
        allow_comments: bool = True,
        allow_duet: bool = True,
        allow_stitch: bool = True,
        use_ai_caption: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a video to TikTok

        Args:
            video_path: Path to video file
            caption: Video caption
            privacy: Privacy setting
            allow_comments: Allow comments
            allow_duet: Allow duet
            allow_stitch: Allow stitch
            use_ai_caption: Enhance caption with AI

        Returns:
            Post metadata

        Note: This is a simplified implementation. In production, you would use
        the official TikTok Content Posting API which requires business account.
        """
        logger.info("Posting video to TikTok")

        try:
            # Validate video duration
            clip = VideoFileClip(video_path)
            duration = clip.duration
            clip.close()

            if duration > settings.TIKTOK_MAX_DURATION:
                raise ValueError(f"Video too long: {duration}s (max {settings.TIKTOK_MAX_DURATION}s)")

            # Enhance caption with AI
            if use_ai_caption and settings.USE_AI_CAPTIONS:
                caption = await self._enhance_caption(caption)

            # Add hashtags
            if settings.USE_AI_HASHTAGS:
                hashtags = await self._generate_hashtags(caption)
                caption = f"{caption} {' '.join(hashtags)}"

            # For production, integrate with TikTok Content Posting API
            # https://developers.tiktok.com/doc/content-posting-api-get-started/

            # This is a placeholder for the actual API call
            # In reality, you need to:
            # 1. Get upload URL from TikTok API
            # 2. Upload video chunks
            # 3. Publish video with metadata

            logger.warning("⚠️  TikTok posting requires TikTok Content Posting API integration")
            logger.info("Video prepared for TikTok upload")

            return {
                "platform": "tiktok",
                "post_type": "video",
                "caption": caption,
                "duration": duration,
                "privacy": privacy,
                "status": "pending_api_integration",
                "message": "Configure TikTok Content Posting API for automated uploads"
            }

        except Exception as e:
            logger.error(f"Failed to post TikTok video: {e}")
            raise

    async def post_with_api(
        self,
        video_path: str,
        caption: str,
        access_token: str,
        privacy: str = "PUBLIC_TO_EVERYONE",
        disable_comment: bool = False,
        disable_duet: bool = False,
        disable_stitch: bool = False,
    ) -> Dict[str, Any]:
        """
        Post video using official TikTok Content Posting API

        Requires:
        - TikTok Developer account
        - Content Posting API access
        - User access token

        Args:
            video_path: Path to video file
            caption: Video caption (max 2200 chars)
            access_token: User access token
            privacy: Privacy level
            disable_comment: Disable comments
            disable_duet: Disable duet
            disable_stitch: Disable stitch

        Returns:
            Post metadata
        """
        logger.info("Posting to TikTok via Content Posting API")

        try:
            # Step 1: Initialize upload
            init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"

            async with httpx.AsyncClient() as client:
                # Get creator info
                response = await client.post(
                    init_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                    json={
                        "post_info": {
                            "title": caption[:2200],
                            "privacy_level": privacy,
                            "disable_comment": disable_comment,
                            "disable_duet": disable_duet,
                            "disable_stitch": disable_stitch,
                        },
                        "source_info": {
                            "source": "FILE_UPLOAD",
                            "video_size": Path(video_path).stat().st_size,
                        }
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    raise Exception(f"TikTok API error: {response.text}")

                result = response.json()
                publish_id = result["data"]["publish_id"]
                upload_url = result["data"]["upload_url"]

                logger.info(f"TikTok upload initialized: {publish_id}")

                # Step 2: Upload video
                with open(video_path, 'rb') as video_file:
                    upload_response = await client.put(
                        upload_url,
                        headers={
                            "Content-Type": "video/mp4",
                        },
                        content=video_file.read(),
                        timeout=300.0,  # 5 minute timeout for upload
                    )

                if upload_response.status_code not in [200, 201]:
                    raise Exception(f"Upload failed: {upload_response.text}")

                logger.info(f"✅ TikTok video uploaded: {publish_id}")

                return {
                    "platform": "tiktok",
                    "publish_id": publish_id,
                    "post_type": "video",
                    "caption": caption,
                    "privacy": privacy,
                    "status": "published",
                }

        except Exception as e:
            logger.error(f"TikTok API upload failed: {e}")
            raise

    async def get_video_status(self, publish_id: str, access_token: str) -> Dict[str, Any]:
        """
        Check video publishing status

        Args:
            publish_id: Publish ID from upload
            access_token: User access token

        Returns:
            Status information
        """
        try:
            status_url = "https://open.tiktokapis.com/v2/post/publish/status/"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    status_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                    json={
                        "publish_id": publish_id,
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    return result["data"]
                else:
                    raise Exception(f"Status check failed: {response.text}")

        except Exception as e:
            logger.error(f"Failed to get TikTok video status: {e}")
            raise

    async def _enhance_caption(self, caption: str) -> str:
        """Use AI to enhance caption for TikTok"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Enhance this TikTok caption for maximum engagement: '{caption}'. Keep it under 2200 characters. Make it catchy and trend-worthy.",
                        "platform": "tiktok",
                    },
                    timeout=15.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_caption = result.get("response", "")

                    if len(ai_caption) > 10:
                        logger.info("Using AI-enhanced TikTok caption")
                        return ai_caption[:2200]

        except Exception as e:
            logger.warning(f"Failed to enhance TikTok caption: {e}")

        return caption

    async def _generate_hashtags(self, caption: str) -> List[str]:
        """Generate trending TikTok hashtags"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Generate 5-10 trending TikTok hashtags for: '{caption[:500]}'. Return only hashtags with # symbol, space-separated. Focus on viral and trending tags.",
                        "platform": "tiktok",
                    },
                    timeout=10.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    hashtags_str = result.get("response", "")

                    # Parse hashtags
                    hashtags = [tag.strip() for tag in hashtags_str.split() if tag.startswith('#')]

                    logger.info(f"Generated {len(hashtags)} TikTok hashtags")
                    return hashtags[:10]

        except Exception as e:
            logger.warning(f"Failed to generate TikTok hashtags: {e}")

        return []

    def prepare_video_for_tiktok(self, video_path: str, output_path: str) -> str:
        """
        Prepare video for TikTok (aspect ratio, duration, etc.)

        Args:
            video_path: Input video path
            output_path: Output video path

        Returns:
            Path to prepared video
        """
        logger.info("Preparing video for TikTok")

        try:
            clip = VideoFileClip(video_path)

            # TikTok prefers 9:16 (vertical)
            w, h = clip.size
            aspect_ratio = w / h

            if aspect_ratio < 0.5 or aspect_ratio > 0.6:
                # Need to crop to 9:16
                target_w = int(h * 9 / 16)
                x_center = w / 2
                x1 = int(x_center - target_w / 2)

                clip = clip.crop(x1=x1, width=target_w)
                logger.info(f"Cropped video to 9:16 aspect ratio")

            # Trim if too long
            if clip.duration > settings.TIKTOK_MAX_DURATION:
                clip = clip.subclip(0, settings.TIKTOK_MAX_DURATION)
                logger.info(f"Trimmed video to {settings.TIKTOK_MAX_DURATION}s")

            # Export
            clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                preset='medium',
            )

            clip.close()

            logger.info(f"✅ Video prepared for TikTok: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to prepare TikTok video: {e}")
            raise
