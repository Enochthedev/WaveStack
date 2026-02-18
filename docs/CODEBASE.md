# 📖 WaveStack Codebase Documentation

> Complete technical walkthrough of every component in the WaveStack creator automation platform.

**Last Updated:** January 2026  
**Total Services:** 26+ microservices  
**Languages:** TypeScript, Python, Go  
**Infrastructure:** Docker Compose, PostgreSQL, Redis, ChromaDB

---

## 📁 Repository Structure

```
WaveStack/
├── apps/                          # Main applications
│   └── core-app/                  # Central API (Node.js/Fastify)
├── services/                      # Microservices (26+ total)
│   ├── ai-personality/            # AI digital clone engine (Python)
│   ├── ai-personality-py/         # Alternative Python implementation
│   ├── analytics-dashboard/       # Analytics service (Python)
│   ├── analytics-dashboard-go/    # High-performance analytics (Go)
│   ├── auto-mod/                  # Auto-moderation service (Python)
│   ├── clipper/                   # Video clipping service (Python/FFmpeg)
│   ├── discord-bot/               # Discord bot (TypeScript)
│   ├── email-marketing/           # Email campaigns (Python)
│   ├── link-router/               # URL shortener & tracking (Go)
│   ├── livestream-analytics/      # Real-time stream analytics (Python)
│   ├── merch-integration/         # Merchandise platform (Python)
│   ├── merch-integration-ts/      # TypeScript implementation
│   ├── ml-training/               # ML model training (Python)
│   ├── ollama-gw/                 # Ollama gateway service
│   ├── seo-optimizer/             # SEO optimization (Python)
│   ├── social-ingest/             # Cross-platform data ingestion (TypeScript)
│   ├── social-publisher/          # Multi-platform publishing (Python)
│   ├── sponsor-manager/           # Sponsorship tracking (Python)
│   ├── sponsor-manager-ts/        # TypeScript implementation
│   ├── streaming-integrations/    # Streamlabs/StreamElements
│   ├── telegram-bot/              # Telegram bot (TypeScript)
│   ├── thumbnail-generator/       # AI thumbnail creation (Python)
│   ├── twitch-bot/                # Twitch chat bot (TypeScript)
│   ├── twitter-autoposter/        # Twitter automation (Python)
│   ├── whatsapp-bot/              # WhatsApp bot (TypeScript)
│   └── youtube-publisher/         # YouTube upload automation (Python)
├── workflows/                     # n8n automation templates
│   └── n8n-templates/             # Pre-built workflow JSONs
├── infra/                         # Infrastructure configs
│   ├── compose.yaml               # Docker Compose for infra
│   ├── Caddyfile                  # Caddy reverse proxy
│   └── nginx.conf                 # Nginx configuration
├── docs/                          # Documentation
├── docker-compose.yml             # Main orchestration file
└── .env.example                   # Environment template
```

---

## 🏗️ Core Application

### `apps/core-app/` — Central API

**Stack:** Node.js, Fastify 5, Prisma ORM, BullMQ  
**Port:** `3000`

The core-app is the central hub that manages content queuing, authentication, and coordinates all other services.

#### Directory Structure
```
apps/core-app/
├── src/
│   ├── server.ts                  # Entry point - Fastify server setup
│   ├── config/                    # Configuration loading
│   ├── modules/                   # Feature modules
│   │   ├── auth/                  # JWT authentication
│   │   │   ├── keys.ts            # RSA keypair management
│   │   │   └── routes.ts          # Token endpoints
│   │   ├── queue/                 # Content queue management
│   │   │   └── routes.ts          # Queue CRUD operations
│   │   ├── publisher/             # Platform publishing
│   │   │   ├── routes.ts          # Publish endpoints
│   │   │   └── worker.ts          # BullMQ worker
│   │   ├── cms/                   # Content management
│   │   ├── analytics/             # Analytics aggregation
│   │   └── trends/                # Trending content
│   ├── routes/                    # Route registration
│   │   └── api.ts                 # Central API router
│   ├── shared/                    # Shared utilities
│   └── __tests__/                 # Vitest test suites
├── prisma/
│   └── schema.prisma              # Database schema
├── package.json
├── Dockerfile
└── vitest.config.ts
```

