"""
Personality Engine
Core AI that generates responses in the creator's voice using ML
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from prisma import Prisma
import redis.asyncio as redis
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger(__name__)


class PersonalityEngine:
    """Core AI engine for personality-based response generation"""

    def __init__(self, db: Prisma, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        self.openai: Optional[AsyncOpenAI] = None
        self.anthropic: Optional[AsyncAnthropic] = None
        self.provider = settings.ai_provider

    async def initialize(self):
        """Initialize AI providers"""
        if self.provider in ["openai", "both"] and settings.openai_api_key:
            self.openai = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("✅ OpenAI initialized")

        if self.provider in ["anthropic", "both"] and settings.anthropic_api_key:
            self.anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
            logger.info("✅ Anthropic Claude initialized")

        if not self.openai and not self.anthropic:
            logger.warning("⚠️  No AI provider configured!")

    async def generate_response(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Generate a response in the creator's voice"""
        try:
            # Get personality profile
            profile = await self._get_or_create_profile(user_id)

            # Get relevant memories
            memories = await self._get_relevant_memories(user_id, message)

            # Get conversation history
            history = await self._get_conversation_history(
                user_id,
                context.get("platform") if context else None
            )

            # Build system prompt
            system_prompt = self._build_system_prompt(profile, memories)

            # Generate response
            if self.provider in ["openai", "both"] and self.openai:
                response = await self._generate_with_openai(
                    system_prompt, history, message
                )
            elif self.provider == "anthropic" and self.anthropic:
                response = await self._generate_with_claude(
                    system_prompt, history, message
                )
            else:
                raise ValueError("No AI provider available")

            # Save conversation
            await self._save_conversation(user_id, message, response, context)

            # Update stats
            await self.redis.hincrby(f"ai:stats:{user_id}", "responses_generated", 1)

            logger.info(f"Generated response for user {user_id}")
            return response

        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            return None

    async def _generate_with_openai(
        self,
        system_prompt: str,
        history: List[Dict],
        message: str
    ) -> str:
        """Generate response using OpenAI"""
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": message}
        ]

        response = await self.openai.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=settings.personality_temperature,
            max_tokens=settings.personality_max_tokens,
        )

        return response.choices[0].message.content or ""

    async def _generate_with_claude(
        self,
        system_prompt: str,
        history: List[Dict],
        message: str
    ) -> str:
        """Generate response using Anthropic Claude"""
        messages = [
            *history,
            {"role": "user", "content": message}
        ]

        response = await self.anthropic.messages.create(
            model=settings.anthropic_model,
            max_tokens=settings.personality_max_tokens,
            system=system_prompt,
            messages=messages,
            temperature=settings.personality_temperature,
        )

        return response.content[0].text

    def _build_system_prompt(self, profile: Dict, memories: List[Dict]) -> str:
        """Build AI system prompt from personality profile and memories"""
        traits = profile.get("traits", {})
        style = profile.get("writingStyle", {})

        prompt = f"You are an AI clone of {profile['name']}, a content creator. "
        prompt += "Your job is to respond EXACTLY as they would.\n\n"

        # Personality traits
        prompt += "PERSONALITY TRAITS:\n"
        for trait, value in traits.items():
            prompt += f"- {trait}: {value}\n"

        # Writing style
        prompt += "\nWRITING STYLE:\n"
        prompt += f"- Tone: {profile.get('tone', 'casual and friendly')}\n"
        prompt += f"- Response length: {profile.get('responseLength', 'medium')}\n"

        # Vocabulary
        vocabulary = profile.get("vocabulary", [])
        if vocabulary:
            prompt += f"- Common vocabulary: {', '.join(vocabulary[:20])}\n"

        # Catchphrases
        catchphrases = profile.get("catchphrases", [])
        if catchphrases:
            prompt += f"- Catchphrases: {', '.join(catchphrases)}\n"

        # Emoji usage
        emoji_pref = profile.get("emojiPreference", [])
        if emoji_pref:
            prompt += f"- Emoji usage: {' '.join(emoji_pref[:10])}\n"

        # Key memories
        prompt += "\nKEY MEMORIES:\n"
        for mem in memories[:10]:
            prompt += f"- {mem['content']}\n"

        # Guidelines
        prompt += "\nGUIDELINES:\n"
        prompt += "- Stay in character at all times\n"
        prompt += "- Use natural, conversational language\n"
        prompt += "- Be authentic and genuine\n"
        prompt += "- Match the creator's humor and style\n"

        # Safety features
        if settings.controversy_avoidance:
            prompt += "- Avoid controversial topics unless specifically asked\n"
            prompt += "- Stay positive and constructive\n"

        # Avoided topics
        avoided_topics = profile.get("avoidedTopics", [])
        if avoided_topics:
            prompt += f"- Avoid discussing: {', '.join(avoided_topics)}\n"

        return prompt

    async def _get_or_create_profile(self, user_id: str) -> Dict:
        """Get or create personality profile"""
        profile = await self.db.personalityprofile.find_unique(
            where={"userId": user_id}
        )

        if not profile:
            profile = await self.db.personalityprofile.create(
                data={
                    "userId": user_id,
                    "name": "Creator",
                    "platform": "twitch",
                }
            )

        # Convert to dict for easier manipulation
        return {
            "name": profile.name,
            "tone": profile.tone,
            "responseLength": profile.responseLength,
            "traits": profile.traits or {},
            "writingStyle": profile.writingStyle or {},
            "vocabulary": profile.vocabulary or [],
            "catchphrases": profile.catchphrases or [],
            "emojiPreference": profile.emojiPreference or [],
            "avoidedTopics": profile.avoidedTopics or [],
        }

    async def _get_relevant_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[Dict]:
        """Get relevant memories for context"""
        memories = await self.db.memory.find_many(
            where={"userId": user_id},
            order_by=[
                {"importance": "desc"},
                {"lastAccessedAt": "desc"},
            ],
            take=limit,
        )

        # Update access counts
        for memory in memories:
            await self.db.memory.update(
                where={"id": memory.id},
                data={
                    "lastAccessedAt": datetime.utcnow(),
                    "accessCount": {"increment": 1},
                },
            )

        return [
            {
                "content": m.content,
                "importance": m.importance,
                "type": m.memoryType,
            }
            for m in memories
        ]

    async def _get_conversation_history(
        self,
        user_id: str,
        platform: Optional[str] = None
    ) -> List[Dict]:
        """Get recent conversation history"""
        where_clause = {"userId": user_id}
        if platform:
            where_clause["platform"] = platform

        conversations = await self.db.conversation.find_many(
            where=where_clause,
            order_by={"createdAt": "desc"},
            take=settings.context_window,
        )

        # Reverse to get chronological order
        conversations.reverse()

        return [
            {"role": conv.role, "content": conv.content}
            for conv in conversations
        ]

    async def _save_conversation(
        self,
        user_id: str,
        user_message: str,
        ai_response: str,
        context: Optional[Dict] = None
    ):
        """Save conversation to database"""
        ctx = context or {}

        # Save user message
        await self.db.conversation.create(
            data={
                "userId": user_id,
                "platform": ctx.get("platform", "unknown"),
                "platformUserId": ctx.get("platformUserId", "unknown"),
                "platformUsername": ctx.get("username"),
                "role": "user",
                "content": user_message,
                "channelId": ctx.get("channelId"),
            }
        )

        # Save AI response
        await self.db.conversation.create(
            data={
                "userId": user_id,
                "platform": ctx.get("platform", "unknown"),
                "platformUserId": "ai",
                "role": "assistant",
                "content": ai_response,
                "wasAIGenerated": True,
                "model": self.provider,
                "channelId": ctx.get("channelId"),
            }
        )

    async def learn_from_message(
        self,
        user_id: str,
        message: str,
        metadata: Optional[Dict] = None
    ):
        """Add message to training data"""
        await self.db.trainingdata.create(
            data={
                "userId": user_id,
                "platform": metadata.get("platform", "unknown") if metadata else "unknown",
                "dataType": "message",
                "content": message,
                "metadata": metadata or {},
            }
        )

        # Update message count
        await self.db.personalityprofile.update(
            where={"userId": user_id},
            data={"messagesSeen": {"increment": 1}},
        )
