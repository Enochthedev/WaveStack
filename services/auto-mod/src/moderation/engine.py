"""
Main Moderation Engine
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

from ..config import settings
from .toxicity import toxicity_detector
from .spam import spam_detector
from .filter import content_filter

logger = logging.getLogger(__name__)


class ModerationEngine:
    """Main moderation engine combining all checks"""

    def __init__(self):
        self.violations_log = {}  # user_id -> [violation_timestamp, ...]

    async def moderate_message(
        self,
        message: str,
        user_id: str,
        username: str,
        platform: str,
        channel_id: str,
        user_roles: List[str] = None,
    ) -> Dict[str, any]:
        """
        Moderate a message through all checks

        Returns:
            {
                "should_delete": bool,
                "should_timeout": bool,
                "should_ban": bool,
                "timeout_duration": int,
                "violations": list,
                "scores": dict,
                "actions": list,
                "reason": str
            }
        """
        # Check whitelist
        if user_roles and any(role in settings.WHITELIST_ROLES for role in user_roles):
            return self._create_response(
                should_delete=False,
                should_timeout=False,
                should_ban=False,
                violations=[],
                reason="Whitelisted user"
            )

        if user_id in settings.WHITELIST_USERS:
            return self._create_response(
                should_delete=False,
                should_timeout=False,
                should_ban=False,
                violations=[],
                reason="Whitelisted user"
            )

        violations = []
        scores = {}

        # 1. Check banned words/phrases
        filter_result = content_filter.check_content(message)
        if filter_result["has_violation"]:
            violations.extend(filter_result["violations"])
            scores["filter"] = 1.0

        # 2. Check toxicity
        toxicity_result = await toxicity_detector.check_toxicity(message)
        if toxicity_result["is_toxic"]:
            violations.append(f"Toxic content: {toxicity_result['reason']}")
            scores["toxicity"] = toxicity_result["toxicity_score"]

        # 3. Check spam
        spam_result = await spam_detector.check_spam(message, user_id, user_roles)
        if spam_result["is_spam"]:
            violations.extend([f"Spam: {r}" for r in spam_result["reasons"]])
            scores["spam"] = spam_result["spam_score"]

        # Determine actions
        should_delete = False
        should_timeout = False
        should_ban = False
        timeout_duration = settings.TIMEOUT_DURATION

        if violations:
            # Record violation
            self._record_violation(user_id)

            # Determine severity
            max_score = max(scores.values()) if scores else 0

            # Decide on action
            if max_score >= 0.9 or len(violations) >= 3:
                # Severe violation
                should_delete = settings.AUTO_DELETE
                should_timeout = settings.AUTO_TIMEOUT
                timeout_duration = settings.TIMEOUT_DURATION * 2

                # Check for ban
                violation_count = len(self.violations_log.get(user_id, []))
                if violation_count >= settings.VIOLATIONS_FOR_BAN:
                    should_ban = settings.AUTO_BAN

            elif max_score >= 0.7:
                # Moderate violation
                should_delete = settings.AUTO_DELETE
                should_timeout = settings.AUTO_TIMEOUT

            elif max_score >= 0.5:
                # Minor violation
                should_delete = settings.AUTO_DELETE

        reason = " | ".join(violations) if violations else None

        return self._create_response(
            should_delete=should_delete,
            should_timeout=should_timeout,
            should_ban=should_ban,
            timeout_duration=timeout_duration,
            violations=violations,
            scores=scores,
            reason=reason
        )

    def _record_violation(self, user_id: str):
        """Record a violation for a user"""
        if user_id not in self.violations_log:
            self.violations_log[user_id] = []

        self.violations_log[user_id].append(datetime.utcnow())

        # Keep only recent violations (last 24 hours)
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=24)
        self.violations_log[user_id] = [
            ts for ts in self.violations_log[user_id] if ts > cutoff
        ]

    def _create_response(
        self,
        should_delete: bool,
        should_timeout: bool,
        should_ban: bool,
        violations: List[str],
        timeout_duration: int = None,
        scores: Dict = None,
        reason: str = None
    ) -> Dict:
        """Create standardized response"""
        actions = []
        if should_delete:
            actions.append("delete")
        if should_timeout:
            actions.append("timeout")
        if should_ban:
            actions.append("ban")

        return {
            "should_delete": should_delete,
            "should_timeout": should_timeout,
            "should_ban": should_ban,
            "timeout_duration": timeout_duration or settings.TIMEOUT_DURATION,
            "violations": violations,
            "scores": scores or {},
            "actions": actions,
            "reason": reason,
        }

    def get_user_violations(self, user_id: str) -> int:
        """Get number of violations for a user"""
        return len(self.violations_log.get(user_id, []))

    def clear_user_violations(self, user_id: str):
        """Clear violations for a user"""
        if user_id in self.violations_log:
            del self.violations_log[user_id]


# Global instance
moderation_engine = ModerationEngine()
