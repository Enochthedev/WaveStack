# Skills Service

Composable workflow engine — store, version, publish, and execute multi-step "skills" that chain MCP tool calls together. Includes a marketplace for sharing skills.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Framework | Fastify 4 |
| Language | TypeScript 5 |
| ORM | Prisma (PostgreSQL) |
| Cache/Queue | Redis 7 |
| Validation | Zod |
| Logging | pino |
| Package Manager | pnpm |

## Port: 3200

**Depends on:** MCP Gateway (port 3100)

## Directory Structure

```
services/skills/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.ts
    ├── config/
    │   └── env.ts
    ├── shared/
    │   ├── db.ts
    │   ├── logger.ts
    │   └── redis.ts
    ├── api/
    │   ├── routes.ts
    │   ├── skills.ts         # CRUD
    │   ├── versions.ts       # Versioning
    │   ├── marketplace.ts    # Publish, install, fork, rate
    │   └── executions.ts     # Run skills, view results
    └── engine/
        ├── executor.ts       # Walk steps, call MCP Gateway, build context
        ├── validator.ts      # Validate skill definitions
        └── types.ts          # SkillStep, SkillDefinition types
```

## What is a Skill?

A skill is a composable, reusable unit of automation that combines one or more MCP tool calls into a named workflow. Think of it like a "recipe" or "macro" for creator workflows.

**Example: "Clip & Ship"**
1. Trigger: Manual or on stream highlight detection
2. Step 1: Call Clipper to create clip
3. Step 2: Call Thumbnail Generator for thumbnail
4. Step 3: Call AI Personality for caption
5. Step 4: Call Social Publisher to post to TikTok + YouTube Shorts

## Database Models

### Skill
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| name | String | Skill name |
| slug | String | URL-safe identifier |
| description | Text? | Description |
| category | String | "content" / "moderation" / "analytics" / "growth" / "custom" |
| isPublic | Boolean | Published to marketplace |
| forkedFromId | String? | Source skill if forked |
| installCount | Int | Install count |
| ratingSum | Int | Sum of ratings |
| ratingCount | Int | Number of ratings |
| authorId | String | Creator's user ID |

### SkillVersion
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| skillId | String | FK to Skill |
| version | String | Semver (e.g. "1.0.0") |
| definition | Json | Array of SkillStep objects |
| inputSchema | Json | What the user must provide |
| outputMapping | Json | Which step outputs to surface |
| isLatest | Boolean | Latest version flag |
| isPublished | Boolean | Published flag |

### SkillExecution
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| skillId | String | FK to Skill |
| versionId | String | FK to SkillVersion |
| orgId | String | Organization ID |
| triggeredBy | String | Agent or user ID |
| triggerType | String | "agent" / "user" / "schedule" |
| input | Json | Execution input |
| output | Json? | Final output |
| status | String | "pending" / "running" / "completed" / "failed" / "cancelled" |
| stepResults | Json | Step-by-step execution log |
| durationMs | Int? | Total execution time |

### SkillRating
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| skillId | String | FK to Skill |
| userId | String | Rater's user ID |
| rating | Int | 1-5 stars |
| review | Text? | Written review |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/skills` | List skills |
| POST | `/api/v1/skills` | Create skill |
| GET | `/api/v1/skills/:id` | Get skill |
| PUT | `/api/v1/skills/:id` | Update skill |
| DELETE | `/api/v1/skills/:id` | Delete skill |
| POST | `/api/v1/skills/:id/versions` | Create version |
| GET | `/api/v1/skills/:id/versions` | List versions |
| POST | `/api/v1/skills/:id/execute` | Execute skill |
| GET | `/api/v1/executions` | List executions |
| GET | `/api/v1/executions/:id` | Execution detail |
| POST | `/api/v1/executions/:id/cancel` | Cancel execution |
| GET | `/api/v1/marketplace` | Browse public skills |
| POST | `/api/v1/marketplace/:id/install` | Install skill |
| POST | `/api/v1/marketplace/:id/fork` | Fork skill |
| POST | `/api/v1/marketplace/:id/rate` | Rate skill |
| POST | `/api/v1/skills/:id/publish` | Publish to marketplace |

## Environment Variables

```
PORT=3200
DATABASE_URL=postgresql://postgres:wave@postgres:5432/wave
REDIS_URL=redis://redis:6379
MCP_GATEWAY_URL=http://mcp-gateway:3100
LOG_LEVEL=info
```
