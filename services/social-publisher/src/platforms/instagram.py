"""
Instagram Publisher
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from instagrapi import Client
from instagrapi.exceptions import LoginRequired
import json
import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class InstagramPublisher:
    """Publish content to Instagram"""

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.client = Client()
        self.session_file = Path(settings.SESSIONS_DIR) / f"{org_id}_instagram.json"

    async def login(self, username: str, password: str) -> bool:
        """
        Login to Instagram

        Args:
            username: Instagram username
            password: Instagram password

        Returns:
            True if successful
        """
        try:
            # Try to load existing session
            if self.session_file.exists():
                self.client.load_settings(str(self.session_file))
                logger.info(f"Loaded Instagram session for {username}")

                # Test if session is valid
                try:
                    self.client.get_timeline_feed()
                    logger.info("✅ Instagram session valid")
                    return True
                except LoginRequired:
                    logger.warning("Instagram session expired, re-logging in")

            # Login with credentials
            self.client.login(username, password)

            # Save session
            self.session_file.parent.mkdir(parents=True, exist_ok=True)
            self.client.dump_settings(str(self.session_file))

            logger.info(f"✅ Instagram login successful for {username}")
            return True

        except Exception as e:
            logger.error(f"Instagram login failed: {e}")
            return False

    async def post_photo(
        self,
        image_path: str,
        caption: str,
        location: Optional[Dict] = None,
        use_ai_caption: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a photo to Instagram

        Args:
            image_path: Path to image file
            caption: Photo caption
            location: Location dict with name, lat, lng
            use_ai_caption: Enhance caption with AI

        Returns:
            Post metadata
        """
        logger.info("Posting photo to Instagram")

        try:
            # Enhance caption with AI
            if use_ai_caption and settings.USE_AI_CAPTIONS:
                caption = await self._enhance_caption(caption, "instagram_photo")

            # Add hashtags
            if settings.USE_AI_HASHTAGS:
                hashtags = await self._generate_hashtags(caption)
                caption = f"{caption}\n\n{' '.join(hashtags)}"

            # Upload photo
            media = self.client.photo_upload(
                path=image_path,
                caption=caption,
                extra_data=location,
            )

            logger.info(f"✅ Instagram photo posted: {media.pk}")

            return {
                "platform": "instagram",
                "post_id": media.pk,
                "post_type": "photo",
                "url": f"https://www.instagram.com/p/{media.code}/",
                "caption": caption,
            }

        except Exception as e:
            logger.error(f"Failed to post Instagram photo: {e}")
            raise

    async def post_video(
        self,
        video_path: str,
        caption: str,
        thumbnail_path: Optional[str] = None,
        location: Optional[Dict] = None,
        use_ai_caption: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a video to Instagram (Reels)

        Args:
            video_path: Path to video file
            caption: Video caption
            thumbnail_path: Optional custom thumbnail
            location: Location data
            use_ai_caption: Enhance caption with AI

        Returns:
            Post metadata
        """
        logger.info("Posting video to Instagram")

        try:
            # Enhance caption with AI
            if use_ai_caption and settings.USE_AI_CAPTIONS:
                caption = await self._enhance_caption(caption, "instagram_reel")

            # Add hashtags
            if settings.USE_AI_HASHTAGS:
                hashtags = await self._generate_hashtags(caption)
                caption = f"{caption}\n\n{' '.join(hashtags)}"

            # Upload as Reel (better reach than regular video)
            media = self.client.clip_upload(
                path=video_path,
                caption=caption,
                thumbnail=thumbnail_path,
                extra_data=location,
            )

            logger.info(f"✅ Instagram reel posted: {media.pk}")

            return {
                "platform": "instagram",
                "post_id": media.pk,
                "post_type": "reel",
                "url": f"https://www.instagram.com/reel/{media.code}/",
                "caption": caption,
            }

        except Exception as e:
            logger.error(f"Failed to post Instagram video: {e}")
            raise

    async def post_carousel(
        self,
        media_paths: List[str],
        caption: str,
        location: Optional[Dict] = None,
        use_ai_caption: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a carousel (multiple photos/videos)

        Args:
            media_paths: List of image/video paths
            caption: Carousel caption
            location: Location data
            use_ai_caption: Enhance caption with AI

        Returns:
            Post metadata
        """
        logger.info(f"Posting carousel to Instagram ({len(media_paths)} items)")

        try:
            # Enhance caption with AI
            if use_ai_caption and settings.USE_AI_CAPTIONS:
                caption = await self._enhance_caption(caption, "instagram_carousel")

            # Add hashtags
            if settings.USE_AI_HASHTAGS:
                hashtags = await self._generate_hashtags(caption)
                caption = f"{caption}\n\n{' '.join(hashtags)}"

            # Upload album
            media = self.client.album_upload(
                paths=media_paths,
                caption=caption,
                extra_data=location,
            )

            logger.info(f"✅ Instagram carousel posted: {media.pk}")

            return {
                "platform": "instagram",
                "post_id": media.pk,
                "post_type": "carousel",
                "url": f"https://www.instagram.com/p/{media.code}/",
                "caption": caption,
                "media_count": len(media_paths),
            }

        except Exception as e:
            logger.error(f"Failed to post Instagram carousel: {e}")
            raise

    async def post_story(
        self,
        media_path: str,
        mentions: Optional[List[str]] = None,
        locations: Optional[List[Dict]] = None,
        hashtags: Optional[List[str]] = None,
        links: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Post to Instagram Story

        Args:
            media_path: Path to image or video
            mentions: List of usernames to mention
            locations: List of location stickers
            hashtags: List of hashtags
            links: List of link stickers (requires business account)

        Returns:
            Story metadata
        """
        logger.info("Posting story to Instagram")

        try:
            # Determine media type
            media_type = "photo" if media_path.lower().endswith(('.jpg', '.jpeg', '.png')) else "video"

            if media_type == "photo":
                story = self.client.photo_upload_to_story(
                    path=media_path,
                    mentions=mentions or [],
                    locations=locations or [],
                    hashtags=hashtags or [],
                    links=links or [],
                )
            else:
                story = self.client.video_upload_to_story(
                    path=media_path,
                    mentions=mentions or [],
                    locations=locations or [],
                    hashtags=hashtags or [],
                    links=links or [],
                )

            logger.info(f"✅ Instagram story posted: {story.pk}")

            return {
                "platform": "instagram",
                "post_id": story.pk,
                "post_type": "story",
                "media_type": media_type,
            }

        except Exception as e:
            logger.error(f"Failed to post Instagram story: {e}")
            raise

    async def delete_post(self, media_id: str) -> bool:
        """Delete a post"""
        try:
            self.client.media_delete(media_id)
            logger.info(f"✅ Instagram post {media_id} deleted")
            return True
        except Exception as e:
            logger.error(f"Failed to delete Instagram post: {e}")
            return False

    async def get_user_info(self, username: str) -> Dict[str, Any]:
        """Get user profile info"""
        try:
            user = self.client.user_info_by_username(username)
            return {
                "username": user.username,
                "full_name": user.full_name,
                "biography": user.biography,
                "followers": user.follower_count,
                "following": user.following_count,
                "posts": user.media_count,
            }
        except Exception as e:
            logger.error(f"Failed to get Instagram user info: {e}")
            raise

    async def _enhance_caption(self, caption: str, post_type: str) -> str:
        """Use AI to enhance caption"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Enhance this {post_type} caption for maximum engagement: '{caption}'. Keep it under 2200 characters. Make it engaging and authentic.",
                        "platform": "instagram",
                    },
                    timeout=15.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_caption = result.get("response", "")

                    if len(ai_caption) > 10:
                        logger.info("Using AI-enhanced Instagram caption")
                        return ai_caption[:2200]  # Instagram limit

        except Exception as e:
            logger.warning(f"Failed to enhance caption: {e}")

        return caption

    async def _generate_hashtags(self, caption: str) -> List[str]:
        """Generate relevant hashtags with AI"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Generate 10-20 relevant Instagram hashtags for: '{caption[:500]}'. Return only hashtags with # symbol, space-separated.",
                        "platform": "instagram",
                    },
                    timeout=10.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    hashtags_str = result.get("response", "")

                    # Parse hashtags
                    hashtags = [tag.strip() for tag in hashtags_str.split() if tag.startswith('#')]

                    logger.info(f"Generated {len(hashtags)} Instagram hashtags")
                    return hashtags[:30]  # Instagram allows up to 30

        except Exception as e:
            logger.warning(f"Failed to generate hashtags: {e}")

        return []
