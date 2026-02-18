# 🔌 WaveStack API Reference

> Complete API documentation for all WaveStack services.

---

## Table of Contents

1. [Core App API](#core-app-api)
2. [Clipper API](#clipper-api)
3. [AI Personality API](#ai-personality-api)
4. [Social Ingest API](#social-ingest-api)
5. [Auto-Mod API](#auto-mod-api)
6. [Thumbnail Generator API](#thumbnail-generator-api)
7. [YouTube Publisher API](#youtube-publisher-api)
8. [Social Publisher API](#social-publisher-api)
9. [Analytics Dashboard API](#analytics-dashboard-api)

---

## Core App API

**Base URL:** `http://localhost:3000`

### Authentication

#### Get Token
```http
POST /api/auth/token
Content-Type: application/json

{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "org_id": "org_123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### JWKS Endpoint
```http
GET /.well-known/jwks.json
```

**Response:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "wavestack-1",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

---

### Queue Management

All queue endpoints require:
- `Authorization: Bearer <token>`
- `X-Org-Id: <org_id>`

#### List Queue Items
```http
GET /api/queue
X-Org-Id: org_123
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: queued, processing, published, failed |
| `projectId` | string | Filter by project |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "items": [
    {
      "id": "clx1234...",
      "orgId": "org_123",
      "projectId": "proj_456",
      "assetId": "asset_789",
      "title": "My Video Title",
      "caption": "Video description...",
      "hashtags": ["gaming", "stream"],
      "platforms": ["youtube", "instagram"],
      "scheduleAt": "2026-01-20T12:00:00Z",
      "status": "queued",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### Create Queue Item
```http
POST /api/queue
X-Org-Id: org_123
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "proj_456",
  "assetId": "asset_789",
  "title": "My Video Title",
  "caption": "Video description...",
  "hashtags": ["gaming", "stream"],
  "platforms": ["youtube", "instagram"],
  "scheduleAt": "2026-01-20T12:00:00Z",
  "idempotencyKey": "unique-key-12345"
}
```

**Validation Rules:**
- `title`: Required, max 120 characters
- `platforms`: Required, array of valid platforms
- `idempotencyKey`: Required, unique per organization

**Response:**
```json
{
  "id": "clx1234...",
  "status": "queued",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

#### Get Queue Item
```http
GET /api/queue/:id
X-Org-Id: org_123
Authorization: Bearer <token>
```

#### Delete Queue Item
```http
DELETE /api/queue/:id
X-Org-Id: org_123
Authorization: Bearer <token>
```

---

### Projects

#### List Projects
```http
GET /api/projects
X-Org-Id: org_123
Authorization: Bearer <token>
```

#### Create Project
```http
POST /api/projects
X-Org-Id: org_123
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description"
}
```

---

### Assets

#### List Assets
```http
GET /api/assets
X-Org-Id: org_123
Authorization: Bearer <token>
```

#### Get Asset
```http
GET /api/assets/:id
X-Org-Id: org_123
Authorization: Bearer <token>
```

---

## Clipper API

**Base URL:** `http://localhost:8000`

### Health Check
```http
GET /health
```
```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "ok"
}
```

### Create Clip

```http
POST /api/v1/clip
Content-Type: application/json

{
  "source": "https://example.com/video.mp4",
  "start_sec": 30.5,
  "duration_sec": 15,
  "out_ext": "mp4"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | Video URL or file path |
| `start_sec` | float | Yes | Start timestamp (seconds) |
| `duration_sec` | float | Yes | Clip duration (1-3600 seconds) |
| `out_ext` | string | No | Output format: mp4, mov, webm, mkv (default: mp4) |

**Response:**
```json
{
  "job_id": "abc123...",
  "status": "queued",
  "message": "Clip job created"
}
```

### Get Clip Status

```http
GET /api/v1/clip/:job_id
```

**Response (Processing):**
```json
{
  "job_id": "abc123...",
  "status": "processing",
  "progress": 45
}
```

**Response (Complete):**
```json
{
  "job_id": "abc123...",
  "status": "complete",
  "result": {
    "url": "http://localhost:8000/files/abc123.mp4",
    "duration": 15.0,
    "size_bytes": 5242880,
    "created_at": "2026-01-15T10:05:00Z"
  }
}
```

### API Documentation

```http
GET /api/docs      # Swagger UI
GET /api/redoc     # ReDoc
GET /api/openapi.json  # OpenAPI spec
```

---

## AI Personality API

**Base URL:** `http://localhost:8200`

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "ai-personality",
  "version": "1.0.0"
}
```

### Chat with AI Clone

```http
POST /api/v1/chat
Content-Type: application/json

{
  "user_id": "user_123",
  "message": "Hey, what's up?",
  "context": {
    "platform": "discord",
    "channel": "general"
  }
}
```

**Response:**
```json
{
  "response": "Not much, just vibing! What's going on with you?",
  "confidence": 0.92,
  "personality_score": 0.87,
  "memory_used": true
}
```

### Generate Content

```http
POST /api/v1/generate
Content-Type: application/json

{
  "content_type": "tweet",
  "topic": "streaming highlight",
  "context": {
    "game": "Valorant",
    "moment": "clutch 1v4"
  },
  "options": {
    "include_hashtags": true,
    "max_length": 280
  }
}
```

**Content Types:**
- `tweet` — Twitter post
- `caption` — Instagram/TikTok caption
- `description` — YouTube description
- `title` — Video title
- `reply` — Chat reply

**Response:**
```json
{
  "content": "That 1v4 clutch hit different 🎯 Sometimes you just gotta trust the aim and send it! #Valorant #Clutch #Gaming",
  "alternatives": [
    "When the team needs you most... 1v4 and didn't even flinch 😤",
    "They thought it was over... I thought otherwise 🔥"
  ],
  "metadata": {
    "sentiment": "positive",
    "energy": "high",
    "controversy_score": 0.1
  }
}
```

### Train on New Data

```http
POST /api/v1/learn
Content-Type: application/json

{
  "data_type": "chat_history",
  "content": [
    {"role": "user", "message": "Example interaction"},
    {"role": "creator", "message": "Example response"}
  ],
  "source": "discord",
  "weight": 1.0
}
```

**Response:**
```json
{
  "status": "accepted",
  "samples_processed": 2,
  "next_training": "2026-01-15T12:00:00Z"
}
```

### Retrieve Memories

```http
GET /api/v1/memory?user_id=user_123&limit=10
```

**Response:**
```json
{
  "memories": [
    {
      "id": "mem_123",
      "content": "User mentioned they're from Canada",
      "category": "personal_info",
      "created_at": "2026-01-10T08:00:00Z",
      "relevance_score": 0.95
    }
  ]
}
```

---

## Social Ingest API

**Base URL:** `http://localhost:8100`

### Health Check
```http
GET /health
```

### Get Messages

```http
GET /api/v1/messages?platform=discord&limit=50
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | string | discord, twitch, youtube, twitter |
| `channel_id` | string | Filter by channel |
| `user_id` | string | Filter by user |
| `since` | ISO date | Messages after this time |
| `until` | ISO date | Messages before this time |
| `limit` | number | Results per page (max 100) |

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "platform": "discord",
      "channel": {
        "id": "123456789",
        "name": "general"
      },
      "author": {
        "id": "987654321",
        "name": "CoolUser",
        "role": "member",
        "isMod": false
      },
      "text": "This stream is awesome!",
      "ts": "2026-01-15T10:30:00Z",
      "meta": {
        "hasEmotes": true,
        "mentionsCreator": false
      }
    }
  ],
  "total": 1234,
  "hasMore": true
}
```

### Get Platform Events

```http
GET /api/v1/events?platform=twitch&type=subscription
```

**Event Types:**
- `subscription` — New sub
- `raid` — Incoming raid
- `cheer` — Bits/donations
- `follow` — New follower
- `stream_start` — Stream went live
- `stream_end` — Stream ended

**Response:**
```json
{
  "events": [
    {
      "id": "evt_123",
      "platform": "twitch",
      "type": "subscription",
      "data": {
        "user": "CoolViewer",
        "tier": "tier1",
        "months": 3
      },
      "ts": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### User Analytics

```http
GET /api/v1/analytics/user/:userId
```

**Response:**
```json
{
  "user_id": "user_123",
  "platforms": {
    "discord": {
      "message_count": 542,
      "first_seen": "2025-06-01T00:00:00Z",
      "last_active": "2026-01-15T10:00:00Z",
      "engagement_score": 87
    },
    "twitch": {
      "message_count": 156,
      "first_seen": "2025-08-15T00:00:00Z",
      "last_active": "2026-01-14T22:00:00Z",
      "engagement_score": 72
    }
  },
  "total_messages": 698,
  "activity_pattern": {
    "peak_hour": 20,
    "peak_day": "Saturday",
    "avg_messages_per_day": 12.5
  }
}
```

### Channel Analytics

```http
GET /api/v1/analytics/channel/:channelId
```

### Search Messages

```http
GET /api/v1/search?q=awesome&platform=discord
```

**Response:**
```json
{
  "results": [
    {
      "id": "msg_123",
      "text": "This stream is awesome!",
      "author": "CoolUser",
      "platform": "discord",
      "ts": "2026-01-15T10:30:00Z",
      "relevance": 0.95
    }
  ],
  "total": 23
}
```

### Leaderboard

```http
GET /api/v1/leaderboard?platform=discord&metric=messages&limit=10
```

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "user_123",
      "username": "TopChatter",
      "value": 5420,
      "metric": "messages"
    }
  ]
}
```

---

## Auto-Mod API

**Base URL:** `http://localhost:8700`

### Health Check
```http
GET /health
```

### Check Content

```http
POST /api/v1/check
Content-Type: application/json

{
  "content": "Message to check",
  "user_id": "user_123",
  "platform": "discord",
  "channel_id": "channel_456"
}
```

**Response:**
```json
{
  "allowed": true,
  "scores": {
    "toxicity": 0.12,
    "spam": 0.05,
    "nsfw": 0.02
  },
  "flags": [],
  "action": null
}
```

**Response (Violation):**
```json
{
  "allowed": false,
  "scores": {
    "toxicity": 0.85,
    "spam": 0.10,
    "nsfw": 0.05
  },
  "flags": ["toxicity"],
  "action": "delete",
  "reason": "Toxicity threshold exceeded"
}
```

### Get User Violations

```http
GET /api/v1/violations/:userId
```

**Response:**
```json
{
  "user_id": "user_123",
  "violations": [
    {
      "id": "vio_123",
      "type": "toxicity",
      "content": "[REDACTED]",
      "action_taken": "delete",
      "ts": "2026-01-14T15:30:00Z"
    }
  ],
  "total_violations": 3,
  "status": "warning"
}
```

---

## Thumbnail Generator API

**Base URL:** `http://localhost:8400`

### Health Check
```http
GET /health
```

### Generate Thumbnail

```http
POST /api/v1/generate
Content-Type: application/json

{
  "title": "Epic Gaming Moments",
  "style": "gaming",
  "options": {
    "include_face": true,
    "face_expression": "excited",
    "background": "gradient",
    "colors": ["#ff0000", "#0000ff"]
  }
}
```

**Styles:**
- `gaming` — Gaming thumbnails
- `vlog` — Vlog style
- `tutorial` — How-to style
- `reaction` — Reaction video
- `custom` — Custom template

**Response:**
```json
{
  "thumbnail_id": "thumb_123",
  "url": "http://localhost:8400/thumbnails/thumb_123.png",
  "dimensions": {
    "width": 1280,
    "height": 720
  },
  "generated_at": "2026-01-15T10:00:00Z"
}
```

### Generate from Video Frame

```http
POST /api/v1/generate/from-frame
Content-Type: application/json

{
  "video_url": "http://example.com/video.mp4",
  "timestamp": 45.5,
  "style": "gaming",
  "overlays": {
    "title": "INSANE CLUTCH",
    "subtitle": "You won't believe this!"
  }
}
```

---

## YouTube Publisher API

**Base URL:** `http://localhost:8500`

### Health Check
```http
GET /health
```

### OAuth Flow

```http
GET /api/v1/auth/url
```

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/...",
  "state": "random-state-token"
}
```

```http
POST /api/v1/auth/callback
Content-Type: application/json

{
  "code": "authorization-code",
  "state": "random-state-token"
}
```

### Upload Video

```http
POST /api/v1/upload
Content-Type: application/json

{
  "video_url": "http://example.com/video.mp4",
  "title": "My Awesome Video",
  "description": "Video description...",
  "tags": ["gaming", "highlights"],
  "privacy": "public",
  "scheduled_at": "2026-01-20T12:00:00Z",
  "options": {
    "generate_thumbnail": true,
    "ai_description": true,
    "ai_tags": true
  }
}
```

**Privacy Options:**
- `public` — Everyone can see
- `unlisted` — Only with link
- `private` — Only you

**Response:**
```json
{
  "upload_id": "up_123",
  "status": "processing",
  "progress": 0,
  "estimated_time": 120
}
```

### Get Upload Status

```http
GET /api/v1/upload/:upload_id
```

**Response:**
```json
{
  "upload_id": "up_123",
  "status": "complete",
  "youtube_id": "dQw4w9WgXcQ",
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "published_at": "2026-01-15T10:30:00Z"
}
```

---

## Social Publisher API

**Base URL:** `http://localhost:8600`

### Health Check
```http
GET /health
```

### Publish to Platform

```http
POST /api/v1/publish
Content-Type: application/json

{
  "platform": "instagram",
  "content_type": "reel",
  "media_url": "http://example.com/video.mp4",
  "caption": "Check out this highlight! 🔥",
  "options": {
    "ai_caption": true,
    "ai_hashtags": true,
    "generate_cover": true
  }
}
```

**Platforms:**
- `instagram` — Reels, posts, stories
- `tiktok` — TikTok videos
- `facebook` — Posts, reels
- `linkedin` — Posts

**Response:**
```json
{
  "publish_id": "pub_123",
  "status": "processing",
  "platform": "instagram"
}
```

### Get Publish Status

```http
GET /api/v1/publish/:publish_id
```

---

## Analytics Dashboard API

**Base URL:** `http://localhost:8800`

### Health Check
```http
GET /health
```

### Get Overview

```http
GET /api/v1/overview?period=7d
```

**Periods:** `24h`, `7d`, `30d`, `90d`

**Response:**
```json
{
  "period": "7d",
  "metrics": {
    "total_views": 125000,
    "total_engagement": 8500,
    "new_followers": 342,
    "watch_time_hours": 4200,
    "top_platform": "youtube"
  },
  "growth": {
    "views": 15.2,
    "engagement": 8.7,
    "followers": 12.1
  }
}
```

### Platform Metrics

```http
GET /api/v1/metrics/:platform?period=7d
```

### Content Performance

```http
GET /api/v1/content?sort=views&limit=10
```

**Response:**
```json
{
  "content": [
    {
      "id": "content_123",
      "title": "Epic Gaming Montage",
      "platform": "youtube",
      "views": 45000,
      "engagement_rate": 8.5,
      "published_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

---

## Error Responses

All APIs return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": {
      "field": "title",
      "constraint": "required"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Service | Limit | Window |
|---------|-------|--------|
| Core App | 100 req | 1 min |
| Clipper | 10 req | 1 min |
| AI Personality | 60 req | 1 min |
| Social Ingest | 200 req | 1 min |
| Publishers | 30 req | 1 min |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## WebSocket Endpoints

### Social Ingest — Real-time Messages

```
ws://localhost:8100/api/v1/stream/messages
```

**Subscribe:**
```json
{
  "action": "subscribe",
  "platforms": ["discord", "twitch"],
  "channels": ["channel_123"]
}
```

**Message Event:**
```json
{
  "type": "message",
  "data": {
    "id": "msg_123",
    "platform": "discord",
    "author": "CoolUser",
    "text": "Hello!",
    "ts": "2026-01-15T10:00:00Z"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { WaveStackClient } from '@wavestack/sdk';

const client = new WaveStackClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key',
  orgId: 'org_123'
});

// Create queue item
const item = await client.queue.create({
  projectId: 'proj_456',
  assetId: 'asset_789',
  title: 'My Video',
  platforms: ['youtube', 'instagram']
});

// Create clip
const clip = await client.clipper.create({
  source: 'https://example.com/video.mp4',
  startSec: 30,
  durationSec: 15
});

// Chat with AI
const response = await client.ai.chat({
  message: 'Hey, what should I stream today?'
});
```

### Python

```python
from wavestack import WaveStackClient

client = WaveStackClient(
    base_url='http://localhost:3000',
    api_key='your-api-key',
    org_id='org_123'
)

# Create queue item
item = client.queue.create(
    project_id='proj_456',
    asset_id='asset_789',
    title='My Video',
    platforms=['youtube', 'instagram']
)

# Create clip
clip = client.clipper.create(
    source='https://example.com/video.mp4',
    start_sec=30,
    duration_sec=15
)
```

---

**WaveStack API Reference** — Complete API documentation 📚
