from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/sponsors", tags=["sponsors"])

class Sponsor(BaseModel):
    name: str
    contract_value: float
    start_date: str
    end_date: str
    obligations: List[str] = []

@router.post("/add")
async def add_sponsor(sponsor: Sponsor):
    """Add new sponsor"""
    return {"success": True, "sponsor_id": "sp_123", "message": "Sponsor added successfully"}

@router.get("/obligations")
async def get_obligations(status: str = "pending"):
    """Get sponsor obligations"""
    return {"obligations": [{"sponsor": "GameCo", "type": "video_mention", "due_date": "2024-02-01", "status": status}]}

@router.get("/revenue")
async def get_revenue_report(timeframe: str = "30d"):
    """Get sponsor revenue report"""
    return {"total_revenue": 5000, "active_sponsors": 3, "fulfilled_obligations": 12}

@router.post("/track-mention")
async def track_sponsor_mention(sponsor_id: str, content_id: str):
    """Track when sponsor is mentioned in content"""
    return {"success": True, "obligation_fulfilled": True}