#### Key Files Explained

**`src/server.ts`** — Application entry point
```typescript
// Initializes Fastify with logging
// Exposes JWKS endpoint for JWT validation
// Registers all API routes under /api prefix
const app = Fastify({ logger: loggerConfig });
app.get("/.well-known/jwks.json", async () => { /* JWKS endpoint */ });
app.register(apiRoutes, { prefix: "/api" });
```

**`src/modules/auth/keys.ts`** — JWT keypair management
- Generates RSA-256 keypairs for JWT signing
- Supports persistent storage via `AUTH_KEYS_DIR`
- Falls back to ephemeral keys in development

**`src/modules/queue/routes.ts`** — Content queue API
- `POST /api/queue` — Create queue item
- `GET /api/queue` — List queue items
- `GET /api/queue/:id` — Get single item
- `DELETE /api/queue/:id` — Remove item
- Validates `X-Org-Id` header for multi-tenancy

#### Database Schema (`prisma/schema.prisma`)

| Model | Purpose |
|-------|---------|
| `QueueItem` | Content scheduled for publishing |
| `Post` | Published content tracking |
| `Asset` | Media files (videos, clips) |
| `Project` | Content organization |
| `Organization` | Multi-tenant support |

---

## 🎬 Media Services

### `services/clipper/` — Video Clipping

**Stack:** Python, FastAPI, FFmpeg, Redis (RQ workers)  
**Port:** `8000`

Handles video/audio clipping with FFmpeg orchestration.

#### Directory Structure
```
services/clipper/
├── app/
│   ├── main.py                    # FastAPI entry point
│   ├── worker.py                  # RQ background worker
│   ├── domain/
│   │   └── models.py              # ClipRequest, ClipResult models
│   ├── application/
│   │   └── use_cases.py           # Create clip business logic
│   ├── core/
│   │   ├── config.py              # Settings management
│   │   └── logging.py             # Structured logging
│   ├── infra/
│   │   ├── ffmpeg.py              # FFmpeg execution layer
│   │   └── storage.py             # File storage handling
│   └── interfaces/
│       └── http/api/v1/
│           └── routes.py          # API endpoints
├── tests/
│   ├── test_models.py             # Domain model tests
│   └── test_use_cases.py          # Use case tests
├── requirements.txt
└── Dockerfile
```

#### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/health` | API health check |
| `POST` | `/api/v1/clip` | Create new clip |
| `GET` | `/api/v1/clip/{id}` | Get clip status |
| `GET` | `/api/docs` | Swagger documentation |

#### Clip Request Model
```python
class ClipRequest:
    source: str          # Video URL or file path
    start_sec: float     # Start timestamp
    duration_sec: float  # Clip duration (max 3600)
    out_ext: str         # Output format: mp4, mov, webm, mkv
```

---

### `services/thumbnail-generator/` — AI Thumbnails

**Stack:** Python, FastAPI, Pillow, Stable Diffusion/DALL-E  
**Port:** `8400`

Generates thumbnails using AI image generation or template-based composition.

#### Directory Structure
```
services/thumbnail-generator/
├── src/
│   ├── main.py                    # FastAPI entry
│   ├── generator.py               # Image generation logic
│   ├── templates.py               # Template compositions
│   ├── providers/
│   │   ├── openai.py              # DALL-E integration
│   │   ├── stability.py           # Stable Diffusion API
│   │   └── local.py               # Local SD model
│   └── utils/
│       └── image_utils.py         # Image manipulation
├── requirements.txt
└── Dockerfile
```

---

## 🤖 Bot Services

