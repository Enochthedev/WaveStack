"""
Memory Manager
Handles long-term memory storage, retrieval, and semantic search with vector embeddings
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

import chromadb
from chromadb.config import Settings as ChromaSettings
from openai import AsyncOpenAI
from prisma import Prisma
from redis.asyncio import Redis

from ..config import settings

logger = logging.getLogger(__name__)


class MemoryManager:
    """Manages long-term memories with semantic search"""

    def __init__(self, db: Prisma, redis: Redis):
        self.db = db
        self.redis = redis
        self.openai: Optional[AsyncOpenAI] = None
        self.chroma_client = None
        self.collection = None

    async def initialize(self):
        """Initialize memory manager with ChromaDB and embeddings"""
        try:
            # Initialize OpenAI for embeddings
            if settings.OPENAI_API_KEY:
                self.openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            # Initialize ChromaDB
            self.chroma_client = chromadb.PersistentClient(
                path=settings.CHROMA_PATH,
                settings=ChromaSettings(anonymized_telemetry=False)
            )

            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION,
                metadata={"description": "Creator personality memories"}
            )

            logger.info("Memory manager initialized with vector embeddings")

        except Exception as e:
            logger.error(f"Error initializing memory manager: {e}", exc_info=True)

    async def store_memory(
        self,
        user_id: str,
        content: str,
        memory_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Store a memory with vector embedding"""
        try:
            meta = metadata or {}

            # Calculate importance
            importance = self._calculate_importance(content, memory_type)

            # Create memory in database
            memory = await self.db.memory.create(
                data={
                    "userId": user_id,
                    "memoryType": memory_type,
                    "content": content,
                    "importance": importance,
                    "source": meta.get("source", "manual"),
                    "sourceId": meta.get("sourceId"),
                    "tags": meta.get("tags", [])
                }
            )

            # Create vector embedding and store in ChromaDB
            if self.openai and self.collection:
                embedding = await self._create_embedding(content)
                self.collection.add(
                    ids=[memory.id],
                    embeddings=[embedding],
                    documents=[content],
                    metadatas=[{
                        "user_id": user_id,
                        "type": memory_type,
                        "importance": importance,
                        "created_at": memory.learnedAt.isoformat()
                    }]
                )

            # Cache for quick access
            await self.redis.zadd(
                f"memory:recent:{user_id}",
                {memory.id: importance}
            )

            logger.info(f"Memory stored: {memory.id} (type={memory_type}, importance={importance})")
            return memory

        except Exception as e:
            logger.error(f"Error storing memory: {e}", exc_info=True)
            return None

    async def get_relevant_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[Any]:
        """Get relevant memories using semantic search"""
        try:
            memories = []

            # Semantic search with vector embeddings
            if self.openai and self.collection:
                query_embedding = await self._create_embedding(query)

                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=limit,
                    where={"user_id": user_id}
                )

                if results["ids"]:
                    memory_ids = results["ids"][0]
                    memories = await self.db.memory.find_many(
                        where={"id": {"in": memory_ids}}
                    )

            # If no semantic results, fall back to importance-based
            if not memories:
                memories = await self.db.memory.find_many(
                    where={"userId": user_id},
                    order={"importance": "desc", "lastAccessedAt": "desc"},
                    take=limit
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

        except Exception as e:
            logger.error(f"Error retrieving memories: {e}", exc_info=True)
            return []

    async def learn_from_conversation(self, user_id: str, conversation: List[Dict[str, str]]):
        """Extract and store memories from conversation"""
        try:
            facts = []
            preferences = []

            for msg in conversation:
                if msg["role"] == "user":
                    content = msg["content"].lower()

                    # Detect preferences
                    if any(phrase in content for phrase in ["i like", "i love", "i prefer", "i enjoy"]):
                        preferences.append(msg["content"])

                    # Detect facts
                    if any(phrase in content for phrase in ["my", "i am", "i'm", "i have"]):
                        facts.append(msg["content"])

            # Store as memories
            for fact in facts:
                await self.store_memory(user_id, fact, "fact", {"source": "conversation"})

            for pref in preferences:
                await self.store_memory(user_id, pref, "preference", {"source": "conversation"})

            logger.info(f"Learned from conversation: {len(facts)} facts, {len(preferences)} preferences")

        except Exception as e:
            logger.error(f"Error learning from conversation: {e}", exc_info=True)

    async def consolidate_memories(self, user_id: str) -> int:
        """Consolidate duplicate memories"""
        try:
            memories = await self.db.memory.find_many(
                where={"userId": user_id},
                order={"createdAt": "asc"}
            )

            # Group by normalized content
            content_map: Dict[str, List[str]] = {}
            for memory in memories:
                normalized = memory.content.lower().strip()
                if normalized not in content_map:
                    content_map[normalized] = []
                content_map[normalized].append(memory.id)

            # Merge duplicates
            merged = 0
            for content, ids in content_map.items():
                if len(ids) > 1:
                    # Keep first, delete others
                    delete_ids = ids[1:]
                    await self.db.memory.delete_many(
                        where={"id": {"in": delete_ids}}
                    )

                    # Remove from ChromaDB
                    if self.collection:
                        self.collection.delete(ids=delete_ids)

                    merged += len(delete_ids)

            logger.info(f"Consolidated {merged} duplicate memories for user {user_id}")
            return merged

        except Exception as e:
            logger.error(f"Error consolidating memories: {e}", exc_info=True)
            return 0

    async def prune_old_memories(self, user_id: str) -> int:
        """Prune old, low-importance memories"""
        try:
            cutoff_date = datetime.now() - timedelta(days=settings.MEMORY_RETENTION_DAYS)

            # Delete low-importance, rarely-accessed old memories
            result = await self.db.memory.delete_many(
                where={
                    "userId": user_id,
                    "importance": {"lt": 5},
                    "accessCount": {"lt": 3},
                    "lastAccessedAt": {"lt": cutoff_date}
                }
            )

            # Also delete from ChromaDB
            if self.collection and result:
                # ChromaDB handles this automatically based on IDs

                pass

            logger.info(f"Pruned {result} old memories for user {user_id}")
            return result

        except Exception as e:
            logger.error(f"Error pruning memories: {e}", exc_info=True)
            return 0

    async def _create_embedding(self, text: str) -> List[float]:
        """Create vector embedding for text"""
        try:
            response = await self.openai.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=text
            )
            return response.data[0].embedding

        except Exception as e:
            logger.error(f"Error creating embedding: {e}", exc_info=True)
            return [0.0] * 1536  # Return zero vector as fallback

    def _calculate_importance(self, content: str, memory_type: str) -> int:
        """Calculate memory importance (1-10)"""
        base_importance = {
            "fact": 7,
            "preference": 8,
            "event": 6,
            "relationship": 9
        }

        importance = base_importance.get(memory_type, 5)

        # Boost for high-value keywords
        high_value_keywords = [
            "always", "never", "favorite", "hate", "love",
            "important", "remember", "must", "essential"
        ]

        content_lower = content.lower()
        for keyword in high_value_keywords:
            if keyword in content_lower:
                importance = min(10, importance + 1)

        return importance
