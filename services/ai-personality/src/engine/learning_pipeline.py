"""
Learning Pipeline
Continuously learns from all platforms and improves personality
"""
import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
import json

from prisma import Prisma
from redis.asyncio import Redis
import pandas as pd
from textblob import TextBlob

from ..config import settings
from .personality import PersonalityEngine
from .memory import MemoryManager

logger = logging.getLogger(__name__)


class LearningPipeline:
    """Continuously processes training data and improves AI personality"""

    def __init__(
        self,
        db: Prisma,
        redis: Redis,
        personality: PersonalityEngine,
        memory: MemoryManager
    ):
        self.db = db
        self.redis = redis
        self.personality = personality
        self.memory = memory
        self.running = False
        self.task = None

    async def start(self):
        """Start the learning pipeline"""
        self.running = True
        self.task = asyncio.create_task(self._run_pipeline())
        logger.info("Learning pipeline started")

    async def stop(self):
        """Stop the learning pipeline"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Learning pipeline stopped")

    async def _run_pipeline(self):
        """Main pipeline loop"""
        while self.running:
            try:
                # Process unprocessed training data
                await self._process_training_data()

                # Update personality profiles
                await self._update_personality_profiles()

                # Consolidate memories
                await self._consolidate_all_memories()

                # Analyze engagement metrics
                await self._analyze_engagement()

                # Wait before next iteration
                await asyncio.sleep(300)  # 5 minutes

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in learning pipeline: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait 1 minute on error

    async def _process_training_data(self):
        """Process unprocessed training data"""
        try:
            # Get batch of unprocessed data
            training_data = await self.db.trainingdata.find_many(
                where={"isProcessed": False},
                take=settings.BATCH_SIZE
            )

            if not training_data:
                return

            logger.info(f"Processing {len(training_data)} training samples")

            for data in training_data:
                try:
                    # Extract insights based on data type
                    if data.dataType == "message":
                        await self._process_message(data)
                    elif data.dataType == "stream_transcript":
                        await self._process_transcript(data)
                    elif data.dataType == "tweet":
                        await self._process_tweet(data)

                    # Mark as processed
                    await self.db.trainingdata.update(
                        where={"id": data.id},
                        data={
                            "isProcessed": True,
                            "processedAt": datetime.now()
                        }
                    )

                except Exception as e:
                    logger.error(f"Error processing training data {data.id}: {e}")

        except Exception as e:
            logger.error(f"Error in process_training_data: {e}", exc_info=True)

    async def _process_message(self, data: Any):
        """Process a chat message for learning"""
        try:
            content = data.content
            user_id = data.userId

            # Extract vocabulary
            words = content.lower().split()
            for word in words:
                if len(word) > 3 and word.isalpha():
                    await self.redis.zincrby(
                        f"vocab:{user_id}",
                        1,
                        word
                    )

            # Extract emojis
            emojis = [c for c in content if ord(c) > 127000]
            for emoji in emojis:
                await self.redis.zincrby(
                    f"emoji:{user_id}",
                    1,
                    emoji
                )

            # Detect catchphrases (repeated phrases)
            if len(content) < 100:  # Short messages might be catchphrases
                await self.redis.zincrby(
                    f"phrases:{user_id}",
                    1,
                    content.lower()
                )

            # Analyze sentiment to understand tone
            sentiment = TextBlob(content).sentiment
            await self.redis.hincrbyfloat(
                f"sentiment:{user_id}",
                "polarity_sum",
                sentiment.polarity
            )
            await self.redis.hincrbyfloat(
                f"sentiment:{user_id}",
                "subjectivity_sum",
                sentiment.subjectivity
            )
            await self.redis.hincrby(
                f"sentiment:{user_id}",
                "count",
                1
            )

            # Store as memory if important
            if any(keyword in content.lower() for keyword in [
                "always", "never", "favorite", "love", "hate", "remember"
            ]):
                await self.memory.store_memory(
                    user_id,
                    content,
                    "preference",
                    {"source": data.platform, "sourceId": data.id}
                )

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)

    async def _process_transcript(self, data: Any):
        """Process stream transcript"""
        try:
            # Similar to message processing but analyze longer form content
            content = data.content
            user_id = data.userId

            # Chunk into sentences
            sentences = content.split(". ")

            for sentence in sentences:
                if len(sentence) > 20:  # Meaningful sentences
                    # Detect topics
                    await self._extract_topics(user_id, sentence)

        except Exception as e:
            logger.error(f"Error processing transcript: {e}", exc_info=True)

    async def _process_tweet(self, data: Any):
        """Process tweet data"""
        try:
            content = data.content
            user_id = data.userId
            metadata = data.metadata if isinstance(data.metadata, dict) else {}

            # Extract hashtags
            hashtags = [word[1:] for word in content.split() if word.startswith("#")]
            for tag in hashtags:
                await self.redis.zincrby(
                    f"topics:{user_id}",
                    1,
                    tag
                )

            # Learn from engagement
            if "likes" in metadata or "retweets" in metadata:
                engagement = metadata.get("likes", 0) + metadata.get("retweets", 0) * 2

                if engagement > 100:  # High engagement
                    await self.memory.store_memory(
                        user_id,
                        content,
                        "event",
                        {
                            "source": "twitter",
                            "engagement": engagement,
                            "tags": hashtags
                        }
                    )

        except Exception as e:
            logger.error(f"Error processing tweet: {e}", exc_info=True)

    async def _extract_topics(self, user_id: str, text: str):
        """Extract topics from text"""
        try:
            # Simple topic extraction (could use NLP for better results)
            blob = TextBlob(text)
            noun_phrases = blob.noun_phrases

            for phrase in noun_phrases:
                if len(phrase.split()) <= 3:  # Keep it simple
                    await self.redis.zincrby(
                        f"topics:{user_id}",
                        1,
                        phrase
                    )

        except Exception as e:
            logger.error(f"Error extracting topics: {e}")

    async def _update_personality_profiles(self):
        """Update personality profiles from learned data"""
        try:
            # Get all users with pending updates
            profiles = await self.db.personalityprofile.find_many()

            for profile in profiles:
                user_id = profile.userId

                # Get top vocabulary
                vocab_items = await self.redis.zrange(
                    f"vocab:{user_id}",
                    0,
                    49,
                    desc=True,
                    withscores=False
                )

                # Get top emojis
                emoji_items = await self.redis.zrange(
                    f"emoji:{user_id}",
                    0,
                    19,
                    desc=True,
                    withscores=False
                )

                # Get catchphrases (phrases used 3+ times)
                all_phrases = await self.redis.zrange(
                    f"phrases:{user_id}",
                    0,
                    -1,
                    desc=True,
                    withscores=True
                )
                catchphrases = [
                    phrase for phrase, score in
                    [(all_phrases[i], all_phrases[i+1]) for i in range(0, len(all_phrases), 2)]
                    if score >= 3
                ][:10]

                # Get topics
                topic_items = await self.redis.zrange(
                    f"topics:{user_id}",
                    0,
                    19,
                    desc=True,
                    withscores=True
                )
                topics = {
                    topic_items[i]: int(topic_items[i+1])
                    for i in range(0, len(topic_items), 2)
                } if topic_items else {}

                # Calculate average sentiment (tone)
                sentiment_data = await self.redis.hgetall(f"sentiment:{user_id}")
                tone = "casual and friendly"
                if sentiment_data:
                    count = int(sentiment_data.get("count", 1))
                    avg_polarity = float(sentiment_data.get("polarity_sum", 0)) / count
                    avg_subjectivity = float(sentiment_data.get("subjectivity_sum", 0)) / count

                    if avg_polarity > 0.3:
                        tone = "positive and upbeat"
                    elif avg_polarity < -0.1:
                        tone = "sarcastic and edgy"

                    if avg_subjectivity > 0.6:
                        tone += ", very expressive"

                # Update profile
                update_data = {}
                if vocab_items:
                    update_data["vocabulary"] = vocab_items
                if emoji_items:
                    update_data["emojiPreference"] = emoji_items
                if catchphrases:
                    update_data["catchphrases"] = catchphrases
                if topics:
                    update_data["topics"] = topics
                if tone:
                    update_data["tone"] = tone

                if update_data:
                    update_data["lastTrainedAt"] = datetime.now()
                    update_data["confidence"] = min(1.0, profile.messagesSeen / 1000)

                    await self.db.personalityprofile.update(
                        where={"userId": user_id},
                        data=update_data
                    )

                    logger.info(f"Updated personality profile for {user_id}")

        except Exception as e:
            logger.error(f"Error updating personality profiles: {e}", exc_info=True)

    async def _consolidate_all_memories(self):
        """Consolidate memories for all users"""
        try:
            profiles = await self.db.personalityprofile.find_many()

            for profile in profiles:
                await self.memory.consolidate_memories(profile.userId)
                await self.memory.prune_old_memories(profile.userId)

        except Exception as e:
            logger.error(f"Error consolidating memories: {e}", exc_info=True)

    async def _analyze_engagement(self):
        """Analyze engagement metrics to improve content"""
        try:
            # Get recent generated content with engagement data
            cutoff = datetime.now() - timedelta(days=7)

            content_items = await self.db.generatedcontent.find_many(
                where={
                    "status": "posted",
                    "postedAt": {"gte": cutoff}
                }
            )

            if not content_items:
                return

            # Analyze patterns in high-engagement content
            df = pd.DataFrame([{
                "user_id": c.userId,
                "text": c.generatedText,
                "sentiment": c.sentiment or 0,
                "engagement": (c.impressions or 0) + (c.engagement or 0),
                "length": len(c.generatedText)
            } for c in content_items])

            # Group by user
            for user_id in df["user_id"].unique():
                user_df = df[df["user_id"] == user_id]

                if len(user_df) < 3:
                    continue

                # Find optimal sentiment range
                high_engagement = user_df[
                    user_df["engagement"] > user_df["engagement"].quantile(0.7)
                ]

                if len(high_engagement) > 0:
                    optimal_sentiment = high_engagement["sentiment"].mean()
                    optimal_length = int(high_engagement["length"].mean())

                    # Store insights in Redis
                    await self.redis.hset(
                        f"engagement_insights:{user_id}",
                        mapping={
                            "optimal_sentiment": optimal_sentiment,
                            "optimal_length": optimal_length,
                            "last_analyzed": datetime.now().isoformat()
                        }
                    )

                    logger.info(
                        f"Engagement insights for {user_id}: "
                        f"sentiment={optimal_sentiment:.2f}, length={optimal_length}"
                    )

        except Exception as e:
            logger.error(f"Error analyzing engagement: {e}", exc_info=True)
