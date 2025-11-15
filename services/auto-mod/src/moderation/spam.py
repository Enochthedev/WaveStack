"""
Spam Detection
"""
import logging
import re
from typing import Dict, List
from collections import defaultdict
from datetime import datetime, timedelta
import validators
import tldextract

from ..config import settings

logger = logging.getLogger(__name__)


class SpamDetector:
    """Detect spam and suspicious messages"""

    def __init__(self):
        self.message_history = defaultdict(list)  # user_id -> [(message, timestamp), ...]
        self.link_cache = {}  # URL -> safety check result

    async def check_spam(
        self,
        message: str,
        user_id: str,
        user_roles: List[str] = None
    ) -> Dict[str, any]:
        """
        Check message for spam indicators

        Returns:
            {
                "is_spam": bool,
                "spam_score": float,
                "reasons": list,
                "action": str  # "none", "warn", "delete", "timeout"
            }
        """
        reasons = []
        spam_score = 0.0

        # Check exemptions
        if user_roles and any(role in settings.WHITELIST_ROLES for role in user_roles):
            return {
                "is_spam": False,
                "spam_score": 0.0,
                "reasons": [],
                "action": "none",
            }

        # 1. Check message length
        if len(message) < settings.MIN_MESSAGE_LENGTH:
            reasons.append("Message too short")
            spam_score += 0.2

        if len(message) > settings.MAX_MESSAGE_LENGTH:
            reasons.append("Message too long")
            spam_score += 0.3

        # 2. Check CAPS
        caps_ratio = sum(1 for c in message if c.isupper()) / max(len(message), 1)
        if caps_ratio > settings.MAX_CAPS_RATIO:
            reasons.append(f"Excessive caps ({caps_ratio:.0%})")
            spam_score += 0.4

        # 3. Check emojis
        emoji_count = len(re.findall(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]', message))
        if emoji_count > settings.MAX_EMOJIS:
            reasons.append(f"Excessive emojis ({emoji_count})")
            spam_score += 0.3

        # 4. Check mentions
        mention_count = len(re.findall(r'@\w+', message))
        if mention_count > settings.MAX_MENTIONS:
            reasons.append(f"Excessive mentions ({mention_count})")
            spam_score += 0.4

        # 5. Check links
        links = re.findall(r'https?://[^\s]+', message)
        if len(links) > settings.MAX_LINKS:
            reasons.append(f"Excessive links ({len(links)})")
            spam_score += 0.5

        # Check link safety
        for link in links:
            if not await self._check_link_safety(link):
                reasons.append(f"Suspicious link: {link}")
                spam_score += 0.8

        # 6. Check repeated characters
        if re.search(r'(.)\1{5,}', message):  # Same character 6+ times
            reasons.append("Repeated characters")
            spam_score += 0.3

        # 7. Check repeated messages
        if await self._check_repeat_spam(user_id, message):
            reasons.append("Repeated message spam")
            spam_score += 0.6

        # 8. Check for common spam patterns
        spam_patterns = [
            r'(?i)(buy|sell|cheap|discount|offer|deal).*(now|today|limited)',
            r'(?i)(click here|check out|visit|go to).*(link|website)',
            r'(?i)(free|prize|winner|won|claim).*(money|gift|reward)',
            r'(?i)(dm me|message me|add me).*(discord|telegram|whatsapp)',
        ]

        for pattern in spam_patterns:
            if re.search(pattern, message):
                reasons.append("Spam keyword pattern detected")
                spam_score += 0.4
                break

        # Determine action
        action = "none"
        if spam_score >= settings.SPAM_THRESHOLD:
            if spam_score >= 0.8:
                action = "timeout" if settings.AUTO_TIMEOUT else "delete"
            elif spam_score >= 0.6:
                action = "delete" if settings.AUTO_DELETE else "warn"
            else:
                action = "warn"

        return {
            "is_spam": spam_score >= settings.SPAM_THRESHOLD,
            "spam_score": spam_score,
            "reasons": reasons,
            "action": action,
        }

    async def _check_link_safety(self, url: str) -> bool:
        """Check if link is safe"""
        if not settings.CHECK_LINK_SAFETY:
            return True

        # Check cache
        if url in self.link_cache:
            return self.link_cache[url]

        # Validate URL format
        if not validators.url(url):
            self.link_cache[url] = False
            return False

        # Extract domain
        extracted = tldextract.extract(url)
        domain = f"{extracted.domain}.{extracted.suffix}"

        # Check blocked domains
        if domain in settings.BLOCKED_DOMAINS:
            self.link_cache[url] = False
            return False

        # Check allowed domains
        if settings.ALLOWED_DOMAINS:
            is_allowed = any(
                domain == allowed or domain.endswith(f'.{allowed}')
                for allowed in settings.ALLOWED_DOMAINS
            )
            self.link_cache[url] = is_allowed
            return is_allowed

        # Default to safe if no restrictions
        self.link_cache[url] = True
        return True

    async def _check_repeat_spam(self, user_id: str, message: str) -> bool:
        """Check if user is repeating the same message"""
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=settings.REPEAT_MESSAGE_WINDOW)

        # Clean old messages
        self.message_history[user_id] = [
            (msg, ts) for msg, ts in self.message_history[user_id]
            if ts > cutoff
        ]

        # Count same messages
        same_count = sum(1 for msg, _ in self.message_history[user_id] if msg == message)

        # Add current message
        self.message_history[user_id].append((message, now))

        return same_count >= settings.REPEAT_MESSAGE_COUNT


# Global instance
spam_detector = SpamDetector()
