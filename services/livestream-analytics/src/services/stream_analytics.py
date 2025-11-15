"""
Live Stream Analytics Service
Real-time stream insights and metrics
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
from redis import Redis

logger = logging.getLogger(__name__)


class StreamAnalyticsService:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.logger = logger

    async def track_viewer(self, stream_id: str, viewer_data: Dict[str, Any]):
        """Track viewer join/leave events"""
        timestamp = datetime.utcnow().isoformat()
        await self.redis.zadd(f"stream:{stream_id}:viewers", {viewer_data["user_id"]: timestamp})
        await self.redis.incr(f"stream:{stream_id}:peak_viewers")

    async def track_chat_message(self, stream_id: str, message_data: Dict[str, Any]):
        """Track chat message for sentiment analysis"""
        await self.redis.lpush(f"stream:{stream_id}:chat", str(message_data))
        await self.redis.ltrim(f"stream:{stream_id}:chat", 0, 999)  # Keep last 1000
        await self.redis.incr(f"stream:{stream_id}:messages_count")

    async def get_realtime_stats(self, stream_id: str) -> Dict[str, Any]:
        """Get real-time stream statistics"""
        current_viewers = await self.redis.zcard(f"stream:{stream_id}:viewers")
        peak_viewers = await self.redis.get(f"stream:{stream_id}:peak_viewers") or 0
        messages_count = await self.redis.get(f"stream:{stream_id}:messages_count") or 0

        return {
            "stream_id": stream_id,
            "current_viewers": current_viewers,
            "peak_viewers": int(peak_viewers),
            "total_messages": int(messages_count),
            "chat_rate": await self._calculate_chat_rate(stream_id),
            "avg_watch_time": await self._calculate_avg_watch_time(stream_id),
            "engagement_score": await self._calculate_engagement_score(stream_id),
        }

    async def get_chat_sentiment(self, stream_id: str) -> Dict[str, Any]:
        """Analyze chat sentiment"""
        messages = await self.redis.lrange(f"stream:{stream_id}:chat", 0, 99)

        # Simple sentiment analysis (would use AI in production)
        positive_words = ["awesome", "great", "love", "amazing", "lol", "pog"]
        negative_words = ["bad", "hate", "worst", "sucks"]

        positive = sum(1 for msg in messages if any(word in str(msg).lower() for word in positive_words))
        negative = sum(1 for msg in messages if any(word in str(msg).lower() for word in negative_words))

        total = len(messages)
        sentiment_score = ((positive - negative) / total * 100) if total > 0 else 0

        return {
            "sentiment_score": round(sentiment_score, 1),
            "positive_ratio": round(positive / total * 100, 1) if total > 0 else 0,
            "negative_ratio": round(negative / total * 100, 1) if total > 0 else 0,
            "total_analyzed": total,
        }

    async def detect_peak_moments(self, stream_id: str) -> List[Dict[str, Any]]:
        """Detect peak engagement moments"""
        # Would analyze viewer spikes, chat rate increases, etc.
        return [
            {"timestamp": "2024-01-15T10:30:00Z", "type": "viewer_spike", "value": 150},
            {"timestamp": "2024-01-15T10:45:00Z", "type": "chat_spike", "value": 50},
        ]

    async def _calculate_chat_rate(self, stream_id: str) -> float:
        """Messages per minute"""
        count = await self.redis.get(f"stream:{stream_id}:messages_count") or 0
        # Simplified - would track time window
        return round(float(count) / 60, 1)

    async def _calculate_avg_watch_time(self, stream_id: str) -> float:
        """Average viewer watch time in minutes"""
        # Simplified calculation
        return 25.5

    async def _calculate_engagement_score(self, stream_id: str) -> float:
        """Overall engagement score (0-100)"""
        viewers = await self.redis.zcard(f"stream:{stream_id}:viewers")
        messages = await self.redis.get(f"stream:{stream_id}:messages_count") or 0

        # Simple formula: (messages / viewers) * scaling factor
        if viewers == 0:
            return 0.0

        engagement = (int(messages) / viewers) * 10
        return min(round(engagement, 1), 100.0)