### `services/discord-bot/` — Discord Bot

**Stack:** TypeScript, Discord.js v14, Redis  
**No exposed port** (connects via Discord Gateway)

Full-featured Discord bot with slash commands, economy, games, and stream alerts.

#### Directory Structure
```
services/discord-bot/
├── src/
│   ├── index.ts                   # Bot entry point
│   ├── deploy-commands.ts         # Slash command deployer
│   ├── commands/                  # Slash commands (14 total)
│   │   ├── clip.ts                # Create stream clips
│   │   ├── trivia.ts              # Trivia game
│   │   ├── giveaway.ts            # Giveaway system
│   │   ├── points.ts              # Check user points
│   │   ├── daily.ts               # Daily rewards
│   │   ├── leaderboard.ts         # Rankings display
│   │   ├── poll.ts                # Create polls
│   │   ├── 8ball.ts               # Magic 8-ball
│   │   ├── coinflip.ts            # Coin flip game
│   │   ├── roll.ts                # Dice rolling
│   │   ├── rps.ts                 # Rock-paper-scissors
│   │   ├── scramble.ts            # Word scramble game
│   │   ├── math.ts                # Math challenges
│   │   └── reminder.ts            # Set reminders
│   ├── events/
│   │   ├── messageCreate.ts       # Message handler
│   │   └── guildMemberAdd.ts      # Welcome messages
│   └── services/
│       ├── stream-monitor.ts      # Twitch/YouTube monitoring
│       ├── economy.ts             # Points & levels system
│       ├── moderation.ts          # Auto-mod service
│       └── clip-service.ts        # Clipper integration
├── package.json
├── Dockerfile
└── .env.example
```

#### Main Entry (`src/index.ts`)
```typescript
// Initializes Discord client with intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // ... more intents
  ],
});

// Loads commands dynamically from /commands folder
// Initializes services: StreamMonitor, EconomyService, ModerationService
// Handles slash command execution via InteractionCreate event
```

#### Available Commands
| Command | Description |
|---------|-------------|
| `/clip [duration] [offset]` | Create stream clip |
| `/trivia [category]` | Play trivia game |
| `/giveaway <prize> <duration>` | Start giveaway |
| `/points [user]` | Check points |
| `/daily` | Claim daily reward |
| `/leaderboard [type]` | View rankings |
| `/poll <question>` | Create a poll |
| `/8ball <question>` | Ask the magic 8-ball |
| `/coinflip` | Flip a coin |
| `/roll [sides]` | Roll dice |
| `/rps <choice>` | Play rock-paper-scissors |
| `/scramble` | Word unscrambling game |
| `/math` | Math challenge |
| `/reminder <time> <message>` | Set reminder |

---

### `services/twitch-bot/` — Twitch Chat Bot

**Stack:** TypeScript, tmi.js, OBS WebSocket  
**No exposed port** (connects via Twitch IRC)

Twitch chat bot with moderation, clip creation, and OBS control.

#### Directory Structure
```
services/twitch-bot/
├── src/
│   ├── index.ts                   # Bot entry point
│   ├── commands/                  # Chat commands (15 total)
│   │   ├── handler.ts             # Command router
│   │   ├── clip.ts                # !clip command
│   │   ├── points.ts              # !points command
│   │   ├── leaderboard.ts         # !leaderboard
│   │   ├── title.ts               # !settitle (mod)
│   │   ├── game.ts                # !setgame (mod)
│   │   ├── shoutout.ts            # !so (mod)
│   │   ├── poll.ts                # !poll (mod)
│   │   ├── raid.ts                # !raid (broadcaster)
│   │   ├── obs.ts                 # !scene, !startstream
│   │   ├── 8ball.ts               # !8ball
│   │   ├── coinflip.ts            # !coinflip
│   │   ├── dice.ts                # !dice
│   │   ├── rps.ts                 # !rps
│   │   └── trivia.ts              # !trivia
│   └── services/
│       ├── clip-service.ts        # Clipper API integration
│       ├── obs-service.ts         # OBS WebSocket control
│       ├── moderation.ts          # Chat moderation
│       └── auto-clip-detector.ts  # Keyword-based auto-clip
├── package.json
├── Dockerfile
└── .env.example
```

