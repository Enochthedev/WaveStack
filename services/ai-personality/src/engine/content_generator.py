"""
Content Generator
Generates social media content in the creator's voice with sentiment analysis
"""
import logging
import random
from typing import Optional, Dict, Any, List
from datetime import datetime

from textblob import TextBlob
from prisma import Prisma
from redis.asyncio import Redis
import tweepy

from ..config import settings
from .personality import PersonalityEngine

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generates platform-specific content in creator's voice"""

    def __init__(self, db: Prisma, redis: Redis, personality: PersonalityEngine):
        self.db = db
        self.redis = redis
        self.personality = personality
        self.twitter_client: Optional[tweepy.Client] = None

    async def initialize(self):
        """Initialize content generator and social media clients"""
        try:
            # Initialize Twitter client
            if all([
                settings.TWITTER_API_KEY,
                settings.TWITTER_API_SECRET,
                settings.TWITTER_ACCESS_TOKEN,
                settings.TWITTER_ACCESS_SECRET
            ]):
                self.twitter_client = tweepy.Client(
                    consumer_key=settings.TWITTER_API_KEY,
                    consumer_secret=settings.TWITTER_API_SECRET,
                    access_token=settings.TWITTER_ACCESS_TOKEN,
                    access_token_secret=settings.TWITTER_ACCESS_SECRET,
                    bearer_token=settings.TWITTER_BEARER_TOKEN
                )
                logger.info("Twitter client initialized")

        except Exception as e:
            logger.error(f"Error initializing content generator: {e}", exc_info=True)

    async def generate_tweet(
        self,
        user_id: str,
        topic: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Generate a tweet in creator's voice"""
        try:
            # Build prompt
            if topic:
                prompt = f"Write a tweet about: {topic}"
            else:
                prompt = "Write a tweet about something interesting or funny"

            # Add context from recent content
            recent_tweets = await self._get_recent_content(user_id, "twitter", 5)
            if recent_tweets:
                prompt += "\n\nRecent tweets for reference (don't repeat):\n"
                prompt += "\n".join([f"- {t.generatedText}" for t in recent_tweets])

            # Generate content
            tweet_text = await self.personality.generate_response(
                user_id,
                prompt,
                {"platform": "twitter", **(context or {})}
            )

            if not tweet_text:
                return None

            # Analyze sentiment
            sentiment = self._analyze_sentiment(tweet_text)

            # Check controversy
            if settings.CONTROVERSY_AVOIDANCE and sentiment < settings.NEGATIVITY_THRESHOLD:
                logger.warning(f"Tweet rejected due to negative sentiment: {sentiment}")
                return None

            # Add hashtags if needed
            tweet_text = await self._add_hashtags(user_id, tweet_text)

            # Store generated content
            content = await self.db.generatedcontent.create(
                data={
                    "userId": user_id,
                    "platform": "twitter",
                    "contentType": "tweet",
                    "prompt": prompt,
                    "generatedText": tweet_text,
                    "model": settings.AI_PROVIDER,
                    "temperature": settings.PERSONALITY_TEMPERATURE,
                    "sentiment": sentiment,
                    "status": "draft"
                }
            )

            logger.info(f"Tweet generated: {content.id} (sentiment={sentiment:.2f})")

            return {
                "id": content.id,
                "text": tweet_text,
                "sentiment": sentiment,
                "status": "draft"
            }

        except Exception as e:
            logger.error(f"Error generating tweet: {e}", exc_info=True)
            return None

    async def post_to_twitter(
        self,
        user_id: str,
        content_id: str,
        auto_approve: bool = False
    ) -> bool:
        """Post generated content to Twitter"""
        try:
            if not self.twitter_client:
                logger.error("Twitter client not initialized")
                return False

            # Get content
            content = await self.db.generatedcontent.find_unique(
                where={"id": content_id}
            )

            if not content:
                logger.error(f"Content not found: {content_id}")
                return False

            # Check approval
            if not auto_approve and not content.approved:
                logger.warning(f"Content not approved: {content_id}")
                return False

            # Post to Twitter
            response = self.twitter_client.create_tweet(text=content.generatedText)

            # Update content
            await self.db.generatedcontent.update(
                where={"id": content_id},
                data={
                    "status": "posted",
                    "postedAt": datetime.now(),
                    "postId": str(response.data["id"])
                }
            )

            logger.info(f"Posted to Twitter: {content_id} -> {response.data['id']}")
            return True

        except Exception as e:
            logger.error(f"Error posting to Twitter: {e}", exc_info=True)
            return False

    async def generate_response_suggestion(
        self,
        user_id: str,
        platform: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Generate a suggested response to a message"""
        try:
            response = await self.personality.generate_response(
                user_id,
                message,
                {"platform": platform, **(context or {})}
            )

            # Analyze sentiment
            if response and settings.SENTIMENT_FILTERING:
                sentiment = self._analyze_sentiment(response)
                if sentiment < settings.NEGATIVITY_THRESHOLD:
                    logger.warning(f"Response rejected due to negative sentiment: {sentiment}")
                    return None

            return response

        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            return None

    async def schedule_content(
        self,
        user_id: str,
        frequency_hours: Optional[int] = None
    ):
        """Schedule content generation and posting"""
        try:
            freq = frequency_hours or settings.POST_FREQUENCY_HOURS

            # Check if auto-posting is enabled
            if not settings.AUTO_POST_TWITTER:
                logger.info("Auto-posting is disabled")
                return

            # Get last post time
            last_post = await self.db.generatedcontent.find_first(
                where={"userId": user_id, "status": "posted"},
                order={"postedAt": "desc"}
            )

            # Check if it's time to post
            if last_post:
                hours_since = (datetime.now() - last_post.postedAt).total_seconds() / 3600
                if hours_since < freq:
                    logger.info(f"Too soon to post (last: {hours_since:.1f}h ago)")
                    return

            # Generate and post tweet
            tweet = await self.generate_tweet(user_id)
            if tweet and tweet.get("sentiment", 0) >= settings.MIN_ENGAGEMENT_SCORE:
                await self.post_to_twitter(user_id, tweet["id"], auto_approve=True)

        except Exception as e:
            logger.error(f"Error scheduling content: {e}", exc_info=True)

    def _analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment (-1 to 1)"""
        try:
            blob = TextBlob(text)
            return blob.sentiment.polarity
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return 0.0

    async def _add_hashtags(self, user_id: str, text: str) -> str:
        """Add relevant hashtags to content"""
        try:
            # Get profile to understand common topics
            profile = await self.db.personalityprofile.find_unique(
                where={"userId": user_id}
            )

            if not profile or "#" in text:  # Already has hashtags
                return text

            # Extract topics from profile
            topics = profile.topics if isinstance(profile.topics, dict) else {}
            if not topics:
                return text

            # Get relevant hashtags
            hashtags = list(topics.keys())[:settings.HASHTAG_LIMIT]

            # Add hashtags
            if hashtags:
                text += "\n\n" + " ".join([f"#{tag}" for tag in hashtags])

            return text

        except Exception as e:
            logger.error(f"Error adding hashtags: {e}")
            return text

    async def _get_recent_content(
        self,
        user_id: str,
        platform: str,
        limit: int = 5
    ) -> List[Any]:
        """Get recent generated content"""
        try:
            return await self.db.generatedcontent.find_many(
                where={"userId": user_id, "platform": platform, "status": "posted"},
                order={"postedAt": "desc"},
                take=limit
            )
        except Exception as e:
            logger.error(f"Error getting recent content: {e}")
            return []
