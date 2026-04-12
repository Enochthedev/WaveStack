"""
Facebook Publisher
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx
import requests

from ..config import settings

logger = logging.getLogger(__name__)


class FacebookPublisher:
    """Publish content to Facebook Pages"""

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.access_token = None
        self.page_id = None
        self.graph_url = "https://graph.facebook.com/v18.0"

    async def set_credentials(self, access_token: str, page_id: str):
        """
        Set Facebook credentials

        Args:
            access_token: Page access token
            page_id: Facebook Page ID
        """
        self.access_token = access_token
        self.page_id = page_id
        logger.info(f"Facebook credentials configured for page {page_id}")

    async def post_text(
        self,
        message: str,
        link: Optional[str] = None,
        use_ai_message: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a text status to Facebook Page

        Args:
            message: Status message
            link: Optional link to share
            use_ai_message: Enhance message with AI

        Returns:
            Post metadata
        """
        logger.info("Posting text to Facebook")

        try:
            # Enhance message with AI
            if use_ai_message and settings.USE_AI_CAPTIONS:
                message = await self._enhance_message(message)

            # Prepare post data
            data = {
                "message": message,
                "access_token": self.access_token,
            }

            if link:
                data["link"] = link

            # Post to Facebook
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.graph_url}/{self.page_id}/feed",
                    data=data,
                    timeout=30.0,
                )

                if response.status_code != 200:
                    raise Exception(f"Facebook API error: {response.text}")

                result = response.json()
                post_id = result.get("id")

                logger.info(f"✅ Facebook post published: {post_id}")

                return {
                    "platform": "facebook",
                    "post_id": post_id,
                    "post_type": "text",
                    "message": message,
                    "url": f"https://www.facebook.com/{post_id}",
                }

        except Exception as e:
            logger.error(f"Failed to post to Facebook: {e}")
            raise

    async def post_photo(
        self,
        photo_path: str,
        caption: str,
        use_ai_caption: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a photo to Facebook Page

        Args:
            photo_path: Path to photo file
            caption: Photo caption
            use_ai_caption: Enhance caption with AI

        Returns:
            Post metadata
        """
        logger.info("Posting photo to Facebook")

        try:
            # Enhance caption with AI
            if use_ai_caption and settings.USE_AI_CAPTIONS:
                caption = await self._enhance_message(caption)

            # Upload photo
            with open(photo_path, 'rb') as photo_file:
                files = {'source': photo_file}
                data = {
                    'message': caption,
                    'access_token': self.access_token,
                }

                response = requests.post(
                    f"{self.graph_url}/{self.page_id}/photos",
                    files=files,
                    data=data,
                    timeout=60,
                )

            if response.status_code != 200:
                raise Exception(f"Facebook API error: {response.text}")

            result = response.json()
            post_id = result.get("id")

            logger.info(f"✅ Facebook photo posted: {post_id}")

            return {
                "platform": "facebook",
                "post_id": post_id,
                "post_type": "photo",
                "caption": caption,
                "url": f"https://www.facebook.com/{post_id}",
            }

        except Exception as e:
            logger.error(f"Failed to post Facebook photo: {e}")
            raise

    async def post_video(
        self,
        video_path: str,
        title: str,
        description: str,
        use_ai_metadata: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a video to Facebook Page

        Args:
            video_path: Path to video file
            title: Video title
            description: Video description
            use_ai_metadata: Enhance metadata with AI

        Returns:
            Post metadata
        """
        logger.info("Posting video to Facebook")

        try:
            # Enhance metadata with AI
            if use_ai_metadata and settings.USE_AI_CAPTIONS:
                description = await self._enhance_message(description)

            # Step 1: Initialize upload session
            async with httpx.AsyncClient() as client:
                init_response = await client.post(
                    f"{self.graph_url}/{self.page_id}/videos",
                    data={
                        "upload_phase": "start",
                        "access_token": self.access_token,
                        "file_size": Path(video_path).stat().st_size,
                    },
                    timeout=30.0,
                )

                if init_response.status_code != 200:
                    raise Exception(f"Upload init failed: {init_response.text}")

                init_result = init_response.json()
                upload_session_id = init_result.get("upload_session_id")
                video_id = init_result.get("video_id")

                logger.info(f"Facebook video upload initialized: {video_id}")

                # Step 2: Upload video file
                with open(video_path, 'rb') as video_file:
                    files = {'source': video_file}
                    data = {
                        'upload_phase': 'transfer',
                        'upload_session_id': upload_session_id,
                        'access_token': self.access_token,
                    }

                    upload_response = requests.post(
                        f"{self.graph_url}/{self.page_id}/videos",
                        files=files,
                        data=data,
                        timeout=600,  # 10 minute timeout
                    )

                if upload_response.status_code != 200:
                    raise Exception(f"Video upload failed: {upload_response.text}")

                # Step 3: Finalize upload
                finish_response = await client.post(
                    f"{self.graph_url}/{self.page_id}/videos",
                    data={
                        "upload_phase": "finish",
                        "upload_session_id": upload_session_id,
                        "access_token": self.access_token,
                        "title": title,
                        "description": description,
                    },
                    timeout=30.0,
                )

                if finish_response.status_code != 200:
                    raise Exception(f"Upload finalize failed: {finish_response.text}")

                logger.info(f"✅ Facebook video posted: {video_id}")

                return {
                    "platform": "facebook",
                    "post_id": video_id,
                    "post_type": "video",
                    "title": title,
                    "description": description,
                    "url": f"https://www.facebook.com/{video_id}",
                }

        except Exception as e:
            logger.error(f"Failed to post Facebook video: {e}")
            raise

    async def post_link(
        self,
        link: str,
        message: str,
        use_ai_message: bool = True,
    ) -> Dict[str, Any]:
        """
        Share a link on Facebook Page

        Args:
            link: URL to share
            message: Post message
            use_ai_message: Enhance message with AI

        Returns:
            Post metadata
        """
        logger.info(f"Sharing link on Facebook: {link}")

        try:
            # Enhance message with AI
            if use_ai_message and settings.USE_AI_CAPTIONS:
                message = await self._enhance_message(message)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.graph_url}/{self.page_id}/feed",
                    data={
                        "link": link,
                        "message": message,
                        "access_token": self.access_token,
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    raise Exception(f"Facebook API error: {response.text}")

                result = response.json()
                post_id = result.get("id")

                logger.info(f"✅ Facebook link shared: {post_id}")

                return {
                    "platform": "facebook",
                    "post_id": post_id,
                    "post_type": "link",
                    "link": link,
                    "message": message,
                    "url": f"https://www.facebook.com/{post_id}",
                }

        except Exception as e:
            logger.error(f"Failed to share Facebook link: {e}")
            raise

    async def delete_post(self, post_id: str) -> bool:
        """
        Delete a Facebook post

        Args:
            post_id: Post ID to delete

        Returns:
            True if successful
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.graph_url}/{post_id}",
                    params={"access_token": self.access_token},
                    timeout=30.0,
                )

                if response.status_code == 200:
                    logger.info(f"✅ Facebook post {post_id} deleted")
                    return True
                else:
                    logger.error(f"Failed to delete: {response.text}")
                    return False

        except Exception as e:
            logger.error(f"Failed to delete Facebook post: {e}")
            return False

    async def get_page_insights(self, metrics: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Get Facebook Page insights/analytics

        Args:
            metrics: List of metrics to fetch (default: common metrics)

        Returns:
            Insights data
        """
        if not metrics:
            metrics = [
                "page_impressions",
                "page_engaged_users",
                "page_post_engagements",
                "page_fans",
            ]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.graph_url}/{self.page_id}/insights",
                    params={
                        "metric": ",".join(metrics),
                        "access_token": self.access_token,
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("data", [])
                else:
                    raise Exception(f"Insights fetch failed: {response.text}")

        except Exception as e:
            logger.error(f"Failed to get Facebook insights: {e}")
            raise

    async def _enhance_message(self, message: str) -> str:
        """Use AI to enhance Facebook post message"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Enhance this Facebook post for maximum engagement: '{message}'. Keep it under 5000 characters. Make it engaging and shareable.",
                        "platform": "facebook",
                    },
                    timeout=15.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_message = result.get("response", "")

                    if len(ai_message) > 10:
                        logger.info("Using AI-enhanced Facebook message")
                        return ai_message[:5000]  # Facebook limit

        except Exception as e:
            logger.warning(f"Failed to enhance Facebook message: {e}")

        return message
