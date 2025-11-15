from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/merch", tags=["merchandise"])

class Product(BaseModel):
    name: str
    price: float
    platform: str  # printful, teespring, shopify

@router.post("/products")
async def add_product(product: Product):
    """Add merchandise product"""
    return {"success": True, "product_id": "prod_123", "store_url": "https://store.example.com/prod_123"}

@router.get("/sales")
async def get_sales(timeframe: str = Query("30d")):
    """Get sales analytics"""
    return {"total_sales": 150, "revenue": 3500.50, "top_products": [{"name": "Logo T-Shirt", "sales": 45}]}

@router.get("/inventory")
async def get_inventory():
    """Get current inventory status"""
    return {"products": [{"name": "Logo T-Shirt", "stock": 100, "platform": "printful"}]}

@router.post("/sync")
async def sync_inventory(platform: str):
    """Sync inventory with platform"""
    return {"success": True, "synced_products": 12, "platform": platform}

@router.get("/links/generate")
async def generate_merch_links(content_id: str):
    """Auto-generate merch links for content"""
    return {"links": [{"platform": "printful", "url": "https://store.example.com"}], "auto_description": "Check out our merch!"}
