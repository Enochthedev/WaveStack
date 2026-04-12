from enum import Enum

class AutonomyLevel(str, Enum):
    MANUAL = "manual"
    COPILOT = "copilot"
    AUTOPILOT = "autopilot"

class AgentType(str, Enum):
    CONTENT = "content"
    CLIP = "clip"
    PUBLISHING = "publishing"
    MODERATION = "moderation"
    ANALYTICS = "analytics"
    GROWTH = "growth"
    COMMUNITY = "community"
    REVENUE = "revenue"
