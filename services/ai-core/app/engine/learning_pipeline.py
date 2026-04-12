"""
Learning Pipeline
Continuously learns from all platforms to improve personality model
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import Counter

from prisma import Prisma
import redis.asyncio as redis

from app.config import settings
from app.engine.personality_engine import PersonalityEngine
from app.engine.memory_manager import MemoryManager

logger = logging.getLogger(__name__)


class LearningPipeline:
    """Continuously learns from creator's content across all platforms"""

    def __init__(
        self,
        db: Prisma,
        redis_client: redis.Redis,
        personality_engine: PersonalityEngine,
        memory_manager: MemoryManager
    ):
        self.db = db
        self.redis = redis_client
        self.personality = personality_engine
        self.memory = memory_manager
        self.running = False
        self.task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the learning pipeline"""
        if self.running:
            logger.warning("Learning pipeline already running")
            return

        self.running = True
        self.task = asyncio.create_task(self._learning_loop())
        logger.info("🔄 Learning pipeline started")

    async def stop(self):
        """Stop the learning pipeline"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("⏹️  Learning pipeline stopped")

    async def _learning_loop(self):
        """Main learning loop"""
        while self.running:
            try:
                logger.info("🧠 Running learning cycle...")

                # Process unprocessed training data
                await self._process_training_data()

                # Update personality profiles
                await self._update_personality_profiles()

                # Clean up old data
                await self._cleanup_old_data()

                # Wait before next cycle
                await asyncio.sleep(settings.learning_interval_minutes * 60)

            except Exception as e:
                logger.error(f"Error in learning loop: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait 1 minute before retry

    async def _process_training_data(self):
        """Process unprocessed training data"""
        try:
            # Get unprocessed data
            training_data = await self.db.trainingdata.find_many(
                where={"isProcessed": False},
                take=settings.batch_size,
                order_by={"createdAt": "asc"},
            )

            if not training_data:
                logger.debug("No new training data to process")
                return

            logger.info(f"Processing {len(training_data)} training data items")

            # Group by user
            user_data: Dict[str, List] = {}
            for item in training_data:
                if item.userId not in user_data:
                    user_data[item.userId] = []
                user_data[item.userId].append(item)

            # Process each user's data
            for user_id, items in user_data.items():
                await self._learn_from_user_data(user_id, items)

            # Mark as processed
            item_ids = [item.id for item in training_data]
            await self.db.trainingdata.update_many(
                where={"id": {"in": item_ids}},
                data={
                    "isProcessed": True,
                    "processedAt": datetime.utcnow(),
                },
            )

            logger.info(f"Processed {len(training_data)} items")

        except Exception as e:
            logger.error(f"Error processing training data: {e}", exc_info=True)

    async def _learn_from_user_data(self, user_id: str, items: List):
        """Learn from a user's training data"""
        try:
            # Extract text content
            texts = [item.content for item in items]

            # Analyze writing style
            style_analysis = self._analyze_writing_style(texts)

            # Extract vocabulary
            vocabulary = self._extract_vocabulary(texts)

            # Extract catchphrases
            catchphrases = self._extract_catchphrases(texts)

            # Extract emoji preferences
            emojis = self._extract_emojis(texts)

            # Detect topics
            topics = self._detect_topics(texts)

            # Update profile
            profile = await self.db.personalityprofile.find_unique(
                where={"userId": user_id}
            )

            if profile:
                # Merge with existing data
                existing_vocab = set(profile.vocabulary or [])
                existing_vocab.update(vocabulary[:100])

                existing_catchphrases = set(profile.catchphrases or [])
                existing_catchphrases.update(catchphrases[:20])

                existing_emojis = set(profile.emojiPreference or [])
                existing_emojis.update(emojis[:20])

                existing_topics = profile.topics or {}
                for topic, count in topics.items():
                    existing_topics[topic] = existing_topics.get(topic, 0) + count

                # Update profile
                await self.db.personalityprofile.update(
                    where={"userId": user_id},
                    data={
                        "writingStyle": style_analysis,
                        "vocabulary": list(existing_vocab)[:200],
                        "catchphrases": list(existing_catchphrases)[:30],
                        "emojiPreference": list(existing_emojis)[:30],
                        "topics": existing_topics,
                        "messagesSeen": {"increment": len(items)},
                        "lastTrainedAt": datetime.utcnow(),
                        "confidence": min(1.0, profile.confidence + 0.01),
                    },
                )

                logger.info(f"Updated profile for user {user_id}")

            # Extract and store important memories
            for item in items:
                # Check for important statements
                if self._is_important_statement(item.content):
                    await self.memory.store_memory(
                        user_id,
                        item.content,
                        "fact",
                        {
                            "source": item.platform,
                            "sourceId": item.id,
                        }
                    )

        except Exception as e:
            logger.error(f"Error learning from user data: {e}", exc_info=True)

    def _analyze_writing_style(self, texts: List[str]) -> Dict[str, Any]:
        """Analyze writing style from texts"""
        if not texts:
            return {}

        # Calculate average sentence length
        total_words = sum(len(text.split()) for text in texts)
        avg_words = total_words / len(texts) if texts else 0

        # Determine tone (simple heuristic)
        exclamation_count = sum(text.count("!") for text in texts)
        question_count = sum(text.count("?") for text in texts)

        tone = "neutral"
        if exclamation_count > len(texts) * 0.3:
            tone = "excited"
        elif question_count > len(texts) * 0.3:
            tone = "inquisitive"

        # Check formality (capital letters, punctuation)
        formal_indicators = sum(
            1 for text in texts
            if text and text[0].isupper() and text.rstrip()[-1] in ".!?"
        )
        formality = "formal" if formal_indicators > len(texts) * 0.7 else "casual"

        return {
            "avgSentenceLength": avg_words,
            "tone": tone,
            "formality": formality,
            "exclamationUsage": exclamation_count / len(texts),
            "questionUsage": question_count / len(texts),
        }

    def _extract_vocabulary(self, texts: List[str]) -> List[str]:
        """Extract common vocabulary"""
        # Combine all texts
        all_text = " ".join(texts).lower()

        # Split into words
        words = all_text.split()

        # Filter out common stop words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at",
            "to", "for", "of", "with", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "do", "does",
            "did", "will", "would", "should", "could", "can", "may",
            "might", "must", "i", "you", "he", "she", "it", "we", "they"
        }

        filtered_words = [w for w in words if w not in stop_words and len(w) > 3]

        # Count frequency
        word_counts = Counter(filtered_words)

        # Return top words
        return [word for word, count in word_counts.most_common(100)]

    def _extract_catchphrases(self, texts: List[str]) -> List[str]:
        """Extract potential catchphrases (repeated phrases)"""
        # Look for 2-4 word phrases that repeat
        phrases = []

        for text in texts:
            words = text.split()
            for i in range(len(words) - 1):
                # 2-word phrases
                phrase = " ".join(words[i:i+2])
                phrases.append(phrase.lower())

                # 3-word phrases
                if i < len(words) - 2:
                    phrase = " ".join(words[i:i+3])
                    phrases.append(phrase.lower())

        # Count frequency
        phrase_counts = Counter(phrases)

        # Return phrases that appear more than once
        return [
            phrase for phrase, count in phrase_counts.most_common(20)
            if count > 1
        ]

    def _extract_emojis(self, texts: List[str]) -> List[str]:
        """Extract commonly used emojis"""
        emojis = []

        for text in texts:
            for char in text:
                # Check if character is an emoji (simplified check)
                if ord(char) > 0x1F300:
                    emojis.append(char)

        # Count frequency
        emoji_counts = Counter(emojis)

        return [emoji for emoji, count in emoji_counts.most_common(20)]

    def _detect_topics(self, texts: List[str]) -> Dict[str, int]:
        """Detect topics from texts (simple keyword-based)"""
        # Topic keywords
        topic_keywords = {
            "gaming": ["game", "play", "stream", "twitch", "xbox", "ps5", "pc"],
            "tech": ["tech", "code", "programming", "software", "app", "ai"],
            "music": ["music", "song", "album", "artist", "spotify"],
            "sports": ["sport", "team", "win", "game", "player"],
            "food": ["food", "eat", "cook", "recipe", "restaurant"],
            "travel": ["travel", "trip", "visit", "vacation", "flight"],
        }

        topic_counts = {}

        for text in texts:
            text_lower = text.lower()
            for topic, keywords in topic_keywords.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        topic_counts[topic] = topic_counts.get(topic, 0) + 1
                        break

        return topic_counts

    def _is_important_statement(self, text: str) -> bool:
        """Check if text contains important information worth remembering"""
        important_keywords = [
            "i love", "i hate", "my favorite", "i always", "i never",
            "i believe", "i think", "important to me", "means a lot"
        ]

        text_lower = text.lower()
        return any(keyword in text_lower for keyword in important_keywords)

    async def _update_personality_profiles(self):
        """Update all personality profiles"""
        try:
            # Get all profiles
            profiles = await self.db.personalityprofile.find_many()

            for profile in profiles:
                # Consolidate memories
                await self.memory.consolidate_memories(profile.userId)

                # Prune old memories
                await self.memory.prune_old_memories(profile.userId)

            logger.info(f"Updated {len(profiles)} personality profiles")

        except Exception as e:
            logger.error(f"Error updating profiles: {e}", exc_info=True)

    async def _cleanup_old_data(self):
        """Clean up old processed data"""
        try:
            # Delete processed training data older than 30 days
            cutoff_date = datetime.utcnow() - timedelta(days=30)

            deleted = await self.db.trainingdata.delete_many(
                where={
                    "isProcessed": True,
                    "processedAt": {"lt": cutoff_date},
                }
            )

            if deleted:
                logger.info(f"Cleaned up {deleted} old training data items")

        except Exception as e:
            logger.error(f"Error cleaning up data: {e}", exc_info=True)