#### Event Handlers (`src/index.ts`)
```typescript
// Handles various Twitch events:
client.on('message', ...)        // Chat messages
client.on('subscription', ...)   // New subs
client.on('raided', ...)         // Incoming raids
client.on('cheer', ...)          // Bits/cheers
client.on('submysterygift', ...)  // Gift subs
client.on('hosted', ...)         // Hosts
```

#### Chat Commands
| Command | Permission | Description |
|---------|------------|-------------|
| `!clip [duration]` | Everyone | Create clip |
| `!points [user]` | Everyone | Check points |
| `!leaderboard` | Everyone | Top chatters |
| `!settitle <title>` | Mod | Change stream title |
| `!setgame <game>` | Mod | Change category |
| `!so <user>` | Mod | Shoutout streamer |
| `!poll <question>` | Mod | Create poll |
| `!scene <name>` | Mod | Switch OBS scene |
| `!raid <channel>` | Broadcaster | Start raid |

---

### `services/telegram-bot/` — Telegram Bot

**Stack:** TypeScript/Python, Telegram Bot API  
**No exposed port**

#### Directory Structure
```
services/telegram-bot/
├── src/
│   ├── index.ts                   # Bot entry point
│   ├── commands/                  # Bot commands
│   ├── handlers/                  # Message handlers
│   └── services/                  # AI integration
├── package.json
└── .env.example
```

---

### `services/whatsapp-bot/` — WhatsApp Bot

**Stack:** TypeScript, whatsapp-web.js  
**No exposed port**

#### Directory Structure
```
services/whatsapp-bot/
├── src/
│   ├── index.ts                   # Bot entry point
│   ├── handlers/                  # Message handlers
│   └── services/                  # AI responses
├── package.json
└── Dockerfile
```

---

## 🧠 AI Services

### `services/ai-personality/` — AI Digital Clone

**Stack:** Python, FastAPI, Prisma, ChromaDB, OpenAI/Anthropic/Ollama  
**Port:** `8200`

Creates a digital clone that learns from the creator and responds in their voice.

#### Directory Structure
```
services/ai-personality/
├── src/
│   ├── main.py                    # FastAPI entry
│   ├── config.py                  # Settings & providers
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # API endpoints
│   └── engine/
│       ├── personality.py         # Core personality engine
│       ├── memory.py              # Memory management
│       ├── content_generator.py   # Content generation
│       └── learning_pipeline.py   # Continuous learning
├── prisma/
│   └── schema.prisma              # Personality data models
├── requirements.txt
└── Dockerfile
```

#### Key Components

**`engine/personality.py`** — Core Engine
- Manages personality traits and voice
- Handles context-aware response generation
- Integrates with multiple AI providers

**`engine/memory.py`** — Memory Manager
```python
# Features:
# - Short-term memory (recent interactions)
# - Long-term memory (ChromaDB vector store)
# - Context retrieval for responses
# - Memory consolidation and cleanup
```

**`engine/content_generator.py`** — Content Creation
- Generates tweets, posts, captions
- Maintains creator's voice and style
- Applies sentiment and controversy filters

**`engine/learning_pipeline.py`** — Continuous Learning
- Ingests creator's content samples
- Updates personality embeddings
- Refines response patterns

#### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/chat` | Chat with AI clone |
| `POST` | `/api/v1/generate` | Generate content |
| `POST` | `/api/v1/learn` | Train on new data |
| `GET` | `/api/v1/memory` | Retrieve memories |

---

### `services/auto-mod/` — Auto-Moderation

**Stack:** Python, FastAPI  
**Port:** `8700`

