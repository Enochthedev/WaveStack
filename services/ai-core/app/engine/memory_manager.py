"""
Memory Manager
Handles long-term memory storage with vector embeddings for semantic search
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from prisma import Prisma
import redis.asyncio as redis
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger(__name__)


class MemoryManager:
    """Manages long-term memories with semantic search capabilities"""

    def __init__(self, db: Prisma, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        self.chroma_client: Optional[chromadb.Client] = None
        self.collection = None
        self.embedder: Optional[SentenceTransformer] = None

    async def initialize(self):
        """Initialize vector database and embedding model"""
        try:
            # Initialize ChromaDB
            self.chroma_client = chromadb.HttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port,
                settings=ChromaSettings(allow_reset=True)
            )

            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name=settings.chroma_collection,
                metadata={"description": "WaveStack personality memories"}
            )

            # Initialize embedding model
            self.embedder = SentenceTransformer('all-MiniLM-L6-v2')

            logger.info("✅ Memory manager initialized with vector search")

        except Exception as e:
            logger.warning(f"ChromaDB not available, using basic memory: {e}")

    async def store_memory(
        self,
        user_id: str,
        content: str,
        memory_type: str,
        metadata: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Store a memory with vector embedding"""
        try:
            # Calculate importance
            importance = self._calculate_importance(content, memory_type)

            # Create memory in database
            memory = await self.db.memory.create(
                data={
                    "userId": user_id,
                    "memoryType": memory_type,
                    "content": content,
                    "importance": importance,
                    "source": metadata.get("source", "manual") if metadata else "manual",
                    "sourceId": metadata.get("sourceId") if metadata else None,
                    "tags": metadata.get("tags", []) if metadata else [],
                }
            )

            # Store vector embedding if available
            if self.collection and self.embedder:
                embedding = self.embedder.encode(content).tolist()
                self.collection.add(
                    embeddings=[embedding],
                    documents=[content],
                    metadatas=[{
                        "memory_id": memory.id,
                        "user_id": user_id,
                        "type": memory_type,
                        "importance": importance,
                    }],
                    ids=[memory.id],
                )

            # Cache in Redis
            await self.redis.zadd(
                f"memory:recent:{user_id}",
                {memory.id: importance}
            )

            logger.info(f"Stored memory {memory.id} for user {user_id}")
            return {
                "id": memory.id,
                "content": content,
                "type": memory_type,
                "importance": importance,
            }

        except Exception as e:
            logger.error(f"Error storing memory: {e}", exc_info=True)
            return None

    async def get_relevant_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 10,
        use_semantic_search: bool = True
    ) -> List[Dict]:
        """Get memories relevant to query using semantic search"""
        try:
            if use_semantic_search and self.collection and self.embedder:
                # Use vector similarity search
                query_embedding = self.embedder.encode(query).tolist()

                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    where={"user_id": user_id},
                    n_results=limit,
                )

                if results and results["ids"]:
                    memory_ids = results["ids"][0]

                    # Get full memory objects
                    memories = await self.db.memory.find_many(
                        where={"id": {"in": memory_ids}},
                    )

                    # Update access stats
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
                            "id": m.id,
                            "content": m.content,
                            "type": m.memoryType,
                            "importance": m.importance,
                        }
                        for m in memories
                    ]

            # Fallback to importance-based retrieval
            memories = await self.db.memory.find_many(
                where={"userId": user_id},
                order_by=[
                    {"importance": "desc"},
                    {"lastAccessedAt": "desc"},
                ],
                take=limit,
            )

            # Update access stats
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
                    "id": m.id,
                    "content": m.content,
                    "type": m.memoryType,
                    "importance": m.importance,
                }
                for m in memories
            ]

        except Exception as e:
            logger.error(f"Error getting memories: {e}", exc_info=True)
            return []

    async def learn_from_conversation(
        self,
        user_id: str,
        messages: List[Dict]
    ):
        """Extract and store memories from conversation"""
        try:
            facts = []
            preferences = []

            for msg in messages:
                if msg.get("role") == "user":
                    content = msg["content"].lower()

                    # Detect preferences
                    if any(word in content for word in ["i like", "i love", "i prefer", "i enjoy"]):
                        preferences.append(msg["content"])

                    # Detect facts
                    if any(word in content for word in ["my", "i am", "i'm", "i have", "i've been"]):
                        facts.append(msg["content"])

            # Store as memories
            for fact in facts:
                await self.store_memory(
                    user_id,
                    fact,
                    "fact",
                    {"source": "conversation"}
                )

            for pref in preferences:
                await self.store_memory(
                    user_id,
                    pref,
                    "preference",
                    {"source": "conversation"}
                )

            logger.info(
                f"Learned {len(facts)} facts and {len(preferences)} preferences "
                f"from conversation for user {user_id}"
            )

        except Exception as e:
            logger.error(f"Error learning from conversation: {e}", exc_info=True)

    async def consolidate_memories(self, user_id: str) -> int:
        """Remove duplicate and merge similar memories"""
        try:
            memories = await self.db.memory.find_many(
                where={"userId": user_id},
                order_by={"createdAt": "asc"},
            )

            # Find duplicates
            content_map = {}
            for memory in memories:
                normalized = memory.content.lower().strip()
                if normalized not in content_map:
                    content_map[normalized] = []
                content_map[normalized].append(memory.id)

            # Merge duplicates
            merged = 0
            for content, ids in content_map.items():
                if len(ids) > 1:
                    # Keep first, delete rest
                    keep_id = ids[0]
                    delete_ids = ids[1:]

                    await self.db.memory.delete_many(
                        where={"id": {"in": delete_ids}}
                    )

                    # Remove from vector DB
                    if self.collection:
                        self.collection.delete(ids=delete_ids)

                    merged += len(delete_ids)

            logger.info(f"Consolidated {merged} duplicate memories for user {user_id}")
            return merged

        except Exception as e:
            logger.error(f"Error consolidating memories: {e}", exc_info=True)
            return 0

    async def prune_old_memories(self, user_id: str) -> int:
        """Remove old, low-importance memories"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(
                days=settings.memory_retention_days
            )

            # Delete low-importance, rarely-accessed old memories
            deleted_memories = await self.db.memory.find_many(
                where={
                    "userId": user_id,
                    "importance": {"lt": settings.min_memory_importance},
                    "accessCount": {"lt": 3},
                    "lastAccessedAt": {"lt": cutoff_date},
                }
            )

            if deleted_memories:
                memory_ids = [m.id for m in deleted_memories]

                # Delete from database
                await self.db.memory.delete_many(
                    where={"id": {"in": memory_ids}}
                )

                # Delete from vector DB
                if self.collection:
                    self.collection.delete(ids=memory_ids)

                logger.info(f"Pruned {len(memory_ids)} old memories for user {user_id}")
                return len(memory_ids)

            return 0

        except Exception as e:
            logger.error(f"Error pruning memories: {e}", exc_info=True)
            return 0

    def _calculate_importance(self, content: str, memory_type: str) -> int:
        """Calculate memory importance (1-10 scale)"""
        # Base importance by type
        base_importance = {
            "fact": 7,
            "preference": 8,
            "event": 6,
            "relationship": 9,
        }

        importance = base_importance.get(memory_type, 5)

        # Increase for high-value keywords
        high_value_keywords = [
            "always", "never", "favorite", "hate", "love",
            "important", "remember", "essential", "crucial"
        ]

        content_lower = content.lower()
        for keyword in high_value_keywords:
            if keyword in content_lower:
                importance = min(10, importance + 1)

        return importance
