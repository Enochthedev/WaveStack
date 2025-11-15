"""
Twitter Auto-Poster
Automatically posts AI-generated content to Twitter based on schedule
"""
import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional, List
import tweepy
from prisma import Prisma
import redis.asyncio as redis
import httpx
from loguru import logger


class TwitterAutoPoster:
    """Automatically posts approved content to Twitter"""

    def __init__(self):
        self.db = Prisma()
        self.redis_client: Optional[redis.Redis] = None
        self.twitter_client: Optional[tweepy.Client] = None
        self.ai_api_url = os.getenv("AI_PERSONALITY_URL", "http://ai-personality:8200")
        self.running = False

        # Twitter API v2 credentials
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_secret = os.getenv("TWITTER_ACCESS_SECRET")
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN")

        # Configuration
        self.post_interval_minutes = int(os.getenv("TWITTER_POST_INTERVAL", "60"))
        self.auto_generate_enabled = os.getenv("AUTO_GENERATE_TWEETS", "false").lower() == "true"
        self.auto_post_enabled = os.getenv("AUTO_POST_ENABLED", "false").lower() == "true"

    async def initialize(self):
        """Initialize connections"""
        logger.info("🚀 Initializing Twitter Auto-Poster...")

        # Connect to database
        await self.db.connect()
        logger.info("✅ Connected to database")

        # Connect to Redis
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        await self.redis_client.ping()
        logger.info("✅ Connected to Redis")

        # Initialize Twitter client
        if all([self.api_key, self.api_secret, self.access_token, self.access_secret]):
            self.twitter_client = tweepy.Client(
                bearer_token=self.bearer_token,
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_secret,
                wait_on_rate_limit=True
            )
            logger.info("✅ Twitter client initialized")
        else:
            logger.warning("⚠️  Twitter credentials not configured")

    async def start(self):
        """Start the auto-poster loop"""
        if not self.twitter_client:
            logger.error("❌ Twitter client not initialized. Cannot start.")
            return

        self.running = True
        logger.info(f"🔄 Starting auto-poster (interval: {self.post_interval_minutes}m)")

        while self.running:
            try:
                # Post scheduled content
                await self.post_scheduled_content()

                # Generate new content if enabled
                if self.auto_generate_enabled:
                    await self.generate_new_content()

                # Wait before next cycle
                await asyncio.sleep(self.post_interval_minutes * 60)

            except Exception as e:
                logger.error(f"Error in auto-poster loop: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait 1 minute before retry

    async def stop(self):
        """Stop the auto-poster"""
        self.running = False
        await self.redis_client.close()
        await self.db.disconnect()
        logger.info("⏹️  Auto-poster stopped")

    async def post_scheduled_content(self):
        """Post content that is scheduled for now"""
        try:
            now = datetime.utcnow()

            # Get content scheduled for posting
            scheduled_content = await self.db.generatedcontent.find_many(
                where={
                    "platform": "twitter",
                    "status": "scheduled",
                    "approved": True,
                    "scheduledFor": {"lte": now}
                },
                order_by={"scheduledFor": "asc"},
                take=5  # Post up to 5 tweets at a time
            )

            if not scheduled_content:
                logger.debug("No scheduled content to post")
                return

            logger.info(f"📤 Found {len(scheduled_content)} tweets to post")

            for content in scheduled_content:
                success = await self.post_tweet(content)

                if success:
                    await asyncio.sleep(5)  # Wait 5 seconds between posts

        except Exception as e:
            logger.error(f"Error posting scheduled content: {e}", exc_info=True)

    async def post_tweet(self, content) -> bool:
        """Post a single tweet"""
        try:
            # Post to Twitter
            response = self.twitter_client.create_tweet(
                text=content.generatedText
            )

            if response.data:
                tweet_id = response.data["id"]

                # Update content record
                await self.db.generatedcontent.update(
                    where={"id": content.id},
                    data={
                        "status": "posted",
                        "postedAt": datetime.utcnow(),
                        "postId": str(tweet_id),
                    }
                )

                # Track in Redis
                await self.redis_client.hincrby("twitter:stats", "tweets_posted", 1)

                logger.info(f"✅ Posted tweet {tweet_id}: {content.generatedText[:50]}...")
                return True

            return False

        except tweepy.TweepyException as e:
            logger.error(f"Twitter API error: {e}")

            # Mark as failed
            await self.db.generatedcontent.update(
                where={"id": content.id},
                data={
                    "status": "rejected",
                    "feedback": f"Twitter API error: {str(e)}"
                }
            )

            return False

        except Exception as e:
            logger.error(f"Error posting tweet: {e}", exc_info=True)
            return False

    async def generate_new_content(self):
        """Generate new tweets using AI personality service"""
        try:
            # Get all users who have profiles
            profiles = await self.db.personalityprofile.find_many()

            for profile in profiles:
                # Check if we need more content for this user
                pending_count = await self.db.generatedcontent.count(
                    where={
                        "userId": profile.userId,
                        "platform": "twitter",
                        "status": {"in": ["draft", "scheduled"]}
                    }
                )

                # Maintain a buffer of 5 tweets
                if pending_count < 5:
                    await self._generate_tweet_for_user(profile.userId)

        except Exception as e:
            logger.error(f"Error generating new content: {e}", exc_info=True)

    async def _generate_tweet_for_user(self, user_id: str):
        """Generate a tweet for a specific user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ai_api_url}/api/v1/content/generate/tweet",
                    json={"user_id": user_id},
                    timeout=30.0
                )

                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✨ Generated tweet for user {user_id}: {result['text'][:50]}...")
                else:
                    logger.error(f"Failed to generate tweet: {response.status_code}")

        except Exception as e:
            logger.error(f"Error generating tweet: {e}", exc_info=True)

    async def schedule_content(
        self,
        content_id: str,
        scheduled_time: datetime
    ) -> bool:
        """Schedule content for posting at a specific time"""
        try:
            await self.db.generatedcontent.update(
                where={"id": content_id},
                data={
                    "scheduledFor": scheduled_time,
                    "status": "scheduled"
                }
            )

            logger.info(f"📅 Scheduled content {content_id} for {scheduled_time}")
            return True

        except Exception as e:
            logger.error(f"Error scheduling content: {e}")
            return False

    async def get_analytics(self, user_id: str) -> dict:
        """Get posting analytics for a user"""
        try:
            # Count posts by status
            total_posted = await self.db.generatedcontent.count(
                where={
                    "userId": user_id,
                    "platform": "twitter",
                    "status": "posted"
                }
            )

            scheduled = await self.db.generatedcontent.count(
                where={
                    "userId": user_id,
                    "platform": "twitter",
                    "status": "scheduled"
                }
            )

            pending_review = await self.db.generatedcontent.count(
                where={
                    "userId": user_id,
                    "platform": "twitter",
                    "status": "draft",
                    "reviewed": False
                }
            )

            # Get recent posts
            recent_posts = await self.db.generatedcontent.find_many(
                where={
                    "userId": user_id,
                    "platform": "twitter",
                    "status": "posted"
                },
                order_by={"postedAt": "desc"},
                take=10
            )

            return {
                "total_posted": total_posted,
                "scheduled": scheduled,
                "pending_review": pending_review,
                "recent_posts": [
                    {
                        "text": p.generatedText,
                        "posted_at": p.postedAt.isoformat() if p.postedAt else None,
                        "post_id": p.postId,
                        "sentiment": p.sentiment
                    }
                    for p in recent_posts
                ]
            }

        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            return {}


async def main():
    """Main entry point"""
    logger.info("🐦 Twitter Auto-Poster Starting...")

    poster = TwitterAutoPoster()
    await poster.initialize()

    try:
        await poster.start()
    except KeyboardInterrupt:
        logger.info("⚠️  Received shutdown signal")
    finally:
        await poster.stop()


if __name__ == "__main__":
    asyncio.run(main())
