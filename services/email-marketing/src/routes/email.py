from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/email", tags=["email-marketing"])

class Campaign(BaseModel):
    name: str
    subject: str
    content: str
    segment: Optional[str] = "all"

class Subscriber(BaseModel):
    email: str
    name: Optional[str] = None
    tags: List[str] = []

@router.post("/campaigns/create")
async def create_campaign(campaign: Campaign):
    """Create email campaign"""
    return {"success": True, "campaign_id": "camp_123", "status": "draft"}

@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, schedule: Optional[str] = None):
    """Send email campaign"""
    return {"success": True, "campaign_id": campaign_id, "recipients": 1500, "scheduled": schedule or "now"}

@router.post("/subscribers/add")
async def add_subscriber(subscriber: Subscriber):
    """Add email subscriber"""
    return {"success": True, "subscriber_id": "sub_123", "status": "active"}

@router.get("/subscribers")
async def get_subscribers(segment: Optional[str] = None):
    """Get subscriber list"""
    return {"subscribers": [{"email": "user@example.com", "status": "active"}], "total": 1500}

@router.get("/analytics/{campaign_id}")
async def get_campaign_analytics(campaign_id: str):
    """Get campaign analytics"""
    return {
        "campaign_id": campaign_id,
        "sent": 1500,
        "opened": 450,
        "clicked": 120,
        "open_rate": 30.0,
        "click_rate": 8.0
    }

@router.post("/templates/create")
async def create_template(name: str, html: str):
    """Create email template"""
    return {"success": True, "template_id": "tpl_123"}

@router.post("/drip/create")
async def create_drip_campaign(name: str, emails: List[dict]):
    """Create automated drip campaign"""
    return {"success": True, "drip_id": "drip_123", "emails_count": len(emails)}
