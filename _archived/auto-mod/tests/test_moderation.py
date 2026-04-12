"""Tests for auto-mod service moderation logic."""
from __future__ import annotations

import pytest


# ── Threshold logic ───────────────────────────────────────────────────────────

class ModerationThresholds:
    toxicity_warn: float = 0.5
    toxicity_timeout: float = 0.75
    toxicity_ban: float = 0.95
    spam_threshold: float = 0.8
    auto_delete: float = 0.7


def get_action(toxicity_score: float, spam_score: float, thresholds: ModerationThresholds) -> str:
    """Determine moderation action from scores."""
    if toxicity_score >= thresholds.toxicity_ban:
        return "ban"
    if toxicity_score >= thresholds.toxicity_timeout:
        return "timeout"
    if toxicity_score >= thresholds.auto_delete or spam_score >= thresholds.spam_threshold:
        return "delete"
    if toxicity_score >= thresholds.toxicity_warn:
        return "warn"
    return "allow"


thresholds = ModerationThresholds()


def test_clean_message_is_allowed():
    assert get_action(0.05, 0.1, thresholds) == "allow"


def test_mildly_toxic_triggers_warn():
    assert get_action(0.6, 0.0, thresholds) == "warn"


def test_moderately_toxic_triggers_timeout():
    assert get_action(0.8, 0.0, thresholds) == "timeout"


def test_highly_toxic_triggers_ban():
    assert get_action(0.97, 0.0, thresholds) == "ban"


def test_spam_triggers_delete():
    assert get_action(0.1, 0.9, thresholds) == "delete"


def test_ban_takes_priority_over_spam():
    # Even with spam, ban action should dominate
    assert get_action(0.96, 0.95, thresholds) == "ban"


def test_boundary_exactly_at_ban():
    assert get_action(0.95, 0.0, thresholds) == "ban"


def test_boundary_just_below_ban():
    assert get_action(0.94, 0.0, thresholds) == "timeout"


# ── Message classification categories ────────────────────────────────────────

CHAT_CATEGORIES = {"question_for_streamer", "community_chat", "command", "spam_or_toxicity"}


def classify_message(text: str) -> str:
    """Simplified classifier for testing the category structure."""
    if text.startswith("!"):
        return "command"
    if "?" in text:
        return "question_for_streamer"
    if any(slur in text.lower() for slur in ["hate", "slur", "offensive"]):
        return "spam_or_toxicity"
    return "community_chat"


def test_command_classification():
    assert classify_message("!clip") == "command"
    assert classify_message("!points") == "command"


def test_question_classification():
    assert classify_message("What game are you playing?") == "question_for_streamer"


def test_toxicity_classification():
    assert classify_message("some hate speech") == "spam_or_toxicity"


def test_chat_classification():
    assert classify_message("Nice play!") == "community_chat"


# ── Classify heuristic (mirrors the /classify endpoint logic) ────────────────

def classify_heuristic(text: str) -> str:
    """Mirror of the classify endpoint heuristic for fast unit testing."""
    t = text.strip()
    if t.startswith("!") or t.startswith("/"):
        return "command"
    lower = t.lower()
    if "http://" in lower or "https://" in lower or "www." in lower:
        return "spam_or_toxicity"
    if "?" in t:
        streamer_kw = ["you", "your", "do you", "are you", "can you", "will you"]
        if any(kw in lower for kw in streamer_kw):
            return "question_for_streamer"
        return "question_for_streamer"
    return "community_chat"


def test_classify_command():
    assert classify_heuristic("!clip") == "command"
    assert classify_heuristic("!points check") == "command"


def test_classify_question_for_streamer():
    assert classify_heuristic("What game are you playing?") == "question_for_streamer"
    assert classify_heuristic("Can you do a raid?") == "question_for_streamer"


def test_classify_spam_url():
    assert classify_heuristic("Buy follows at http://spam.com") == "spam_or_toxicity"


def test_classify_community_chat():
    assert classify_heuristic("Nice play!") == "community_chat"
    assert classify_heuristic("PogChamp") == "community_chat"


def test_all_categories_defined():
    assert "question_for_streamer" in CHAT_CATEGORIES
    assert "community_chat" in CHAT_CATEGORIES
    assert "command" in CHAT_CATEGORIES
    assert "spam_or_toxicity" in CHAT_CATEGORIES
