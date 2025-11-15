"""
Core Analytics Service
Aggregates metrics from all WaveStack services
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import pandas as pd
from redis import Redis
from sqlalchemy.orm import Session
import httpx

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.logger = logger

    async def get_overview(self, org_id: str, timeframe: str = "7d") -> Dict[str, Any]:
        """Get high-level overview of all metrics"""
        days = self._parse_timeframe(timeframe)

        # Fetch data from Redis cache first
        cache_key = f"analytics:overview:{org_id}:{timeframe}"
        cached = await self._get_cache(cache_key)
        if cached:
            return cached

        overview = {
            "timeframe": timeframe,
            "updated_at": datetime.utcnow().isoformat(),
            "content": await self._get_content_metrics(org_id, days),
            "engagement": await self._get_engagement_metrics(org_id, days),
            "growth": await self._get_growth_metrics(org_id, days),
            "platforms": await self._get_platform_metrics(org_id, days),
            "moderation": await self._get_moderation_metrics(org_id, days),
            "revenue": await self._get_revenue_metrics(org_id, days),
        }

        # Cache for 5 minutes
        await self._set_cache(cache_key, overview, 300)
        return overview

    async def _get_content_metrics(self, org_id: str, days: int) -> Dict[str, Any]:
        """Content production metrics"""
        return {
            "total_videos": await self._count_metric(f"content:{org_id}:videos", days),
            "total_clips": await self._count_metric(f"content:{org_id}:clips", days),
            "total_posts": await self._count_metric(f"content:{org_id}:posts", days),
            "thumbnails_generated": await self._count_metric(f"content:{org_id}:thumbnails", days),
            "ai_captions_used": await self._count_metric(f"content:{org_id}:ai_captions", days),
            "publishing_frequency": await self._calculate_frequency(f"content:{org_id}:published", days),
        }

    async def _get_engagement_metrics(self, org_id: str, days: int) -> Dict[str, Any]:
        """Audience engagement metrics"""
        return {
            "total_views": await self._sum_metric(f"engagement:{org_id}:views", days),
            "total_likes": await self._sum_metric(f"engagement:{org_id}:likes", days),
            "total_comments": await self._sum_metric(f"engagement:{org_id}:comments", days),
            "total_shares": await self._sum_metric(f"engagement:{org_id}:shares", days),
            "engagement_rate": await self._calculate_engagement_rate(org_id, days),
            "avg_watch_time": await self._avg_metric(f"engagement:{org_id}:watch_time", days),
            "chat_messages": await self._count_metric(f"engagement:{org_id}:chat_messages", days),
        }

    async def _get_growth_metrics(self, org_id: str, days: int) -> Dict[str, Any]:
        """Growth and follower metrics"""
        current_followers = await self._get_current_followers(org_id)
        previous_followers = await self._get_previous_followers(org_id, days)

        growth = current_followers - previous_followers
        growth_rate = (growth / previous_followers * 100) if previous_followers > 0 else 0

        return {
            "current_followers": current_followers,
            "new_followers": growth,
            "growth_rate": round(growth_rate, 2),
            "subscribers": await self._sum_metric(f"growth:{org_id}:subscribers", days),
            "unsubscribes": await self._sum_metric(f"growth:{org_id}:unsubscribes", days),
            "retention_rate": await self._calculate_retention_rate(org_id, days),
        }

    async def _get_platform_metrics(self, org_id: str, days: int) -> Dict[str, Any]:
        """Platform-specific metrics"""
        platforms = ["youtube", "twitch", "instagram", "tiktok", "facebook", "linkedin", "discord"]
        metrics = {}

        for platform in platforms:
            metrics[platform] = {
                "posts": await self._count_metric(f"platform:{org_id}:{platform}:posts", days),
                "views": await self._sum_metric(f"platform:{org_id}:{platform}:views", days),
                "engagement": await self._sum_metric(f"platform:{org_id}:{platform}:engagement", days),
                "followers": await self._get_current_value(f"platform:{org_id}:{platform}:followers"),
            }

        return metrics

    async def _get_moderation_metrics(self, org_id: str, days: int) -> Dict[str, Any]:
        """Moderation and safety metrics"""
        return {
            "messages_checked": await self._count_metric(f"moderation:{org_id}:checked", days),
            "messages_deleted": await self._count_metric(f"moderation:{org_id}:deleted", days),
            "timeouts_issued": await self._count_metric(f"moderation:{org_id}:timeouts", days),
            "bans_issued": await self._count_metric(f"moderation:{org_id}:bans", days),
            "toxicity_blocked": await self._count_metric(f"moderation:{org_id}:toxicity", days),
            "spam_blocked": await self._count_metric(f"moderation:{org_id}:spam", days),
            "safety_score": await self._calculate_safety_score(org_id, days),
        }

    async def _get_revenue_metrics(self, org_id: str, days: int) -> Dict[str, Any]:
        """Revenue and monetization metrics"""
        return {
            "ad_revenue": await self._sum_metric(f"revenue:{org_id}:ads", days),
            "sponsor_revenue": await self._sum_metric(f"revenue:{org_id}:sponsors", days),
            "donation_revenue": await self._sum_metric(f"revenue:{org_id}:donations", days),
            "merch_revenue": await self._sum_metric(f"revenue:{org_id}:merch", days),
            "total_revenue": await self._sum_metric(f"revenue:{org_id}:total", days),
            "revenue_per_view": await self._calculate_rpm(org_id, days),
        }

    async def get_trends(self, org_id: str, metric: str, timeframe: str = "30d") -> List[Dict[str, Any]]:
        """Get time-series trend data for a specific metric"""
        days = self._parse_timeframe(timeframe)
        trend_data = []

        for i in range(days):
            date = datetime.utcnow() - timedelta(days=days - i - 1)
            date_key = date.strftime("%Y-%m-%d")

            value = await self._get_daily_metric(org_id, metric, date_key)
            trend_data.append({
                "date": date_key,
                "value": value,
            })

        return trend_data

    async def get_top_content(self, org_id: str, limit: int = 10, timeframe: str = "30d") -> List[Dict[str, Any]]:
        """Get top performing content"""
        days = self._parse_timeframe(timeframe)

        # Get all content IDs from Redis
        content_key = f"content:{org_id}:all"
        content_ids = await self.redis.zrevrange(content_key, 0, -1, withscores=True)

        top_content = []
        for content_id, score in content_ids[:limit]:
            content_data = await self._get_content_details(org_id, content_id.decode())
            if content_data:
                top_content.append(content_data)

        return top_content

    async def track_event(self, org_id: str, event_type: str, event_data: Dict[str, Any]) -> bool:
        """Track an analytics event"""
        try:
            timestamp = datetime.utcnow()
            date_key = timestamp.strftime("%Y-%m-%d")
            hour_key = timestamp.strftime("%Y-%m-%d:%H")

            # Increment counters
            await self.redis.incr(f"{event_type}:{org_id}:{date_key}")
            await self.redis.incr(f"{event_type}:{org_id}:{hour_key}")

            # Store detailed event data
            event_key = f"event:{org_id}:{event_type}:{timestamp.isoformat()}"
            await self.redis.setex(event_key, 86400 * 90, str(event_data))  # 90 days retention

            # Update real-time metrics
            await self._update_realtime_metric(org_id, event_type, event_data)

            return True
        except Exception as e:
            self.logger.error(f"Error tracking event: {e}")
            return False

    async def get_comparison(self, org_id: str, current_period: str, previous_period: str) -> Dict[str, Any]:
        """Compare metrics between two time periods"""
        current_days = self._parse_timeframe(current_period)
        previous_days = self._parse_timeframe(previous_period)

        current_metrics = await self.get_overview(org_id, current_period)

        # Calculate previous period metrics
        # (simplified - would need actual historical data)

        comparison = {
            "current_period": current_period,
            "previous_period": previous_period,
            "changes": {},
        }

        return comparison

    # Helper methods
    def _parse_timeframe(self, timeframe: str) -> int:
        """Parse timeframe string to days"""
        if timeframe.endswith("d"):
            return int(timeframe[:-1])
        elif timeframe.endswith("w"):
            return int(timeframe[:-1]) * 7
        elif timeframe.endswith("m"):
            return int(timeframe[:-1]) * 30
        return 7  # default

    async def _count_metric(self, key: str, days: int) -> int:
        """Count metric over time period"""
        total = 0
        for i in range(days):
            date = datetime.utcnow() - timedelta(days=i)
            date_key = f"{key}:{date.strftime('%Y-%m-%d')}"
            value = await self.redis.get(date_key)
            total += int(value) if value else 0
        return total

    async def _sum_metric(self, key: str, days: int) -> float:
        """Sum metric values over time period"""
        total = 0.0
        for i in range(days):
            date = datetime.utcnow() - timedelta(days=i)
            date_key = f"{key}:{date.strftime('%Y-%m-%d')}"
            value = await self.redis.get(date_key)
            total += float(value) if value else 0.0
        return round(total, 2)

    async def _avg_metric(self, key: str, days: int) -> float:
        """Calculate average of metric over time period"""
        total = await self._sum_metric(key, days)
        count = await self._count_metric(f"{key}:count", days)
        return round(total / count, 2) if count > 0 else 0.0

    async def _get_current_value(self, key: str) -> int:
        """Get current value of a metric"""
        value = await self.redis.get(key)
        return int(value) if value else 0

    async def _calculate_frequency(self, key: str, days: int) -> float:
        """Calculate publishing frequency (posts per day)"""
        count = await self._count_metric(key, days)
        return round(count / days, 2)

    async def _calculate_engagement_rate(self, org_id: str, days: int) -> float:
        """Calculate overall engagement rate"""
        views = await self._sum_metric(f"engagement:{org_id}:views", days)
        engagements = (
            await self._sum_metric(f"engagement:{org_id}:likes", days) +
            await self._sum_metric(f"engagement:{org_id}:comments", days) +
            await self._sum_metric(f"engagement:{org_id}:shares", days)
        )
        return round((engagements / views * 100), 2) if views > 0 else 0.0

    async def _get_current_followers(self, org_id: str) -> int:
        """Get current total followers across all platforms"""
        platforms = ["youtube", "twitch", "instagram", "tiktok", "facebook", "linkedin"]
        total = 0
        for platform in platforms:
            followers = await self._get_current_value(f"platform:{org_id}:{platform}:followers")
            total += followers
        return total

    async def _get_previous_followers(self, org_id: str, days: int) -> int:
        """Get follower count from N days ago"""
        date = datetime.utcnow() - timedelta(days=days)
        date_key = date.strftime("%Y-%m-%d")
        value = await self.redis.get(f"growth:{org_id}:followers:{date_key}")
        return int(value) if value else 0

    async def _calculate_retention_rate(self, org_id: str, days: int) -> float:
        """Calculate audience retention rate"""
        # Simplified calculation
        return 85.5  # Placeholder

    async def _calculate_safety_score(self, org_id: str, days: int) -> float:
        """Calculate community safety score (0-100)"""
        total_messages = await self._count_metric(f"moderation:{org_id}:checked", days)
        violations = await self._count_metric(f"moderation:{org_id}:deleted", days)

        if total_messages == 0:
            return 100.0

        safety = ((total_messages - violations) / total_messages) * 100
        return round(safety, 1)

    async def _calculate_rpm(self, org_id: str, days: int) -> float:
        """Calculate Revenue Per Mille (per 1000 views)"""
        revenue = await self._sum_metric(f"revenue:{org_id}:total", days)
        views = await self._sum_metric(f"engagement:{org_id}:views", days)

        if views == 0:
            return 0.0

        rpm = (revenue / views) * 1000
        return round(rpm, 2)

    async def _get_daily_metric(self, org_id: str, metric: str, date_key: str) -> float:
        """Get metric value for a specific day"""
        value = await self.redis.get(f"{metric}:{org_id}:{date_key}")
        return float(value) if value else 0.0

    async def _get_content_details(self, org_id: str, content_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a piece of content"""
        # This would fetch from database in production
        return {
            "id": content_id,
            "title": "Sample Content",
            "views": 1000,
            "engagement_rate": 5.5,
        }

    async def _update_realtime_metric(self, org_id: str, event_type: str, event_data: Dict[str, Any]):
        """Update real-time metrics stream"""
        metric_key = f"realtime:{org_id}:{event_type}"
        await self.redis.lpush(metric_key, str(event_data))
        await self.redis.ltrim(metric_key, 0, 999)  # Keep last 1000 events

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached data"""
        data = await self.redis.get(f"cache:{key}")
        return eval(data) if data else None

    async def _set_cache(self, key: str, data: Dict[str, Any], ttl: int):
        """Set cache data with TTL"""
        await self.redis.setex(f"cache:{key}", ttl, str(data))
