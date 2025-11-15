"""
Banned Words and Phrases Filter
"""
import logging
import re
from typing import List, Dict

from ..config import settings

logger = logging.getLogger(__name__)


class ContentFilter:
    """Filter banned words and phrases"""

    def __init__(self):
        self.banned_words = set(settings.BANNED_WORDS)
        self.banned_phrases = settings.BANNED_PHRASES
        self.word_variants = {}  # word -> [variants with common bypasses]

    def add_banned_word(self, word: str):
        """Add a word to the banned list"""
        self.banned_words.add(word.lower())
        self._generate_variants(word)

    def _generate_variants(self, word: str):
        """Generate common bypass variants of a word"""
        word_lower = word.lower()
        variants = [word_lower]

        # Common character substitutions
        substitutions = {
            'a': ['@', '4', 'α'],
            'e': ['3', 'ε'],
            'i': ['1', '!', 'í'],
            'o': ['0', 'ο'],
            's': ['$', '5', 'ς'],
            't': ['7', '+'],
            'l': ['1', '|'],
        }

        # Generate variants with substitutions (limited to avoid explosion)
        for char, subs in substitutions.items():
            if char in word_lower:
                for sub in subs:
                    variants.append(word_lower.replace(char, sub))

        # Add spaces between characters
        variants.append(' '.join(word_lower))

        # Add dots between characters
        variants.append('.'.join(word_lower))

        self.word_variants[word_lower] = variants

    def check_content(self, message: str) -> Dict[str, any]:
        """
        Check message for banned content

        Returns:
            {
                "has_violation": bool,
                "violations": list,
                "filtered_message": str  # Message with violations removed
            }
        """
        violations = []
        message_lower = message.lower()

        # Remove special characters for checking
        clean_message = re.sub(r'[^a-z0-9\s]', '', message_lower)

        # Check banned words
        for word in self.banned_words:
            # Check exact word (with word boundaries)
            if re.search(rf'\b{re.escape(word)}\b', message_lower):
                violations.append(f"Banned word: {word}")

            # Check in clean message (handles l33tspeak)
            if word in clean_message:
                violations.append(f"Banned word (obfuscated): {word}")

            # Check variants
            if word in self.word_variants:
                for variant in self.word_variants[word]:
                    if variant in message_lower:
                        violations.append(f"Banned word (variant): {word}")
                        break

        # Check banned phrases
        for phrase in self.banned_phrases:
            if phrase.lower() in message_lower:
                violations.append(f"Banned phrase: {phrase}")

        # Create filtered message
        filtered_message = message
        if violations:
            for word in self.banned_words:
                pattern = re.compile(re.escape(word), re.IGNORECASE)
                filtered_message = pattern.sub('***', filtered_message)

        return {
            "has_violation": len(violations) > 0,
            "violations": violations,
            "filtered_message": filtered_message,
        }

    def add_phrase(self, phrase: str):
        """Add a phrase to the banned list"""
        if phrase not in self.banned_phrases:
            self.banned_phrases.append(phrase.lower())

    def remove_word(self, word: str):
        """Remove a word from the banned list"""
        word_lower = word.lower()
        self.banned_words.discard(word_lower)
        if word_lower in self.word_variants:
            del self.word_variants[word_lower]

    def get_banned_words(self) -> List[str]:
        """Get list of banned words"""
        return list(self.banned_words)


# Global instance
content_filter = ContentFilter()
