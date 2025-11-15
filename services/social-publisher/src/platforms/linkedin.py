"""
LinkedIn Publisher
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx
import requests
import base64

from ..config import settings

logger = logging.getLogger(__name__)


class LinkedInPublisher:
    """Publish content to LinkedIn"""

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.access_token = None
        self.person_urn = None  # LinkedIn person URN
        self.api_url = "https://api.linkedin.com/v2"

    async def set_credentials(self, access_token: str):
        """
        Set LinkedIn credentials

        Args:
            access_token: LinkedIn access token
        """
        self.access_token = access_token

        # Get person URN
        await self._get_person_urn()

        logger.info(f"LinkedIn credentials configured: {self.person_urn}")

    async def _get_person_urn(self):
        """Get the authenticated user's LinkedIn person URN"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/me",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    self.person_urn = f"urn:li:person:{result['id']}"
                else:
                    raise Exception(f"Failed to get person URN: {response.text}")

        except Exception as e:
            logger.error(f"Failed to get LinkedIn person URN: {e}")
            raise

    async def post_text(
        self,
        text: str,
        visibility: str = "PUBLIC",  # PUBLIC, CONNECTIONS
        use_ai_text: bool = True,
    ) -> Dict[str, Any]:
        """
        Post text to LinkedIn

        Args:
            text: Post content
            visibility: Post visibility
            use_ai_text: Enhance text with AI

        Returns:
            Post metadata
        """
        logger.info("Posting text to LinkedIn")

        try:
            # Enhance text with AI
            if use_ai_text and settings.USE_AI_CAPTIONS:
                text = await self._enhance_text(text)

            # Prepare post data
            post_data = {
                "author": self.person_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": text
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": visibility
                }
            }

            # Post to LinkedIn
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/ugcPosts",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json=post_data,
                    timeout=30.0,
                )

                if response.status_code != 201:
                    raise Exception(f"LinkedIn API error: {response.text}")

                result = response.json()
                post_id = result.get("id")

                logger.info(f"✅ LinkedIn post published: {post_id}")

                return {
                    "platform": "linkedin",
                    "post_id": post_id,
                    "post_type": "text",
                    "text": text,
                    "visibility": visibility,
                }

        except Exception as e:
            logger.error(f"Failed to post to LinkedIn: {e}")
            raise

    async def post_link(
        self,
        text: str,
        link_url: str,
        visibility: str = "PUBLIC",
        use_ai_text: bool = True,
    ) -> Dict[str, Any]:
        """
        Share a link on LinkedIn

        Args:
            text: Post commentary
            link_url: URL to share
            visibility: Post visibility
            use_ai_text: Enhance text with AI

        Returns:
            Post metadata
        """
        logger.info(f"Sharing link on LinkedIn: {link_url}")

        try:
            # Enhance text with AI
            if use_ai_text and settings.USE_AI_CAPTIONS:
                text = await self._enhance_text(text)

            # Prepare post data
            post_data = {
                "author": self.person_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": text
                        },
                        "shareMediaCategory": "ARTICLE",
                        "media": [
                            {
                                "status": "READY",
                                "originalUrl": link_url
                            }
                        ]
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": visibility
                }
            }

            # Post to LinkedIn
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/ugcPosts",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json=post_data,
                    timeout=30.0,
                )

                if response.status_code != 201:
                    raise Exception(f"LinkedIn API error: {response.text}")

                result = response.json()
                post_id = result.get("id")

                logger.info(f"✅ LinkedIn link shared: {post_id}")

                return {
                    "platform": "linkedin",
                    "post_id": post_id,
                    "post_type": "link",
                    "text": text,
                    "link": link_url,
                    "visibility": visibility,
                }

        except Exception as e:
            logger.error(f"Failed to share LinkedIn link: {e}")
            raise

    async def post_image(
        self,
        text: str,
        image_path: str,
        visibility: str = "PUBLIC",
        use_ai_text: bool = True,
    ) -> Dict[str, Any]:
        """
        Post an image to LinkedIn

        Args:
            text: Post caption
            image_path: Path to image file
            visibility: Post visibility
            use_ai_text: Enhance text with AI

        Returns:
            Post metadata
        """
        logger.info("Posting image to LinkedIn")

        try:
            # Enhance text with AI
            if use_ai_text and settings.USE_AI_CAPTIONS:
                text = await self._enhance_text(text)

            # Step 1: Register upload
            register_data = {
                "registerUploadRequest": {
                    "recipes": [
                        "urn:li:digitalmediaRecipe:feedshare-image"
                    ],
                    "owner": self.person_urn,
                    "serviceRelationships": [
                        {
                            "relationshipType": "OWNER",
                            "identifier": "urn:li:userGeneratedContent"
                        }
                    ]
                }
            }

            async with httpx.AsyncClient() as client:
                register_response = await client.post(
                    f"{self.api_url}/assets?action=registerUpload",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                    },
                    json=register_data,
                    timeout=30.0,
                )

                if register_response.status_code != 200:
                    raise Exception(f"Upload registration failed: {register_response.text}")

                register_result = register_response.json()
                upload_url = register_result["value"]["uploadMechanism"][
                    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
                asset = register_result["value"]["asset"]

                # Step 2: Upload image
                with open(image_path, 'rb') as image_file:
                    upload_response = requests.put(
                        upload_url,
                        headers={
                            "Authorization": f"Bearer {self.access_token}",
                        },
                        data=image_file.read(),
                        timeout=60,
                    )

                if upload_response.status_code != 201:
                    raise Exception(f"Image upload failed: {upload_response.status_code}")

                # Step 3: Create post with image
                post_data = {
                    "author": self.person_urn,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {
                                "text": text
                            },
                            "shareMediaCategory": "IMAGE",
                            "media": [
                                {
                                    "status": "READY",
                                    "media": asset
                                }
                            ]
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": visibility
                    }
                }

                post_response = await client.post(
                    f"{self.api_url}/ugcPosts",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json=post_data,
                    timeout=30.0,
                )

                if post_response.status_code != 201:
                    raise Exception(f"Post creation failed: {post_response.text}")

                result = post_response.json()
                post_id = result.get("id")

                logger.info(f"✅ LinkedIn image posted: {post_id}")

                return {
                    "platform": "linkedin",
                    "post_id": post_id,
                    "post_type": "image",
                    "text": text,
                    "visibility": visibility,
                }

        except Exception as e:
            logger.error(f"Failed to post LinkedIn image: {e}")
            raise

    async def post_video(
        self,
        text: str,
        video_path: str,
        visibility: str = "PUBLIC",
        use_ai_text: bool = True,
    ) -> Dict[str, Any]:
        """
        Post a video to LinkedIn

        Args:
            text: Post caption
            video_path: Path to video file
            visibility: Post visibility
            use_ai_text: Enhance text with AI

        Returns:
            Post metadata
        """
        logger.info("Posting video to LinkedIn")

        try:
            # Enhance text with AI
            if use_ai_text and settings.USE_AI_CAPTIONS:
                text = await self._enhance_text(text)

            video_size = Path(video_path).stat().st_size

            # Step 1: Register video upload
            register_data = {
                "registerUploadRequest": {
                    "recipes": [
                        "urn:li:digitalmediaRecipe:feedshare-video"
                    ],
                    "owner": self.person_urn,
                    "serviceRelationships": [
                        {
                            "relationshipType": "OWNER",
                            "identifier": "urn:li:userGeneratedContent"
                        }
                    ]
                }
            }

            async with httpx.AsyncClient() as client:
                register_response = await client.post(
                    f"{self.api_url}/assets?action=registerUpload",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                    },
                    json=register_data,
                    timeout=30.0,
                )

                if register_response.status_code != 200:
                    raise Exception(f"Video registration failed: {register_response.text}")

                register_result = register_response.json()
                upload_url = register_result["value"]["uploadMechanism"][
                    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
                asset = register_result["value"]["asset"]

                # Step 2: Upload video
                with open(video_path, 'rb') as video_file:
                    upload_response = requests.put(
                        upload_url,
                        headers={
                            "Authorization": f"Bearer {self.access_token}",
                        },
                        data=video_file.read(),
                        timeout=600,  # 10 minute timeout
                    )

                if upload_response.status_code != 201:
                    raise Exception(f"Video upload failed: {upload_response.status_code}")

                # Step 3: Create post with video
                post_data = {
                    "author": self.person_urn,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {
                                "text": text
                            },
                            "shareMediaCategory": "VIDEO",
                            "media": [
                                {
                                    "status": "READY",
                                    "media": asset
                                }
                            ]
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": visibility
                    }
                }

                post_response = await client.post(
                    f"{self.api_url}/ugcPosts",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json=post_data,
                    timeout=30.0,
                )

                if post_response.status_code != 201:
                    raise Exception(f"Post creation failed: {post_response.text}")

                result = post_response.json()
                post_id = result.get("id")

                logger.info(f"✅ LinkedIn video posted: {post_id}")

                return {
                    "platform": "linkedin",
                    "post_id": post_id,
                    "post_type": "video",
                    "text": text,
                    "visibility": visibility,
                }

        except Exception as e:
            logger.error(f"Failed to post LinkedIn video: {e}")
            raise

    async def delete_post(self, post_id: str) -> bool:
        """
        Delete a LinkedIn post

        Args:
            post_id: Post URN

        Returns:
            True if successful
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_url}/ugcPosts/{post_id}",
                    headers={
                        "Authorization": f"Bearer {self.access_token}",
                    },
                    timeout=30.0,
                )

                if response.status_code == 204:
                    logger.info(f"✅ LinkedIn post {post_id} deleted")
                    return True
                else:
                    logger.error(f"Failed to delete: {response.text}")
                    return False

        except Exception as e:
            logger.error(f"Failed to delete LinkedIn post: {e}")
            return False

    async def _enhance_text(self, text: str) -> str:
        """Use AI to enhance LinkedIn post text"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Enhance this LinkedIn post for professional engagement: '{text}'. Keep it under 3000 characters. Make it professional, insightful, and valuable.",
                        "platform": "linkedin",
                    },
                    timeout=15.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_text = result.get("response", "")

                    if len(ai_text) > 10:
                        logger.info("Using AI-enhanced LinkedIn text")
                        return ai_text[:3000]  # LinkedIn limit

        except Exception as e:
            logger.warning(f"Failed to enhance LinkedIn text: {e}")

        return text
