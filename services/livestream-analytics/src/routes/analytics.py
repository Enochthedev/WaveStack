from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/stream", tags=["stream-analytics"])


class ViewerEvent(BaseModel):
    stream_id: str
    user_id: str
    event_type: str  # join, leave


class ChatMessage(BaseModel):
    stream_id: str
    user_id: str
    username: str
    message: str


@router.get("/stats/{stream_id}")
async def get_realtime_stats(stream_id: str):
    """Get real-time stream statistics"""
    from ..services.stream_analytics import StreamAnalyticsService
    from ..main import redis

    analytics = StreamAnalyticsService(redis)
    return await analytics.get_realtime_stats(stream_id)


@router.get("/sentiment/{stream_id}")
async def get_chat_sentiment(stream_id: str):
    """Get chat sentiment analysis"""
    from ..services.stream_analytics import StreamAnalyticsService
    from ..main import redis

    analytics = StreamAnalyticsService(redis)
    return await analytics.get_chat_sentiment(stream_id)


@router.get("/peaks/{stream_id}")
async def detect_peak_moments(stream_id: str):
    """Detect peak engagement moments for clipping"""
    from ..services.stream_analytics import StreamAnalyticsService
    from ..main import redis

    analytics = StreamAnalyticsService(redis)
    return await analytics.detect_peak_moments(stream_id)


@router.post("/track/viewer")
async def track_viewer(event: ViewerEvent):
    """Track viewer join/leave events"""
    from ..services.stream_analytics import StreamAnalyticsService
    from ..main import redis

    analytics = StreamAnalyticsService(redis)
    await analytics.track_viewer(event.stream_id, event.dict())
    return {"success": True}


@router.post("/track/chat")
async def track_chat_message(message: ChatMessage):
    """Track chat message for sentiment analysis"""
    from ..services.stream_analytics import StreamAnalyticsService
    from ..main import redis

    analytics = StreamAnalyticsService(redis)
    await analytics.track_chat_message(message.stream_id, message.dict())
    return {"success": True}