AI-powered content moderation for chat and comments.

#### Directory Structure
```
services/auto-mod/
├── src/
│   ├── main.py                    # FastAPI entry
│   ├── moderator.py               # Moderation logic
│   ├── filters/
│   │   ├── toxicity.py            # Toxicity detection
│   │   ├── spam.py                # Spam detection
│   │   └── nsfw.py                # NSFW detection
│   └── actions/
│       └── enforcement.py         # Delete/timeout/ban
├── requirements.txt
└── Dockerfile
```

#### Configuration
```yaml
TOXICITY_THRESHOLD: 0.7    # Toxicity score threshold
SPAM_THRESHOLD: 0.6        # Spam score threshold
AUTO_DELETE: true          # Auto-delete violations
AUTO_TIMEOUT: false        # Auto-timeout users
AUTO_BAN: false            # Auto-ban repeat offenders
VIOLATIONS_FOR_BAN: 5      # Violations before ban
```

---

### `services/ml-training/` — ML Model Training

**Stack:** Python, FastAPI, HuggingFace Transformers  
**Port:** `8300`

Fine-tunes language models on creator content.

#### Directory Structure
```
services/ml-training/
├── src/
│   ├── main.py                    # FastAPI entry
│   ├── trainer.py                 # Training orchestration
│   ├── data_processor.py          # Data preparation
│   ├── models/
│   │   ├── lora.py                # LoRA fine-tuning
│   │   └── qlora.py               # QLoRA for smaller GPUs
│   └── utils/
│       └── tokenizer.py           # Tokenization helpers
├── requirements.txt
└── Dockerfile
```

---

## 📊 Analytics Services

### `services/analytics-dashboard-go/` — High-Performance Analytics

**Stack:** Go, Fiber, Redis  
**Port:** `8800`

High-performance analytics aggregation (10-50x faster than Python).

#### Features
- Real-time metric aggregation
- Historical data queries
- Caching layer with Redis
- Concurrent data processing

---

### `services/livestream-analytics/` — Stream Analytics

**Stack:** Go/Python, Redis  
**Port:** `9500`

Real-time stream analytics for Twitch and YouTube.

#### Features
- Viewer count tracking
- Chat activity metrics
- Peak viewer detection
- Stream duration tracking

---

### `services/social-ingest/` — Cross-Platform Data

**Stack:** TypeScript, Fastify, Prisma  
**Port:** `8100`

Normalizes data from Discord, Twitch, YouTube, and Twitter/X.

#### Directory Structure
```
services/social-ingest/
├── src/
│   ├── index.ts                   # Fastify entry
│   ├── api/
│   │   └── routes.ts              # API endpoints
│   └── ingestion/
│       ├── discord.ts             # Discord adapter
│       ├── twitch.ts              # Twitch IRC adapter
│       └── youtube.ts             # YouTube chat adapter
├── prisma/
│   └── schema.prisma              # Message models
├── package.json
└── Dockerfile
```

#### Normalized Message Schema
```typescript
interface MessageEvent {
  id: string;
  platform: 'discord' | 'twitch' | 'youtube' | 'twitter';
  channel: { id: string; name?: string };
  author: { id: string; name: string; role?: string; isMod?: boolean };
  text: string;
  ts: string;
  meta?: Record<string, any>;
}
```

#### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/messages` | Get messages (filtered) |
| `GET` | `/api/v1/events` | Get platform events |
| `GET` | `/api/v1/analytics/user/:id` | User analytics |
| `GET` | `/api/v1/analytics/channel/:id` | Channel analytics |
| `GET` | `/api/v1/search?q=` | Full-text search |
| `GET` | `/api/v1/leaderboard` | Cross-platform rankings |

---

## 📤 Publishing Services

### `services/youtube-publisher/` — YouTube Automation

**Stack:** Python, FastAPI, Google API  
**Port:** `8500`

Automated YouTube video uploads with AI-generated metadata.

