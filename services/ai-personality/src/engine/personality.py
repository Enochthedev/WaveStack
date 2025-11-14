"""
Personality Engine
Core AI that generates responses in the creator's voice
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from prisma import Prisma
from redis.asyncio import Redis

from ..config import settings

logger = logging.getLogger(__name__)


class PersonalityEngine:
    """Generates responses in the creator's unique voice"""

    def __init__(self, db: Prisma, redis: Redis):
        self.db = db
        self.redis = redis
        self.openai: Optional[AsyncOpenAI] = None
        self.anthropic: Optional[AsyncAnthropic] = None
        self.provider = settings.AI_PROVIDER

    async def initialize(self):
        """Initialize AI providers"""
        if self.provider == "openai" and settings.OPENAI_API_KEY:
            self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI initialized")

        elif self.provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            self.anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Anthropic Claude initialized")

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
            if self.provider == "openai" and self.openai:
                response = await self._generate_with_openai(system_prompt, history, message)
            elif self.provider == "anthropic" and self.anthropic:
                response = await self._generate_with_claude(system_prompt, history, message)
            else:
                raise ValueError("No AI provider configured")

            # Save conversation
            await self._save_conversation(user_id, message, response, context)

            # Update stats
            await self.redis.hincrby(f"ai:stats:{user_id}", "responses_generated", 1)

            return response

        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            return None

    async def _generate_with_openai(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        message: str
    ) -> str:
        """Generate response using OpenAI"""
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": message}
        ]

        completion = await self.openai.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=settings.PERSONALITY_TEMPERATURE,
            max_tokens=settings.PERSONALITY_MAX_TOKENS
        )

        return completion.choices[0].message.content or ""

    async def _generate_with_claude(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        message: str
    ) -> str:
        """Generate response using Anthropic Claude"""
        messages = [
            *history,
            {"role": "user", "content": message}
        ]

        response = await self.anthropic.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=settings.PERSONALITY_MAX_TOKENS,
            system=system_prompt,
            messages=messages,
            temperature=settings.PERSONALITY_TEMPERATURE
        )

        return response.content[0].text

    def _build_system_prompt(self, profile: Any, memories: List[Any]) -> str:
        """Build system prompt from personality profile and memories"""
        traits = profile.traits if isinstance(profile.traits, dict) else {}

        prompt = f"You are an AI clone of {profile.name}, a content creator. "
        prompt += "Your job is to respond EXACTLY as they would.\n\n"

        # Personality traits
        if traits:
            prompt += "PERSONALITY TRAITS:\n"
            for trait, value in traits.items():
                prompt += f"- {trait}: {value}\n"
            prompt += "\n"

        # Writing style
        prompt += "WRITING STYLE:\n"
        prompt += f"- Tone: {profile.tone or 'casual and friendly'}\n"
        prompt += f"- Response length: {profile.responseLength or 'medium'}\n"

        if profile.vocabulary:
            vocab_list = profile.vocabulary[:20] if isinstance(profile.vocabulary, list) else []
            if vocab_list:
                prompt += f"- Common vocabulary: {', '.join(vocab_list)}\n"

        if profile.catchphrases:
            catchphrases = profile.catchphrases if isinstance(profile.catchphrases, list) else []
            if catchphrases:
                prompt += f"- Catchphrases: {', '.join(catchphrases)}\n"

        if profile.emojiPreference:
            emojis = profile.emojiPreference[:10] if isinstance(profile.emojiPreference, list) else []
            if emojis:
                prompt += f"- Emoji usage: {' '.join(emojis)}\n"

        # Key memories
        if memories:
            prompt += "\nKEY MEMORIES:\n"
            for mem in memories[:10]:
                prompt += f"- {mem.content}\n"

        # Guidelines
        prompt += "\nGUIDELINES:\n"
        prompt += "- Stay in character at all times\n"
        prompt += "- Use natural, conversational language\n"
        prompt += "- Be authentic and genuine\n"
        prompt += "- Match the creator's humor and style\n"

        if settings.CONTROVERSY_AVOIDANCE:
            prompt += "- Avoid controversial topics unless specifically asked\n"
            prompt += "- Stay positive and constructive\n"

        if profile.avoidedTopics:
            avoided = profile.avoidedTopics if isinstance(profile.avoidedTopics, list) else []
            if avoided:
                prompt += f"- Avoid discussing: {', '.join(avoided)}\n"

        return prompt

    async def _get_or_create_profile(self, user_id: str):
        """Get or create personality profile"""
        profile = await self.db.personalityprofile.find_unique(where={"userId": user_id})

        if not profile:
            profile = await self.db.personalityprofile.create(
                data={
                    "userId": user_id,
                    "name": "Creator",
                    "platform": "twitch"
                }
            )

        return profile

    async def _get_relevant_memories(self, user_id: str, message: str) -> List[Any]:
        """Get relevant memories for context"""
        memories = await self.db.memory.find_many(
            where={"userId": user_id},
            order={"importance": "desc", "lastAccessedAt": "desc"},
            take=10
        )

        # Update access counts
        for memory in memories:
            await self.db.memory.update(
                where={"id": memory.id},
                data={
                    "lastAccessedAt": datetime.now(),
                    "accessCount": {"increment": 1}
                }
            )

        return memories

    async def _get_conversation_history(
        self,
        user_id: str,
        platform: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """Get recent conversation history"""
        where_clause = {"userId": user_id}
        if platform:
            where_clause["platform"] = platform

        conversations = await self.db.conversation.find_many(
            where=where_clause,
            order={"createdAt": "desc"},
            take=settings.CONTEXT_WINDOW
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
        context: Optional[Dict[str, Any]] = None
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
                "channelId": ctx.get("channelId")
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
                "channelId": ctx.get("channelId")
            }
        )

    async def learn_from_message(
        self,
        user_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Learn from a message"""
        meta = metadata or {}

        # Add to training data
        await self.db.trainingdata.create(
            data={
                "userId": user_id,
                "platform": meta.get("platform", "unknown"),
                "dataType": "message",
                "content": message,
                "metadata": meta
            }
        )

        # Update message count
        await self.db.personalityprofile.update(
            where={"userId": user_id},
            data={"messagesSeen": {"increment": 1}}
        )
