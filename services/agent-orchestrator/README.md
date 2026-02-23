# Agent Orchestrator

Multi-agent coordination service — manage autonomous AI agents, task queues with approval workflows, agent crews, and an AI chat interface with streaming responses.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Python 3.11 |
| Framework | FastAPI |
| Server | uvicorn |
| ORM | Prisma (PostgreSQL) |
| Cache/Queue | Redis 7 |
| AI | OpenAI / Anthropic / Ollama |
| Streaming | sse-starlette (SSE) |
| HTTP Client | httpx |
| Config | pydantic-settings |

## Port: 3300

**Depends on:** MCP Gateway (3100), Skills Service (3200), Knowledge Service (3400), AI Personality (8200)

## Directory Structure

```
services/agent-orchestrator/
├── Dockerfile
├── requirements.txt
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
    ├── __init__.py
    ├── main.py
    ├── config.py
    ├── api/
    │   ├── __init__.py
    │   ├── routes.py
    │   ├── agents.py         # Agent config CRUD
    │   ├── tasks.py          # Task queue
    │   ├── approvals.py      # Approval workflow
    │   ├── crews.py          # Multi-agent crews
    │   └── chat.py           # SSE streaming chat
    ├── agents/
    │   ├── __init__.py
    │   ├── base.py           # BaseAgent class
    │   ├── types.py          # AgentType, AutonomyLevel enums
    │   ├── registry.py       # Agent registry
    │   ├── content.py        # ContentAgent
    │   ├── clip.py           # ClipAgent
    │   ├── publishing.py     # PublishingAgent
    │   ├── moderation.py     # ModerationAgent
    │   ├── analytics.py      # AnalyticsAgent
    │   ├── growth.py         # GrowthAgent
    │   ├── community.py      # CommunityAgent
    │   └── revenue.py        # RevenueAgent
    ├── orchestration/
    │   ├── __init__.py
    │   ├── planner.py        # LLM-powered task decomposition
    │   ├── scheduler.py      # Priority queue scheduling
    │   ├── executor.py       # Execute via skills/MCP tools
    │   ├── approval.py       # Approval queue logic
    │   └── reasoning.py      # Reasoning trace logger
    ├── crews/
    │   ├── __init__.py
    │   ├── manager.py        # Crew lifecycle
    │   └── communication.py  # Agent-to-agent messaging
    └── chat/
        ├── __init__.py
        ├── handler.py        # Chat message routing
        └── streaming.py      # SSE streaming
```

## Agent Types

| Agent | Purpose | Default Autonomy |
|-------|---------|-------------------|
| Content | Generate captions, titles, descriptions | Copilot |
| Clip | Detect highlights, create clips | Copilot |
| Publishing | Schedule and publish content | Copilot |
| Moderation | Review flagged content, take action | Autopilot |
| Analytics | Generate insights, weekly reports | Autopilot |
| Growth | SEO optimization, trend surfing | Copilot |
| Community | Respond to DMs, comments, mentions | Manual |
| Revenue | Track sponsorships, optimize monetization | Manual |

## Autonomy Levels

| Level | Behavior | Example |
|-------|----------|---------|
| Manual | Agent suggests, human executes | "I recommend posting this clip to YouTube" |
| Copilot | Agent drafts, human approves | Shows draft post, user clicks Approve/Edit/Reject |
| Autopilot | Agent executes, human monitors | Auto-posts clips, user gets notification after |

## Database Models

### AgentConfig
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| agentType | String | Agent type identifier |
| name | String | Display name |
| autonomyLevel | String | "manual" / "copilot" / "autopilot" |
| isEnabled | Boolean | Whether agent is active |
| config | Json | Agent-specific configuration |
| allowedSkills | String[] | Skill IDs this agent can use |
| systemPrompt | Text? | Additional system prompt |

### AgentTask
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| agentId | String | FK to AgentConfig |
| title | String | Task title |
| taskType | String | Task category |
| priority | Int | 1-10 (10 = highest) |
| status | String | "queued" / "planning" / "awaiting_approval" / "running" / "completed" / "failed" |
| input | Json | Task input data |
| output | Json? | Task output |
| skillId | String? | Skill used for execution |
| reasoningTrace | Json | Step-by-step reasoning log |

### AgentDecision
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| taskId | String | FK to AgentTask |
| decisionType | String | "plan" / "tool_call" / "delegate" / "escalate" / "complete" |
| reasoning | Text | Why the agent made this decision |
| action | Json | What it decided to do |
| result | Json? | Outcome |
| confidence | Float? | Confidence score |

### ApprovalRequest
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| taskId | String | FK to AgentTask (unique) |
| orgId | String | Organization ID |
| title | String | Approval title |
| proposedAction | Json | What the agent wants to do |
| status | String | "pending" / "approved" / "rejected" / "expired" |
| expiresAt | DateTime? | Auto-expire time |

### AgentCrew
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| name | String | Crew name |
| goal | Text | Objective |
| status | String | "idle" / "planning" / "running" / "completed" / "failed" |

### CrewMessage
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| crewId | String | FK to AgentCrew |
| fromAgentType | String | Sender agent |
| toAgentType | String? | Receiver (null = broadcast) |
| messageType | String | "request" / "response" / "status_update" / "handoff" |
| content | Json | Message payload |

### ChatMessage
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| sessionId | String | Chat session ID |
| role | String | "user" / "assistant" / "system" |
| content | Text | Message content |
| agentType | String? | Which agent responded |
| metadata | Json | Tool calls, reasoning, etc. |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/agents` | List agent configs |
| GET | `/api/v1/agents/:agentType` | Get agent config |
| PUT | `/api/v1/agents/:agentType` | Update config |
| POST | `/api/v1/tasks` | Create task |
| GET | `/api/v1/tasks` | List tasks |
| GET | `/api/v1/tasks/:id` | Task detail + reasoning trace |
| POST | `/api/v1/tasks/:id/cancel` | Cancel task |
| GET | `/api/v1/approvals` | List pending approvals |
| POST | `/api/v1/approvals/:id/approve` | Approve |
| POST | `/api/v1/approvals/:id/reject` | Reject |
| POST | `/api/v1/crews` | Create crew |
| GET | `/api/v1/crews` | List crews |
| GET | `/api/v1/crews/:id` | Crew detail + messages |
| POST | `/api/v1/crews/:id/start` | Start crew |
| POST | `/api/v1/crews/:id/stop` | Stop crew |
| POST | `/api/v1/chat` | Chat message (SSE stream response) |
| GET | `/api/v1/chat/:sessionId` | Chat history |

## Environment Variables

```
PORT=3300
DATABASE_URL=postgresql://postgres:wave@postgres:5432/wave
REDIS_URL=redis://redis:6379
MCP_GATEWAY_URL=http://mcp-gateway:3100
SKILLS_URL=http://skills:3200
KNOWLEDGE_URL=http://knowledge:3400
AI_PERSONALITY_URL=http://ai-personality:8200
AI_PROVIDER=ollama
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2
MAX_CONCURRENT_TASKS=10
APPROVAL_TIMEOUT_HOURS=24
LOG_LEVEL=INFO
```