#### Directory Structure
```
services/youtube-publisher/
├── src/
│   ├── main.py                    # FastAPI entry
│   ├── uploader.py                # Upload orchestration
│   ├── metadata.py                # Title/description generation
│   ├── auth/
│   │   └── oauth.py               # Google OAuth handling
│   └── integrations/
│       ├── thumbnail.py           # Thumbnail service client
│       └── ai_personality.py      # AI metadata generation
├── requirements.txt
└── Dockerfile
```

#### Features
- OAuth 2.0 authentication flow
- Resumable uploads for large files
- AI-generated titles and descriptions
- Auto-generated thumbnails
- Scheduled publishing

---

### `services/social-publisher/` — Multi-Platform Publishing

**Stack:** Python, FastAPI  
**Port:** `8600`

Publishes content to Instagram, TikTok, Facebook, LinkedIn.

#### Directory Structure
```
services/social-publisher/
├── src/
│   ├── main.py                    # FastAPI entry
│   ├── publisher.py               # Publishing orchestration
│   ├── platforms/
│   │   ├── instagram.py           # Instagram posting
│   │   ├── tiktok.py              # TikTok posting
│   │   ├── facebook.py            # Facebook posting
│   │   └── linkedin.py            # LinkedIn posting
│   └── captions/
│       └── generator.py           # AI caption generation
├── requirements.txt
└── Dockerfile
```

---

### `services/twitter-autoposter/` — Twitter Automation

**Stack:** Python, Tweepy  
**No exposed port** (runs as background service)

Automated tweet generation and posting.

#### Features
- AI-generated tweet content
- Scheduled posting
- Thread creation
- Media attachment support

---

## 🛠️ Utility Services

### `services/seo-optimizer/` — SEO Optimization

**Stack:** Python, FastAPI  
**Port:** `9300`

AI-powered SEO for video titles, descriptions, and tags.

---

### `services/sponsor-manager-ts/` — Sponsorship Tracking

**Stack:** TypeScript, Fastify, Stripe  
**Port:** `8900`

Manages sponsor relationships and payments.

---

### `services/merch-integration-ts/` — Merchandise

**Stack:** TypeScript, Fastify  
**Port:** `9800`

Integrates with Printful, Teespring, Shopify.

---

### `services/email-marketing/` — Email Campaigns

**Stack:** Python, FastAPI, SendGrid/Mailchimp  
**Port:** `9200`

Email list management and campaign automation.

---

## 🔌 Streaming Integrations

### `services/streaming-integrations/`

Contains integrations for streaming platforms:

#### Streamlabs Integration (`streamlabs.ts`)
- WebSocket connection for real-time alerts
- Donation tracking
- Follow notifications
- Sub events

#### StreamElements Integration (`streamelements.ts`)
- JWT authentication
- Tip/donation alerts
- Merch purchase notifications
- Leaderboard API

---

## ⚙️ Workflow Automation

### `workflows/n8n-templates/`

Pre-built n8n workflow templates:

| Template | Description |
|----------|-------------|
| `ai-content-generator-pipeline.json` | AI-powered content creation |
| `auto-moderation-integration.json` | Auto-mod workflow |
| `clip-to-social-pipeline.json` | Clip → publish flow |
| `content-repurposing-pipeline.json` | Cross-platform repurposing |
| `multi-platform-scheduler.json` | Scheduled publishing |
| `stream-to-highlights-pipeline.json` | Stream highlight extraction |

---

## 🐳 Docker Compose Services

The main `docker-compose.yml` orchestrates all services:

### Infrastructure
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:15-alpine | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | Caching & queues |
| `chromadb` | chromadb/chroma | 8000 | Vector embeddings |
| `ollama` | ollama/ollama | 11434 | Local LLM inference |

