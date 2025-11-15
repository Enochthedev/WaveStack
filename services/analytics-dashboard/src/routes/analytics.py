"""
Analytics API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


class EventTrack(BaseModel):
    event_type: str
    event_data: dict


class MetricQuery(BaseModel):
    org_id: str
    timeframe: str = "7d"


@router.get("/overview")
async def get_overview(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("7d", description="Timeframe (7d, 30d, 90d)")
):
    """
    Get comprehensive analytics overview

    Returns metrics across:
    - Content production
    - Engagement
    - Growth
    - Platform performance
    - Moderation
    - Revenue
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    return await analytics.get_overview(org_id, timeframe)


@router.get("/trends/{metric}")
async def get_trends(
    metric: str,
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("30d", description="Timeframe for trend data")
):
    """
    Get time-series trend data for a specific metric

    Examples: views, followers, engagement_rate, revenue
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    return await analytics.get_trends(org_id, metric, timeframe)


@router.get("/content/top")
async def get_top_content(
    org_id: str = Query(..., description="Organization ID"),
    limit: int = Query(10, ge=1, le=100, description="Number of items to return"),
    timeframe: str = Query("30d", description="Timeframe")
):
    """
    Get top performing content

    Returns best content by views, engagement, or other metrics
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    return await analytics.get_top_content(org_id, limit, timeframe)


@router.post("/track")
async def track_event(event: EventTrack, org_id: str = Query(...)):
    """
    Track an analytics event

    Used by other services to report metrics
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    success = await analytics.track_event(org_id, event.event_type, event.event_data)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to track event")

    return {"success": True, "message": "Event tracked successfully"}


@router.get("/comparison")
async def get_comparison(
    org_id: str = Query(..., description="Organization ID"),
    current_period: str = Query("7d", description="Current period"),
    previous_period: str = Query("7d", description="Previous period")
):
    """
    Compare metrics between two time periods

    Shows growth/decline between periods
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    return await analytics.get_comparison(org_id, current_period, previous_period)


@router.get("/platforms")
async def get_platform_breakdown(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("7d", description="Timeframe")
):
    """
    Get detailed breakdown by platform

    Shows performance across YouTube, Twitch, Instagram, etc.
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    overview = await analytics.get_overview(org_id, timeframe)
    return overview.get("platforms", {})


@router.get("/engagement")
async def get_engagement_details(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("7d", description="Timeframe")
):
    """
    Get detailed engagement metrics

    Views, likes, comments, shares, watch time, etc.
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    overview = await analytics.get_overview(org_id, timeframe)
    return overview.get("engagement", {})


@router.get("/growth")
async def get_growth_metrics(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("7d", description="Timeframe")
):
    """
    Get growth and follower metrics

    Followers, subscribers, retention, growth rate
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    overview = await analytics.get_overview(org_id, timeframe)
    return overview.get("growth", {})


@router.get("/revenue")
async def get_revenue_breakdown(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("7d", description="Timeframe")
):
    """
    Get revenue breakdown

    Ad revenue, sponsors, donations, merch, RPM
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    overview = await analytics.get_overview(org_id, timeframe)
    return overview.get("revenue", {})


@router.get("/moderation")
async def get_moderation_stats(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("7d", description="Timeframe")
):
    """
    Get moderation statistics

    Deleted messages, timeouts, bans, safety score
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    overview = await analytics.get_overview(org_id, timeframe)
    return overview.get("moderation", {})


@router.get("/realtime")
async def get_realtime_metrics(
    org_id: str = Query(..., description="Organization ID"),
    metric_type: Optional[str] = Query(None, description="Specific metric type")
):
    """
    Get real-time metrics (last 24 hours)

    Live view counts, active viewers, chat activity
    """
    from ..main import redis

    # Get recent events
    if metric_type:
        key = f"realtime:{org_id}:{metric_type}"
    else:
        key = f"realtime:{org_id}:*"

    events = await redis.lrange(key, 0, 99)  # Last 100 events

    return {
        "org_id": org_id,
        "metric_type": metric_type,
        "events": [eval(e) for e in events] if events else [],
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/export")
async def export_analytics(
    org_id: str = Query(..., description="Organization ID"),
    timeframe: str = Query("30d", description="Timeframe"),
    format: str = Query("json", description="Export format (json, csv)")
):
    """
    Export analytics data

    Download full analytics report
    """
    from ..services.analytics import AnalyticsService
    from ..main import redis

    analytics = AnalyticsService(redis)
    data = await analytics.get_overview(org_id, timeframe)

    if format == "csv":
        # Convert to CSV format
        # (would implement CSV conversion)
        return {"error": "CSV export not yet implemented"}

    return data


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "service": "Analytics Dashboard",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }
