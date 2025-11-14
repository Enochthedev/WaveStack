"""
Content Generator
Generates social media content in the creator's voice with sentiment analysis
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from prisma import Prisma
import redis.asyncio as redis
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.config import settings
from app.engine.personality_engine import PersonalityEngine

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generates content for social media platforms"""

    def __init__(
        self,
        db: Prisma,
        redis_client: redis.Redis,
        personality_engine: PersonalityEngine
    ):
        self.db = db
        self.redis = redis_client
        self.personality = personality_engine
        self.sentiment_analyzer = SentimentIntensityAnalyzer()

    async def initialize(self):
        """Initialize content generator"""
        logger.info("✅ Content generator initialized")

    async def generate_tweet(
        self,
        user_id: str,
        prompt: Optional[str] = None,
        max_length: int = 280
    ) -> Optional[Dict]:
        """Generate a tweet in the creator's voice"""
        try:
            # Get personality profile
            profile = await self.db.personalityprofile.find_unique(
                where={"userId": user_id}
            )

            if not profile:
                logger.error(f"No profile found for user {user_id}")
                return None

            # Get recent successful tweets for style reference
            recent_tweets = await self.db.generatedcontent.find_many(
                where={
                    "userId": user_id,
                    "platform": "twitter",
                    "status": "posted",
                },
                order_by={"createdAt": "desc"},
                take=5,
            )

            # Build tweet generation prompt
            if not prompt:
                prompt = self._build_tweet_prompt(profile, recent_tweets)

            # Generate tweet content
            tweet_text = await self._generate_content(
                user_id,
                prompt,
                max_length
            )

            if not tweet_text:
                return None

            # Analyze sentiment
            sentiment = self._analyze_sentiment(tweet_text)

            # Check if content passes safety filters
            is_safe, reason = self._check_content_safety(tweet_text, sentiment)

            if not is_safe:
                logger.warning(f"Tweet rejected: {reason}")
                await self._save_generated_content(
                    user_id,
                    "twitter",
                    prompt,
                    tweet_text,
                    sentiment["compound"],
                    "rejected",
                    feedback=reason
                )
                return None

            # Save as draft for review
            status = "scheduled" if not settings.content_review_required else "draft"

            content = await self._save_generated_content(
                user_id,
                "twitter",
                prompt,
                tweet_text,
                sentiment["compound"],
                status
            )

            return {
                "id": content.id,
                "text": tweet_text,
                "sentiment": sentiment,
                "status": status,
                "safe": is_safe,
            }

        except Exception as e:
            logger.error(f"Error generating tweet: {e}", exc_info=True)
            return None

    async def generate_post(
        self,
        user_id: str,
        platform: str,
        prompt: Optional[str] = None,
        max_length: Optional[int] = None
    ) -> Optional[Dict]:
        """Generate a social media post"""
        try:
            # Platform-specific length limits
            length_limits = {
                "twitter": 280,
                "instagram": 2200,
                "tiktok": 150,
                "discord": 2000,
            }

            max_len = max_length or length_limits.get(platform, 500)

            # Generate content
            content_text = await self._generate_content(
                user_id,
                prompt or f"Create an engaging {platform} post",
                max_len
            )

            if not content_text:
                return None

            # Analyze sentiment
            sentiment = self._analyze_sentiment(content_text)

            # Safety check
            is_safe, reason = self._check_content_safety(content_text, sentiment)

            status = "draft" if not is_safe or settings.content_review_required else "scheduled"

            # Save content
            content = await self._save_generated_content(
                user_id,
                platform,
                prompt or f"Generate {platform} post",
                content_text,
                sentiment["compound"],
                status,
                feedback=reason if not is_safe else None
            )

            return {
                "id": content.id,
                "text": content_text,
                "platform": platform,
                "sentiment": sentiment,
                "status": status,
                "safe": is_safe,
            }

        except Exception as e:
            logger.error(f"Error generating post: {e}", exc_info=True)
            return None

    async def _generate_content(
        self,
        user_id: str,
        prompt: str,
        max_length: int
    ) -> Optional[str]:
        """Generate content using personality engine"""
        full_prompt = f"{prompt}\n\nIMPORTANT: Keep response under {max_length} characters."

        response = await self.personality.generate_response(
            user_id,
            full_prompt,
            context={"platform": "content_generation"}
        )

        if response and len(response) > max_length:
            # Truncate if too long
            response = response[:max_length-3] + "..."

        return response

    def _build_tweet_prompt(self, profile: Any, recent_tweets: List[Any]) -> str:
        """Build a prompt for tweet generation based on profile"""
        topics = profile.topics or {}
        interests = list(topics.keys())[:3] if topics else ["your interests"]

        prompt = "Write a tweet about one of these topics: "
        prompt += ", ".join(interests)
        prompt += ". Make it engaging and authentic."

        return prompt

    def _analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment of content"""
        scores = self.sentiment_analyzer.polarity_scores(text)
        return {
            "positive": scores["pos"],
            "negative": scores["neg"],
            "neutral": scores["neu"],
            "compound": scores["compound"],  # -1 to 1
        }

    def _check_content_safety(
        self,
        text: str,
        sentiment: Dict[str, float]
    ) -> tuple[bool, Optional[str]]:
        """Check if content passes safety filters"""

        # Check sentiment filtering
        if settings.sentiment_filtering:
            if sentiment["compound"] < settings.min_sentiment_score:
                return False, "Sentiment too negative"

        # Check for controversy keywords
        if settings.controversy_avoidance:
            controversy_keywords = [
                "hate", "kill", "destroy", "attack", "war",
                "racist", "sexist", "offensive", "controversial"
            ]

            text_lower = text.lower()
            for keyword in controversy_keywords:
                if keyword in text_lower:
                    return False, f"Contains controversial keyword: {keyword}"

        # Check length
        if len(text.strip()) < 10:
            return False, "Content too short"

        return True, None

    async def _save_generated_content(
        self,
        user_id: str,
        platform: str,
        prompt: str,
        generated_text: str,
        sentiment: float,
        status: str,
        feedback: Optional[str] = None
    ):
        """Save generated content to database"""
        content = await self.db.generatedcontent.create(
            data={
                "userId": user_id,
                "platform": platform,
                "contentType": "post" if platform != "twitter" else "tweet",
                "prompt": prompt,
                "generatedText": generated_text,
                "model": settings.ai_provider,
                "temperature": settings.personality_temperature,
                "status": status,
                "sentiment": sentiment,
                "reviewed": False,
                "approved": status == "scheduled",
                "feedback": feedback,
            }
        )

        logger.info(f"Saved {platform} content {content.id} with status {status}")
        return content

    async def get_pending_content(
        self,
        user_id: str,
        platform: Optional[str] = None
    ) -> List[Dict]:
        """Get content pending review"""
        where_clause = {
            "userId": user_id,
            "status": "draft",
            "reviewed": False,
        }

        if platform:
            where_clause["platform"] = platform

        content = await self.db.generatedcontent.find_many(
            where=where_clause,
            order_by={"createdAt": "desc"},
            take=20,
        )

        return [
            {
                "id": c.id,
                "platform": c.platform,
                "text": c.generatedText,
                "sentiment": c.sentiment,
                "createdAt": c.createdAt.isoformat(),
            }
            for c in content
        ]

    async def approve_content(self, content_id: str) -> bool:
        """Approve content for posting"""
        try:
            await self.db.generatedcontent.update(
                where={"id": content_id},
                data={
                    "reviewed": True,
                    "approved": True,
                    "status": "scheduled",
                }
            )
            logger.info(f"Approved content {content_id}")
            return True

        except Exception as e:
            logger.error(f"Error approving content: {e}")
            return False

    async def reject_content(self, content_id: str, feedback: str) -> bool:
        """Reject content"""
        try:
            await self.db.generatedcontent.update(
                where={"id": content_id},
                data={
                    "reviewed": True,
                    "approved": False,
                    "status": "rejected",
                    "feedback": feedback,
                }
            )
            logger.info(f"Rejected content {content_id}")
            return True

        except Exception as e:
            logger.error(f"Error rejecting content: {e}")
            return False
