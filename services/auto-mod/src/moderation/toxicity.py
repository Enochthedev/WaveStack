"""
Toxicity Detection
"""
import logging
from typing import Dict, Optional
import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class ToxicityDetector:
    """Detect toxic/hateful content in messages"""

    def __init__(self):
        self.detoxify_model = None
        if settings.USE_DETOXIFY:
            self._load_detoxify()

    def _load_detoxify(self):
        """Load Detoxify model"""
        try:
            from detoxify import Detoxify
            self.detoxify_model = Detoxify('original')
            logger.info("✅ Detoxify model loaded")
        except Exception as e:
            logger.error(f"Failed to load Detoxify model: {e}")
            self.detoxify_model = None

    async def check_toxicity(self, message: str) -> Dict[str, any]:
        """
        Check message for toxicity

        Returns:
            {
                "is_toxic": bool,
                "toxicity_score": float,
                "categories": dict,
                "reason": str
            }
        """
        result = {
            "is_toxic": False,
            "toxicity_score": 0.0,
            "categories": {},
            "reason": None,
        }

        # Use Detoxify model
        if self.detoxify_model and settings.USE_DETOXIFY:
            try:
                scores = self.detoxify_model.predict(message)

                # Check each category
                categories = {}
                max_score = 0.0
                max_category = None

                for category, score in scores.items():
                    categories[category] = float(score)
                    if score > max_score:
                        max_score = score
                        max_category = category

                result["categories"] = categories
                result["toxicity_score"] = max_score

                if max_score >= settings.TOXICITY_THRESHOLD:
                    result["is_toxic"] = True
                    result["reason"] = f"High {max_category} score ({max_score:.2f})"

            except Exception as e:
                logger.error(f"Detoxify check failed: {e}")

        # Use AI for contextual analysis
        if settings.USE_AI_MODERATION:
            ai_result = await self._check_with_ai(message)
            if ai_result["is_toxic"]:
                result["is_toxic"] = True
                result["reason"] = result["reason"] or ai_result["reason"]

        return result

    async def _check_with_ai(self, message: str) -> Dict[str, any]:
        """Use AI personality for contextual toxicity check"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Analyze if this message is toxic, hateful, harassing, or inappropriate. Reply ONLY with 'TOXIC: <reason>' if it is, or 'SAFE' if it's not: \"{message}\"",
                        "platform": "moderation",
                    },
                    timeout=5.0,
                )

                if response.status_code == 200:
                    result_data = response.json()
                    ai_response = result_data.get("response", "").strip()

                    if ai_response.startswith("TOXIC"):
                        reason = ai_response.replace("TOXIC:", "").strip()
                        return {
                            "is_toxic": True,
                            "reason": f"AI: {reason}",
                        }

        except Exception as e:
            logger.warning(f"AI moderation check failed: {e}")

        return {"is_toxic": False, "reason": None}

    async def check_hate_speech(self, message: str) -> bool:
        """Check specifically for hate speech"""
        result = await self.check_toxicity(message)

        if result["categories"]:
            # Check hate-related categories
            hate_categories = ["identity_hate", "insult", "severe_toxic"]
            for category in hate_categories:
                if category in result["categories"] and result["categories"][category] > settings.TOXICITY_THRESHOLD:
                    return True

        return False


# Global instance
toxicity_detector = ToxicityDetector()