### Applications
| Service | Language | Port | Purpose |
|---------|----------|------|---------|
| `core-app` | TypeScript | 3000 | Central API |
| `clipper` | Python | 8000 | Video clipping |
| `ai-personality` | Python | 8200 | AI engine |
| `ml-training` | Python | 8300 | Model training |
| `thumbnail-generator` | Python | 8400 | Thumbnail creation |
| `youtube-publisher` | Python | 8500 | YouTube uploads |
| `social-publisher` | Python | 8600 | Social posting |
| `auto-mod` | Python | 8700 | Moderation |
| `analytics-dashboard` | Go | 8800 | Analytics |
| `sponsor-manager` | TypeScript | 8900 | Sponsorships |
| `social-ingest` | TypeScript | 8100 | Data ingestion |
| `email-marketing` | Python | 9200 | Email campaigns |
| `seo-optimizer` | Python | 9300 | SEO |
| `livestream-analytics` | Go | 9500 | Stream analytics |
| `merch-integration` | TypeScript | 9800 | Merchandise |
| `n8n` | Node.js | 5678 | Workflows |

### Bots (No exposed ports)
| Service | Language | Purpose |
|---------|----------|---------|
| `discord-bot` | TypeScript | Discord community |
| `twitch-bot` | TypeScript | Twitch chat |
| `telegram-bot` | Python | Telegram messaging |
| `whatsapp-bot` | TypeScript | WhatsApp messaging |
| `twitter-autoposter` | Python | Twitter automation |

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Discord Bot  │  Twitch Bot  │  Telegram  │  WhatsApp  │  APIs  │
└───────┬───────┴──────┬───────┴─────┬──────┴─────┬──────┴───┬────┘
        │              │             │            │          │
        ▼              ▼             ▼            ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SOCIAL INGEST                               │
│              Normalizes messages across platforms                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CORE APP                                 │
│           Central API: Auth, Queue, Projects, Assets             │
└──────┬────────────────────┬────────────────────┬────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐   ┌────────────────┐   ┌────────────────┐
│   Clipper    │   │ AI Personality │   │   Analytics    │
│ FFmpeg clips │   │ Digital clone  │   │   Dashboard    │
└──────┬───────┘   └───────┬────────┘   └────────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PUBLISHING LAYER                            │
├────────────┬────────────┬────────────┬──────────────────────────┤
│  YouTube   │  Social    │  Twitter   │  Other Platforms          │
│  Publisher │  Publisher │  Autoposter│                           │
└────────────┴────────────┴────────────┴──────────────────────────┘
```

---

## 🔐 Authentication Flow

```
1. Client authenticates → Core App (/api/auth/token)
2. Core App generates JWT (RS256) with org_id, scopes
3. Client includes JWT in Authorization header
4. Gateway validates JWT via JWKS (/.well-known/jwks.json)
5. Gateway extracts claims → X-User-Id, X-Org-Id headers
6. Internal services trust gateway headers
```

---

## 🧪 Testing

### Core App (Vitest)
```bash
cd apps/core-app
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

### Clipper (Pytest)
```bash
cd services/clipper
pytest -v              # Verbose output
pytest --cov=app       # With coverage
```

---

## 🚀 Running the Stack

### Full Stack (Development)
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f core-app clipper ai-personality
```

### Individual Services
```bash
# Just database layer
docker-compose up -d postgres redis

# Core services
docker-compose up -d postgres redis core-app clipper

# With AI
docker-compose up -d postgres redis chromadb ollama ai-personality

# With bots
docker-compose up -d discord-bot twitch-bot
```

---

## 📚 Additional Resources

- **[QUICKSTART.md](./QUICKSTART.md)** — Get running in 5 minutes
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design details
- **[BOT-INTEGRATION.md](./BOT-INTEGRATION.md)** — Bot setup guide
- **[LOCAL-SETUP.md](./LOCAL-SETUP.md)** — Development environment
- **[PROD-DEPLOY.md](./PROD-DEPLOY.md)** — Production deployment

---

**WaveStack** — The complete creator automation platform 🌊
