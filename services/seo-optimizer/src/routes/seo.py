"""
SEO Optimizer API Routes
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/api/v1/seo", tags=["seo"])


class TitleOptimization(BaseModel):
    title: str
    context: Dict[str, Any] = {}


class DescriptionOptimization(BaseModel):
    description: str
    keywords: List[str] = []


class ContentOptimization(BaseModel):
    title: str
    description: str
    content: str = ""
    platform: str = "youtube"


@router.post("/optimize/title")
async def optimize_title(data: TitleOptimization):
    """Optimize title for SEO"""
    from ..services.seo import SEOService
    from ..main import redis
    from ..config import settings

    seo = SEOService(redis, settings.AI_PERSONALITY_URL, settings.OPENAI_API_KEY)
    return await seo.optimize_title(data.title, data.context)


@router.post("/optimize/description")
async def optimize_description(data: DescriptionOptimization):
    """Optimize description for SEO"""
    from ..services.seo import SEOService
    from ..main import redis
    from ..config import settings

    seo = SEOService(redis, settings.AI_PERSONALITY_URL, settings.OPENAI_API_KEY)
    return await seo.optimize_description(data.description, data.keywords)


@router.post("/optimize/content")
async def optimize_content(data: ContentOptimization):
    """Comprehensive content SEO optimization"""
    from ..services.seo import SEOService
    from ..main import redis
    from ..config import settings

    seo = SEOService(redis, settings.AI_PERSONALITY_URL, settings.OPENAI_API_KEY)
    return await seo.optimize_content(data.dict())


@router.get("/keywords/research")
async def research_keywords(
    topic: str = Query(..., description="Topic to research"),
    platform: str = Query("youtube", description="Platform (youtube, google, etc.)")
):
    """Research keywords for a topic"""
    from ..services.seo import SEOService
    from ..main import redis
    from ..config import settings

    seo = SEOService(redis, settings.AI_PERSONALITY_URL, settings.OPENAI_API_KEY)
    return await seo.research_keywords(topic, platform)


@router.get("/keywords/competition")
async def analyze_competition(
    keyword: str = Query(..., description="Keyword to analyze"),
    platform: str = Query("youtube", description="Platform")
):
    """Analyze competition for a keyword"""
    from ..services.seo import SEOService
    from ..main import redis
    from ..config import settings

    seo = SEOService(redis, settings.AI_PERSONALITY_URL, settings.OPENAI_API_KEY)
    return await seo.analyze_competition(keyword, platform)


@router.post("/tags/generate")
async def generate_tags(
    content: str,
    max_tags: int = Query(30, ge=1, le=500)
):
    """Generate SEO-optimized tags"""
    from ..services.seo import SEOService
    from ..main import redis
    from ..config import settings

    seo = SEOService(redis, settings.AI_PERSONALITY_URL, settings.OPENAI_API_KEY)
    tags = await seo.generate_tags(content, max_tags)
    return {"tags": tags, "count": len(tags)}
