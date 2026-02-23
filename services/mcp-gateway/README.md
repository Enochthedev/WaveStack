# MCP Gateway

Central hub for Model Context Protocol (MCP) server management — connects to MCP servers, discovers tools, routes tool calls, caches results, and tracks permissions/usage.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Framework | Fastify 4 |
| Language | TypeScript 5 |
| ORM | Prisma (PostgreSQL) |
| Cache/Queue | Redis 7 |
| MCP SDK | @modelcontextprotocol/sdk |
| Validation | Zod |
| Logging | pino |
| Package Manager | pnpm |

## Port: 3100

## Directory Structure

```
services/mcp-gateway/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.ts              # Fastify entry, Redis, Prisma, graceful shutdown
    ├── config/
    │   └── env.ts            # Zod env validation
    ├── shared/
    │   ├── db.ts             # PrismaClient singleton
    │   ├── logger.ts         # pino logger
    │   └── redis.ts          # Redis client singleton
    ├── api/
    │   ├── routes.ts         # Plugin registering all route groups
    │   ├── servers.ts        # CRUD MCP server connections
    │   ├── tools.ts          # Tool discovery + invocation
    │   ├── permissions.ts    # Agent-tool permission matrix
    │   └── analytics.ts      # Usage stats
    └── mcp/
        ├── manager.ts        # Connection lifecycle, reconnection
        ├── router.ts         # Routes tool calls to correct server
        ├── cache.ts          # Redis-backed result cache
        ├── types.ts          # MCP types
        └── transports/
            ├── stdio.ts
            ├── sse.ts
            └── http.ts
```

## Database Models

### McpServer
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| name | String | Human-readable name |
| slug | String | Unique identifier |
| transport | String | "stdio" / "sse" / "http" |
| config | Json | Transport-specific config |
| status | String | "connected" / "disconnected" / "error" |
| lastPingAt | DateTime? | Last health check |

### McpTool
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| serverId | String | FK to McpServer |
| name | String | Tool name from MCP server |
| description | String? | Tool description |
| inputSchema | Json | JSON Schema for parameters |
| isEnabled | Boolean | Whether tool is active |

### McpToolPermission
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| toolId | String | FK to McpTool |
| agentType | String | Agent type or "*" for all |
| allowed | Boolean | Permission flag |

### McpToolUsage
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| toolId | String | FK to McpTool |
| callerId | String | Agent or user ID |
| callerType | String | "agent" / "skill" / "user" |
| input | Json | Tool call input |
| output | Json? | Tool call output |
| durationMs | Int? | Execution time |
| status | String | "success" / "error" / "timeout" |
| cached | Boolean | Whether result was from cache |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/servers` | List MCP servers |
| POST | `/api/v1/servers` | Register MCP server |
| GET | `/api/v1/servers/:id` | Server details + status |
| PUT | `/api/v1/servers/:id` | Update server config |
| DELETE | `/api/v1/servers/:id` | Remove server |
| POST | `/api/v1/servers/:id/connect` | Connect to server |
| POST | `/api/v1/servers/:id/disconnect` | Disconnect |
| GET | `/api/v1/tools` | List all tools across servers |
| POST | `/api/v1/tools/call` | Invoke a tool |
| GET | `/api/v1/permissions/:agentType` | Get tool permissions |
| PUT | `/api/v1/permissions` | Set permissions |
| GET | `/api/v1/analytics/usage` | Usage stats |

## Environment Variables

```
PORT=3100
DATABASE_URL=postgresql://postgres:wave@postgres:5432/wave
REDIS_URL=redis://redis:6379
CACHE_TTL_SECONDS=300
LOG_LEVEL=info
```
