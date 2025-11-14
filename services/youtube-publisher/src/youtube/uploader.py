"""
YouTube Video Uploader
"""
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
import httpx

from ..config import settings
from .auth import YouTubeAuth

logger = logging.getLogger(__name__)


class YouTubeUploader:
    """Upload videos to YouTube"""

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.auth = YouTubeAuth(org_id)

    async def upload_video(
        self,
        video_path: str,
        title: str,
        description: Optional[str] = None,
        tags: Optional[list[str]] = None,
        category: Optional[str] = None,
        privacy: Optional[str] = None,
        thumbnail_path: Optional[str] = None,
        playlist_id: Optional[str] = None,
        publish_at: Optional[str] = None,
        use_ai_metadata: bool = True,
    ) -> Dict[str, Any]:
        """
        Upload a video to YouTube

        Args:
            video_path: Path to video file
            title: Video title
            description: Video description
            tags: List of tags
            category: YouTube category ID
            privacy: private, unlisted, or public
            thumbnail_path: Path to thumbnail image
            playlist_id: Add to playlist
            publish_at: ISO 8601 datetime for scheduled publishing
            use_ai_metadata: Use AI to enhance metadata

        Returns:
            Video metadata including video ID
        """
        logger.info(f"Uploading video: {title}")

        # Get YouTube service
        try:
            youtube = self.auth.get_youtube_service()
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            raise ValueError("YouTube authentication required")

        # Enhance metadata with AI if enabled
        if use_ai_metadata and settings.USE_AI_DESCRIPTIONS:
            description = await self._enhance_description(title, description)

        if use_ai_metadata and settings.USE_AI_TAGS:
            tags = await self._generate_tags(title, description, tags)

        # Prepare video metadata
        body = {
            'snippet': {
                'title': title[:100],  # YouTube limit
                'description': description or "",
                'tags': tags or [],
                'categoryId': category or settings.DEFAULT_CATEGORY,
            },
            'status': {
                'privacyStatus': privacy or settings.DEFAULT_PRIVACY,
                'selfDeclaredMadeForKids': False,
            }
        }

        # Add scheduled publish time if provided
        if publish_at:
            body['status']['publishAt'] = publish_at
            body['status']['privacyStatus'] = 'private'  # Must be private for scheduling

        # Prepare media upload
        media = MediaFileUpload(
            video_path,
            chunksize=settings.CHUNK_SIZE,
            resumable=True
        )

        # Execute upload
        try:
            request = youtube.videos().insert(
                part=','.join(body.keys()),
                body=body,
                media_body=media
            )

            response = self._resumable_upload(request)

            video_id = response['id']
            logger.info(f"✅ Video uploaded successfully: {video_id}")

            # Upload thumbnail if provided
            if thumbnail_path:
                await self.upload_thumbnail(video_id, thumbnail_path)
            elif settings.AUTO_GENERATE_THUMBNAILS:
                # Generate and upload AI thumbnail
                await self._auto_generate_thumbnail(video_id, title, description, tags)

            # Add to playlist if specified
            if playlist_id:
                await self.add_to_playlist(video_id, playlist_id)

            return {
                'video_id': video_id,
                'title': title,
                'url': f'https://www.youtube.com/watch?v={video_id}',
                'status': response['status']['uploadStatus'],
                'privacy': response['status']['privacyStatus'],
            }

        except HttpError as e:
            logger.error(f"YouTube API error: {e}")
            raise

    def _resumable_upload(self, request):
        """Execute resumable upload with retry logic"""
        response = None
        error = None
        retry = 0

        while response is None:
            try:
                logger.info(f"Uploading chunk... (attempt {retry + 1})")
                status, response = request.next_chunk()

                if status:
                    progress = int(status.progress() * 100)
                    logger.info(f"Upload progress: {progress}%")

            except HttpError as e:
                if e.resp.status in [500, 502, 503, 504]:
                    # Retryable errors
                    error = f"Retryable error {e.resp.status}: {e}"
                    logger.warning(error)

                    retry += 1
                    if retry > settings.MAX_RETRIES:
                        logger.error("Max retries exceeded")
                        raise

                else:
                    # Non-retryable error
                    logger.error(f"Non-retryable error: {e}")
                    raise

        return response

    async def upload_thumbnail(self, video_id: str, thumbnail_path: str) -> bool:
        """
        Upload a thumbnail for a video

        Args:
            video_id: YouTube video ID
            thumbnail_path: Path to thumbnail image

        Returns:
            True if successful
        """
        logger.info(f"Uploading thumbnail for video {video_id}")

        try:
            youtube = self.auth.get_youtube_service()

            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(thumbnail_path)
            ).execute()

            logger.info(f"✅ Thumbnail uploaded for video {video_id}")
            return True

        except HttpError as e:
            logger.error(f"Failed to upload thumbnail: {e}")
            return False

    async def _auto_generate_thumbnail(
        self,
        video_id: str,
        title: str,
        description: Optional[str],
        tags: Optional[list[str]],
    ):
        """Generate and upload thumbnail using thumbnail generator service"""
        try:
            async with httpx.AsyncClient() as client:
                # Generate thumbnail
                response = await client.post(
                    f"{settings.THUMBNAIL_GENERATOR_URL}/api/v1/thumbnails/generate",
                    json={
                        "title": title,
                        "description": description,
                        "tags": tags,
                        "template": "bold",  # Default template
                        "org_id": self.org_id,
                    },
                    timeout=120.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    cache_key = result.get('cache_key')

                    # Download thumbnail
                    thumb_response = await client.get(
                        f"{settings.THUMBNAIL_GENERATOR_URL}/api/v1/thumbnails/{cache_key}",
                        timeout=30.0,
                    )

                    if thumb_response.status_code == 200:
                        # Save temporarily
                        temp_path = Path(settings.TEMP_DIR) / f"{video_id}_thumbnail.png"
                        temp_path.parent.mkdir(parents=True, exist_ok=True)

                        with open(temp_path, 'wb') as f:
                            f.write(thumb_response.content)

                        # Upload to YouTube
                        await self.upload_thumbnail(video_id, str(temp_path))

                        # Cleanup
                        temp_path.unlink()

                        logger.info(f"✅ Auto-generated thumbnail uploaded for {video_id}")

        except Exception as e:
            logger.error(f"Failed to auto-generate thumbnail: {e}")

    async def update_video(
        self,
        video_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[list[str]] = None,
        privacy: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update video metadata

        Args:
            video_id: YouTube video ID
            title: New title
            description: New description
            tags: New tags
            privacy: New privacy status

        Returns:
            Updated video metadata
        """
        logger.info(f"Updating video {video_id}")

        try:
            youtube = self.auth.get_youtube_service()

            # Get current video data
            video_response = youtube.videos().list(
                part='snippet,status',
                id=video_id
            ).execute()

            if not video_response['items']:
                raise ValueError(f"Video {video_id} not found")

            video = video_response['items'][0]

            # Update fields
            if title:
                video['snippet']['title'] = title[:100]

            if description:
                video['snippet']['description'] = description

            if tags:
                video['snippet']['tags'] = tags

            if privacy:
                video['status']['privacyStatus'] = privacy

            # Execute update
            update_response = youtube.videos().update(
                part='snippet,status',
                body=video
            ).execute()

            logger.info(f"✅ Video {video_id} updated successfully")

            return {
                'video_id': video_id,
                'title': update_response['snippet']['title'],
                'privacy': update_response['status']['privacyStatus'],
            }

        except HttpError as e:
            logger.error(f"Failed to update video: {e}")
            raise

    async def delete_video(self, video_id: str) -> bool:
        """
        Delete a video from YouTube

        Args:
            video_id: YouTube video ID

        Returns:
            True if successful
        """
        logger.info(f"Deleting video {video_id}")

        try:
            youtube = self.auth.get_youtube_service()

            youtube.videos().delete(id=video_id).execute()

            logger.info(f"✅ Video {video_id} deleted")
            return True

        except HttpError as e:
            logger.error(f"Failed to delete video: {e}")
            return False

    async def add_to_playlist(self, video_id: str, playlist_id: str) -> bool:
        """Add video to a playlist"""
        try:
            youtube = self.auth.get_youtube_service()

            youtube.playlistItems().insert(
                part='snippet',
                body={
                    'snippet': {
                        'playlistId': playlist_id,
                        'resourceId': {
                            'kind': 'youtube#video',
                            'videoId': video_id,
                        }
                    }
                }
            ).execute()

            logger.info(f"✅ Video {video_id} added to playlist {playlist_id}")
            return True

        except HttpError as e:
            logger.error(f"Failed to add to playlist: {e}")
            return False

    async def _enhance_description(
        self,
        title: str,
        description: Optional[str],
    ) -> str:
        """Use AI to enhance video description"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Write an engaging YouTube video description for: '{title}'. Current description: '{description or 'None'}'. Keep it under 2000 characters.",
                        "platform": "youtube",
                    },
                    timeout=15.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_description = result.get("response", "")

                    # Use AI description if better than original
                    if len(ai_description) > len(description or ""):
                        logger.info("Using AI-enhanced description")
                        return ai_description[:5000]  # YouTube limit

        except Exception as e:
            logger.warning(f"Failed to enhance description with AI: {e}")

        return description or ""

    async def _generate_tags(
        self,
        title: str,
        description: Optional[str],
        existing_tags: Optional[list[str]],
    ) -> list[str]:
        """Use AI to generate video tags"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Generate 10-15 relevant YouTube tags for video: '{title}'. Description: '{description or 'None'}'. Return only comma-separated tags.",
                        "platform": "youtube",
                    },
                    timeout=10.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_tags_str = result.get("response", "")

                    # Parse tags
                    ai_tags = [tag.strip() for tag in ai_tags_str.split(',')]

                    # Combine with existing tags
                    all_tags = list(set((existing_tags or []) + ai_tags))

                    logger.info(f"Generated {len(ai_tags)} AI tags")
                    return all_tags[:500]  # YouTube allows up to 500 chars

        except Exception as e:
            logger.warning(f"Failed to generate tags with AI: {e}")

        return existing_tags or []
