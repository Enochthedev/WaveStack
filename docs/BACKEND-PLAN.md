# WaveStack — Complete Backend Build Plan

> Working document. Every module, every endpoint, every database model, every external dependency, and things not to forget.

---

## Table of contents

1. [How everything connects](#1-how-everything-connects)
2. [Core App — every module](#2-core-app--every-module)
3. [Publishing pipeline](#3-publishing-pipeline)
4. [AI / ML layer](#4-ai--ml-layer)
5. [Analytics layer](#5-analytics-layer)
6. [Bot layer](#6-bot-layer)
7. [Business layer](#7-business-layer)
8. [Infrastructure layer](#8-infrastructure-layer)
9. [Complete database schema](#9-complete-database-schema)
10. [External services](#10-external-services)
11. [Deployment & compute](#11-deployment--compute)
12. [Things not to forget](#12-things-not-to-forget)

---

## 1. How everything connects

```
 Browser / Desktop / Mobile
         │
         ▼
   [Next.js frontend]
         │  REST / SSE
         ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    core-app  :3000                          │
  │  Auth · Users · Orgs · Projects · Assets · Queue · Billing  │
  │  Webhooks · Notifications · Search · Storage · OAuth flows  │
  └────────────┬────────────────────────────────────────────────┘
               │  HTTP / BullMQ jobs / Redis Streams
    ┌──────────┼────────────────────────────────────────────────────────┐
    │          │                                                        │
    ▼          ▼                   ▼                      ▼             ▼
[Clipper]  [Uploader]      [Agent Orchestrator]    [Publishers]   [Bots]
[:8000]    [:8050]             [:3300]             [:8500-8600]  [Discord/Twitch]
    │          │                   │                    │
    │          ▼                   │                    │
    │      [S3/R2/GDrive]      [Skills :3200]      [Social Ingest :8100]
    │                          [Knowledge :3400]    [Analytics :8800]
    │                          [MCP Gateway :3100]
    │
    ▼
 [RunPod / Modal]   ← GPU burst: transcription, training, SD thumbnails
```

**Data stores:**

- PostgreSQL — every service's relational data (each service owns its schema namespace)
- Redis — BullMQ queues, pub/sub, rate limiting, session cache, leaderboards
- ChromaDB — vector embeddings for RAG, semantic search
- Object storage (S3/R2/GDrive) — video files, thumbnails, exports

**Communication:**

- Frontend → core-app: REST JSON over HTTPS
- core-app → services: direct HTTP + BullMQ async jobs
- Services → services: HTTP or Redis Streams fan-out
- Realtime to frontend: SSE (notifications, agent streaming, live stats)

---

## 2. Core App — every module

Core-app is the single entry-point the frontend talks to. All platform-specific work is delegated to services.

### 2.1 Auth & identity

**What it does:** JWT issuance, OAuth flows for all connected platforms, API key management, session management.

**Endpoints:**

```
POST /api/auth/token           Client credentials → access_token (RS256)
POST /api/auth/refresh         Refresh token rotation
POST /api/auth/logout          Revoke refresh token
GET  /api/auth/validate        Validate incoming bearer token
GET  /.well-known/jwks.json    Public JWKS for downstream services

# Platform OAuth (one set per platform)
GET  /api/auth/oauth/:platform/url        Return OAuth consent URL
GET  /api/auth/oauth/:platform/callback   Exchange code → store tokens
DELETE /api/auth/oauth/:platform          Disconnect platform
GET  /api/auth/oauth/:platform/status     Token health (valid/expired/missing)
POST /api/auth/oauth/:platform/refresh    Force-refresh platform access token
```

Platforms: `youtube`, `instagram`, `tiktok`, `facebook`, `linkedin`, `twitter`, `twitch`, `discord`, `spotify`, `patreon`, `streamlabs`, `streamelements`

**Platform token storage** (Postgres, encrypted at rest):

```
PlatformCredential
  id, orgId, platform, accountId, accountHandle, accountAvatarUrl
  accessToken (encrypted), refreshToken (encrypted), tokenExpiresAt
  scope[], status (active|expired|revoked), createdAt, updatedAt
```

**User/Org models** (currently missing, need adding):

```
User
  id, email (unique), passwordHash, name, avatarUrl
  role (owner|admin|editor|viewer), orgId
  emailVerifiedAt, lastSeenAt, createdAt

Organization
  id, name, slug (unique), plan (free|pro|enterprise|agency)
  settings (Json), billingCustomerId (Stripe)
  trialEndsAt, createdAt

Invite
  id, orgId, email, role, token (unique), expiresAt, acceptedAt
```

---

### 2.2 Projects & assets

**What it does:** Every piece of media the creator owns lives here. Assets feed into the publishing queue. Projects are containers (e.g. "Minecraft Series", "Just Chatting VODs").

**Endpoints:**

```
# Projects
GET    /api/projects             List org projects (paginated)
POST   /api/projects             Create project
GET    /api/projects/:id         Get project + stats
PATCH  /api/projects/:id         Update name/description/settings
DELETE /api/projects/:id         Archive project

# Assets
GET    /api/assets               List (filter: projectId, status, mimeType, platform)
POST   /api/assets/ingest        Register an asset (returns upload URL)
GET    /api/assets/:id           Get asset + metadata + clip info
PATCH  /api/assets/:id           Update metadata
DELETE /api/assets/:id           Delete + remove from storage
GET    /api/assets/:id/url       Signed playback URL (short-lived)

# Transcription
POST   /api/assets/:id/transcribe   Queue Whisper transcription job
GET    /api/assets/:id/transcript   Get transcript (WebVTT + JSON)

# Chapters
GET    /api/assets/:id/chapters     Auto-detected + manual chapters
POST   /api/assets/:id/chapters     Add manual chapter marker
```

**Extended Asset model:**

```
Asset
  id, orgId, projectId
  filename, title, description
  mimeType, sizeBytes, duration (seconds)
  width, height, fps, bitrate
  storageType (local|s3|r2|gdrive|onedrive|bunny)
  storagePath, storageKey, cdnUrl, thumbnailUrl
  sourceUrl (original stream/YouTube URL)
  startTime, endTime (for clips)
  transcript (Json: segments with timestamps)
  chapters (Json)
  tags[], platforms (platforms this has been published to)
  status (pending|uploading|processing|ready|failed)
  processingJobId, processingError
  publishedCount, totalViews
  createdAt, updatedAt
```

---

### 2.3 Upload & storage

**What it does:** Handles multipart uploads, generates signed URLs for direct-to-S3 uploads, coordinates with the uploader service for chunked resumable uploads.

**Endpoints:**

```
POST /api/uploads/presign           Generate S3 presigned POST for direct upload
                                    Returns: { url, fields, assetId }
POST /api/uploads/multipart/init    Init S3 multipart upload (large files)
POST /api/uploads/multipart/part    Get presigned URL for each part
POST /api/uploads/multipart/complete  Complete multipart, trigger processing
DELETE /api/uploads/multipart/:uploadId  Abort multipart

POST /api/uploads/url               Ingest media from a URL (YouTube, direct link)
                                    Queues download + processing job
GET  /api/uploads/:jobId/status     Poll upload + processing status
```

**Processing pipeline (BullMQ jobs):**

1. `upload.ingest` — download from URL or receive file
2. `upload.probe` — ffprobe for metadata (duration, dimensions, fps)
3. `upload.thumbnail` — extract frame at 0s, 25%, 50%, 75%
4. `upload.transcode` — HLS for streaming playback (optional)
5. `upload.transcribe` — queue Whisper job if auto-transcribe enabled
6. `upload.ready` — mark asset ready, send notification

---

### 2.4 Queue & publishing

**What it does:** Scheduling engine. Accepts queue items, manages the publishing calendar, triggers publishing jobs at the right time.

**Endpoints (expand existing):**

```
POST   /api/queue                   Create queue item
GET    /api/queue                   List (filter: status, projectId, platform, from, to)
GET    /api/queue/calendar          Returns items grouped by date (for calendar UI)
GET    /api/queue/:id               Single item + outbox events
PATCH  /api/queue/:id               Edit (only if status=draft|scheduled)
DELETE /api/queue/:id               Cancel scheduled post
POST   /api/queue/:id/publish-now   Override schedule, publish immediately
POST   /api/queue/:id/retry         Retry failed post

# Drafts
POST   /api/queue/draft             Save draft (no scheduleAt required)
GET    /api/queue/drafts            List all drafts

# Optimal time suggestions
GET    /api/queue/suggest-time      AI-suggested best posting times per platform
```

**Extended QueueItem model:**

```
QueueItem
  id, orgId, projectId, assetId
  title (120), caption, hashtags[], mentions[]
  platforms[], scheduleAt, timezone
  status (draft|scheduled|processing|published|failed|cancelled)
  idempotencyKey, outbox (Json event log)
  firstCommentText    ← post as first comment (YouTube/Instagram trick)
  crosspostSettings (Json per platform overrides: title, caption, thumbnail)
  aiGenerated (bool) ← was caption AI-generated?
  approvalRequired, approvedBy, approvedAt
  publishedAt, failedAt, failureReason
  retryCount, maxRetries
  Post[] (one per platform)
```

---

### 2.5 Content management (CMS)

**What it does:** Content hub — draft articles, video scripts, repurposed content snippets, content templates, brand kit.

**Endpoints:**

```
# Content items (scripts, articles, tweets, short-form)
GET    /api/cms/content             List (filter: type, projectId, status)
POST   /api/cms/content             Create content item
GET    /api/cms/content/:id         Get with version history
PATCH  /api/cms/content/:id         Update (auto-versions)
DELETE /api/cms/content/:id

# Repurpose engine
POST   /api/cms/repurpose           Convert content to other formats
                                    Input: assetId or contentId, targetFormats[]
                                    Returns: { twitter_thread, instagram_caption,
                                               linkedin_post, youtube_description }

# Templates
GET    /api/cms/templates           List templates (org + public)
POST   /api/cms/templates           Save as template
GET    /api/cms/templates/:id
PATCH  /api/cms/templates/:id
DELETE /api/cms/templates/:id

# Brand kit
GET    /api/cms/brand               Get brand kit (colors, fonts, logo)
PUT    /api/cms/brand               Update brand kit
GET    /api/cms/brand/assets        Brand asset files (logos, watermarks)
POST   /api/cms/brand/assets        Upload brand asset

# Content calendar view (read-only aggregation)
GET    /api/cms/calendar            Published + scheduled across all platforms
                                    query: from, to, platforms[]
```

**Models:**

```
ContentItem
  id, orgId, projectId, type (script|article|caption|tweet_thread|short)
  title, body (rich text JSON), excerpt
  status (draft|review|approved|published)
  tags[], assignedTo (userId)
  sourceAssetId    ← derived from this video
  templateId       ← based on this template
  versions (Json array of snapshots)
  createdBy, createdAt, updatedAt

ContentTemplate
  id, orgId, name, type, body, variables (Json), isPublic
  usageCount, createdAt

BrandKit
  id (singleton per org), orgId
  primaryColor, secondaryColor, accentColor
  logoUrl, watermarkUrl, fontPrimary, fontSecondary
  voiceTone (casual|professional|energetic|educational)
  defaultHashtags[], defaultMentions[]
  signatureLines[]
  updatedAt
```

---

### 2.6 Analytics (core aggregation)

**What it does:** Aggregates data pulled from all platform APIs + internal events. Powers all dashboard charts.

**Endpoints:**

```
GET /api/analytics/overview         Cross-platform totals (views, followers, revenue)
                                    ?period=7d|30d|90d|custom&from=&to=
GET /api/analytics/growth           Follower growth per platform over time
GET /api/analytics/content          Top performing content
                                    ?sort=views|engagement|revenue&limit=50
GET /api/analytics/platforms        Side-by-side platform comparison
GET /api/analytics/revenue          Revenue breakdown by source
GET /api/analytics/audience         Audience demographics (age, geo, device)
GET /api/analytics/schedule         Best time to post (by platform, day, hour)
GET /api/analytics/stream           Stream-specific metrics (concurrent viewers, etc.)

# Data sync
POST /api/analytics/sync            Trigger manual platform data pull
GET  /api/analytics/sync/status     Last sync time per platform
```

---

### 2.7 Trends

**What it does:** Surfaces trending topics, sounds, hashtags, and keywords across platforms relevant to the creator's niche.

**Endpoints:**

```
GET /api/trends                     Top trends (filtered by niche)
GET /api/trends/hashtags            Trending hashtags per platform
GET /api/trends/topics              Trending topics (YouTube/TikTok)
GET /api/trends/sounds              Trending sounds (TikTok/Instagram Reels)
GET /api/trends/keywords            Keyword volume and competition
GET /api/trends/competitors         Trending content from tracked competitors
                                    ?platform=&category=&geo=US
```

Data sources: YouTube Trending API, TikTok Discover, Google Trends, RapidAPI trend aggregators.

---

### 2.8 Webhooks (incoming from platforms)

**What it does:** Receives real-time events from platforms (new subscriber, donation, stream start, comment, etc.) and fans them out internally via Redis pub/sub.

**Endpoints:**

```
POST /api/webhooks/youtube          YouTube push notification (PubSubHubbub)
POST /api/webhooks/twitch           Twitch EventSub
POST /api/webhooks/discord          Discord interactions endpoint
POST /api/webhooks/stripe           Stripe billing events
POST /api/webhooks/streamlabs       Streamlabs alert events
POST /api/webhooks/streamelements   StreamElements tip/sub events
POST /api/webhooks/patreon          Patreon pledge events

# Outgoing webhooks (user-configured)
GET    /api/webhooks/outgoing        List user's outgoing webhook configs
POST   /api/webhooks/outgoing        Register a webhook URL + events to subscribe
GET    /api/webhooks/outgoing/:id
PATCH  /api/webhooks/outgoing/:id
DELETE /api/webhooks/outgoing/:id
POST   /api/webhooks/outgoing/:id/test  Send a test payload
GET    /api/webhooks/outgoing/:id/logs  Delivery attempt logs
```

**Model:**

```
WebhookConfig
  id, orgId, url, secret, events[], isActive
  createdAt, lastTriggeredAt

WebhookDelivery
  id, configId, event, payload (Json), responseStatus, responseBody
  attempt, deliveredAt, failedAt
```

---

### 2.9 Notifications

**What it does:** Realtime and persistent notifications. Delivered via SSE to the frontend and optionally forwarded to email/Discord/Telegram.

**Endpoints:**

```
GET  /api/notifications             List (paginated, filter: unread)
POST /api/notifications/read        Mark IDs as read
POST /api/notifications/read-all    Mark all as read
DELETE /api/notifications/:id

GET  /api/notifications/stream      SSE — live notification feed
                                    (used by the frontend for realtime toasts)

GET  /api/notifications/preferences  Per-category toggle settings
PUT  /api/notifications/preferences
```

**Event categories:** `publish_complete`, `publish_failed`, `upload_ready`, `agent_task_complete`, `agent_approval_needed`, `stream_start`, `stream_end`, `milestone`, `billing`, `team`, `moderation_action`

**Model:**

```
Notification
  id, orgId, userId, type (event category)
  title, body, data (Json), ctaUrl
  readAt, createdAt
```

---

### 2.10 Billing & subscriptions

**What it does:** Stripe integration for subscription management, usage metering, invoices.

**Endpoints:**

```
GET  /api/billing/plan              Current plan + limits
GET  /api/billing/usage             Real-time usage vs limits
POST /api/billing/portal            Create Stripe Customer Portal session
POST /api/billing/checkout          Create Stripe Checkout session (upgrade)
GET  /api/billing/invoices          Invoice history
GET  /api/billing/invoices/:id/pdf  Download invoice PDF

# Usage events (internal — called by services)
POST /api/billing/usage/record      Record a metered event (clip_created, ai_tokens, etc.)
```

**Plans (example tiers):**

| Feature            | Free       | Pro ($29)     | Enterprise ($99) |
| ------------------ | ---------- | ------------- | ---------------- |
| Platforms          | 2          | All           | All              |
| Scheduled posts/mo | 30         | Unlimited     | Unlimited        |
| Clips/mo           | 10         | 100           | Unlimited        |
| Storage            | 5 GB       | 100 GB        | 1 TB             |
| AI tokens/mo       | 50K        | 1M            | 10M              |
| Team seats         | 1          | 5             | 25               |
| Agents             | 2 (manual) | All (copilot) | All (autopilot)  |

---

### 2.11 Search

**What it does:** Full-text and semantic search across assets, content, queue items, and activity.

**Endpoints:**

```
GET /api/search?q=&type=asset|content|queue|activity&limit=20
```

Uses PostgreSQL `tsvector` for text search. Semantic search via the Knowledge service for natural language queries.

---

### 2.12 Audit log

**What it does:** Immutable append-only log of every action in the org. Required for teams and compliance.

```
GET /api/audit?from=&to=&actor=&resource=&action=&limit=100
```

**Model:**

```
AuditEvent
  id, orgId, actorId, actorEmail, actorIp
  action (string e.g. "queue.create", "asset.delete", "member.invite")
  resourceType, resourceId, resourceName
  diff (Json — before/after for updates)
  metadata (Json)
  createdAt
```

---

## 3. Publishing pipeline

Each publisher service handles one platform family. They receive jobs from BullMQ (`publish` queue) and use the stored PlatformCredential (OAuth tokens from core-app).

### 3.1 YouTube Publisher (:8500)

**Features:**

- Resumable upload (YouTube resumable upload API — required for files > 256 KB)
- Retry with exponential back-off on upload errors
- Auto-generate chapters from asset transcript
- Set title, description, tags, category, privacy, made-for-kids flag
- Post as first comment (pinned with sponsor links etc.)
- Playlist assignment (create if not exists)
- Enable/disable comments, notifications
- Schedule as "private until X" using YouTube's own scheduling
- Thumbnail upload (custom or auto-generated)
- Premiere support
- Language and subtitle track upload (from transcript)

**Endpoints:**

```
POST /api/v1/youtube/upload             Start upload job
GET  /api/v1/youtube/upload/:jobId      Poll upload + processing status
POST /api/v1/youtube/upload/:jobId/cancel
GET  /api/v1/youtube/channel            Channel details (name, subs, quota used)
GET  /api/v1/youtube/playlists          List playlists
POST /api/v1/youtube/playlists          Create playlist
GET  /api/v1/youtube/quota              Current API quota usage (YouTube has 10k/day)
GET  /api/v1/youtube/video/:videoId     Get published video details
PATCH /api/v1/youtube/video/:videoId    Update title/description after publish
GET  /api/v1/youtube/analytics/:videoId Video-level analytics
```

**BullMQ job schema:**

```json
{
  "jobId": "pub-yt-abc123",
  "orgId": "org-1",
  "queueItemId": "qi-1",
  "assetStoragePath": "s3://bucket/org-1/video.mp4",
  "title": "...",
  "description": "...",
  "tags": [],
  "thumbnailUrl": "...",
  "privacy": "public",
  "scheduleAt": null,
  "playlistId": null,
  "firstComment": "..."
}
```

---

### 3.2 Social Publisher (:8600)

**Platforms:** Instagram, TikTok, Facebook, LinkedIn

**Instagram:**

- Reels (video ≤ 90s for best reach, up to 15 min)
- Feed posts (photo + video carousel)
- Stories (photo/video, 15s each)
- Container → publish two-step API flow
- Auto-select cover frame
- Hashtag injection (up to 30)
- Location tag
- Collab tagging

**TikTok:**

- Content Posting API (direct upload)
- Privacy level (public/follower/private)
- Allow/disallow comments, duet, stitch
- Auto-caption from transcript
- Cover frame selection

**Facebook:**

- Page post (text, photo, video, link)
- Reels
- Stories
- Scheduled post
- Cross-post to Instagram simultaneously

**LinkedIn:**

- Personal + Company page posts
- Article publishing
- Video posts
- Document (PDF) posts

**Endpoints:**

```
POST /api/v1/publish/:platform        Publish to specific platform
GET  /api/v1/publish/:platform/:jobId Job status
GET  /api/v1/accounts/:platform       Connected accounts for platform
POST /api/v1/publish/multi            Publish to multiple platforms (one job each)
```

---

### 3.3 Twitter/X Publisher

**Features:**

- Tweet (up to 280 chars + 4 media)
- Thread (auto-split long content into numbered thread)
- Alt text on images
- Poll
- Scheduled tweet
- Quote tweet
- Reply to previous tweet (thread continuation)
- Analytics pull

---

### 3.4 Clipper (:8000)

**Features:**

- Extract clip from timestamp range
- AI highlight detection (volume peaks, chat activity spikes, keyword mentions)
- Auto-cut silence
- Speed ramp (2x during dead air)
- Add intro/outro bumpers
- Watermark overlay
- Subtitle burn-in (from transcript)
- Export presets: YouTube (16:9), TikTok/Reels (9:16 crop), Square (1:1)
- Batch clip creation from a single source

**Endpoints:**

```
POST /api/v1/clip                   Create clip job
GET  /api/v1/clip/:id               Status + progress
DELETE /api/v1/clip/:id             Cancel job

POST /api/v1/clip/detect-highlights Analyze video, return suggested timestamps
                                    (uses transcript + audio analysis)

GET  /api/v1/clip/presets           List export presets
POST /api/v1/clip/presets           Create custom preset
```

**Job types sent to RunPod:**

- `clip.extract` — FFmpeg extract + encode
- `clip.highlights` — Audio + transcript analysis
- `clip.reformat` — Crop/pad to target aspect ratio

---

### 3.5 Thumbnail Generator (:8400)

**Features:**

- 8 templates (Bold, Dramatic, Colorful, Minimal, Gaming, Split, Gradient, Vlog)
- AI image generation via DALL-E 3, Stable Diffusion (local or RunPod), SDXL
- Face swap / face crop from creator's reference photo
- Smart text overlays (auto-contrast, drop shadow)
- Background removal (rembg)
- A/B test variants (generate 3 options, pick winner based on CTR)
- YouTube-specific: 1280×720, ≤ 2MB JPEG

**Endpoints:**

```
POST /api/v1/thumbnails/generate        Generate thumbnail(s)
GET  /api/v1/thumbnails/:id             Get result
GET  /api/v1/thumbnails/templates       List templates
POST /api/v1/thumbnails/ab-test         Create A/B test (generate variants)
POST /api/v1/thumbnails/ab-test/:id/pick  Pick winner
POST /api/v1/thumbnails/upload          Upload custom thumbnail → CDN
```

**RunPod usage:** SD/SDXL generation runs on a RunPod serverless endpoint. The service sends a prompt + parameters and receives the image URL.

---

## 4. AI / ML layer

### 4.1 Agent Orchestrator (:3300)

The brain. Receives tasks, decomposes them, calls Skills/MCP tools, asks for approval when needed, streams progress.

**Agent types and their jobs:**

| Agent      | Autonomy  | Core tasks                                                 |
| ---------- | --------- | ---------------------------------------------------------- |
| Content    | Copilot   | Generate captions, titles, descriptions, repurpose content |
| Clip       | Copilot   | Detect highlights, create clip jobs, suggest cuts          |
| Publishing | Copilot   | Schedule posts, pick optimal times, manage queue           |
| Moderation | Autopilot | Review flagged content, take configured actions            |
| Analytics  | Autopilot | Generate weekly digest, surface anomalies                  |
| Growth     | Copilot   | Find trending topics, suggest SEO improvements             |
| Community  | Manual    | Draft DM replies, comment responses                        |
| Revenue    | Manual    | Track sponsor deals, generate media kits                   |

**Endpoints:**

```
# Agent config
GET  /api/v1/agents                     List agents + status
GET  /api/v1/agents/:type               Get agent config
PUT  /api/v1/agents/:type               Update config (autonomy, skills, prompt)
POST /api/v1/agents/:type/enable
POST /api/v1/agents/:type/disable

# Tasks
POST /api/v1/tasks                      Submit task to an agent
GET  /api/v1/tasks                      List tasks (filter: agent, status, from, to)
GET  /api/v1/tasks/:id                  Task detail + reasoning trace
POST /api/v1/tasks/:id/cancel

# Approvals
GET  /api/v1/approvals                  Pending approvals (copilot tasks awaiting OK)
POST /api/v1/approvals/:id/approve      Approve with optional edits
POST /api/v1/approvals/:id/reject       Reject with feedback
GET  /api/v1/approvals/:id

# Agent crews (multi-agent teams)
GET  /api/v1/crews
POST /api/v1/crews                      Create crew with goal
GET  /api/v1/crews/:id                  Crew + messages + status
POST /api/v1/crews/:id/run
POST /api/v1/crews/:id/stop

# Chat (Wave companion)
POST /api/v1/chat                       Send message (returns SSE stream)
GET  /api/v1/chat/:sessionId            Chat history
DELETE /api/v1/chat/:sessionId          Clear history
```

**LLM routing:**

- Fast tasks (captions, short content): `gpt-4o-mini` or `claude-haiku`
- Complex reasoning (planning, research): `gpt-4o` or `claude-sonnet`
- Code generation: `claude-sonnet` or `deepseek-coder`
- Local / private mode: `ollama` (Llama 3.1 8B or 70B)
- RunPod: fine-tuned LoRA model for creator-specific voice

---

### 4.2 AI Personality (:8200)

The creator's digital clone. Every piece of AI-generated text passes through here to sound like the creator.

**Features:**

- Personality profile (tone, vocabulary, emoji use, posting style, topics to avoid)
- Short-term memory (last 100 interactions)
- Long-term memory (ChromaDB — past content, recurring themes)
- Sentiment filtering (don't say things the creator wouldn't)
- Controversy avoidance
- Multi-language support
- "Voice samples" — ingest past video transcripts, tweets, captions to learn style

**Endpoints:**

```
GET  /api/v1/personality/:orgId         Get profile
PUT  /api/v1/personality/:orgId         Update profile settings

POST /api/v1/personality/:orgId/generate  Generate text in creator's voice
                                          Body: { prompt, context, format, maxTokens }

POST /api/v1/personality/:orgId/train     Ingest voice samples
                                          Body: { samples: [{ text, source }] }

GET  /api/v1/personality/:orgId/memory    Recent memory entries
DELETE /api/v1/personality/:orgId/memory  Clear memory

POST /api/v1/personality/:orgId/preview   Preview a generated message before sending
```

---

### 4.3 Knowledge / RAG (:3400)

Gives agents access to creator-specific context: past videos, docs, show notes, FAQs, brand guidelines.

**Endpoints:**

```
POST /api/v1/documents/ingest        Ingest file (PDF, txt, md), URL, or raw text
GET  /api/v1/documents               List documents
DELETE /api/v1/documents/:id

GET  /api/v1/collections             List ChromaDB collections
POST /api/v1/collections             Create collection (e.g. "brand-guidelines", "past-videos")
DELETE /api/v1/collections/:id

POST /api/v1/search                  Semantic search across documents
                                     Body: { query, collection?, topK, minScore }

POST /api/v1/context                 Get RAG context for agent (returns top-K chunks
                                     formatted as a system prompt injection)
                                     Body: { query, agentType, orgId }

GET  /api/v1/context-rules/:agentType  Per-agent retrieval config
PUT  /api/v1/context-rules/:agentType

# Ingestion jobs
GET  /api/v1/jobs/:id                Poll ingestion status
```

---

### 4.4 MCP Gateway (:3100)

Registry and proxy for all MCP tool servers. Agents call tools through here.

**Endpoints:**

```
GET    /api/v1/servers                  List registered MCP servers
POST   /api/v1/servers                  Register a new MCP server
GET    /api/v1/servers/:id
PATCH  /api/v1/servers/:id
DELETE /api/v1/servers/:id
POST   /api/v1/servers/:id/connect
POST   /api/v1/servers/:id/disconnect
GET    /api/v1/servers/:id/health

GET    /api/v1/tools                    All tools across all servers
GET    /api/v1/tools/:id                Tool detail + schema
POST   /api/v1/tools/call               Invoke a tool
                                        Body: { toolId, args, agentType }

GET    /api/v1/permissions/:agentType   What tools this agent type can call
PUT    /api/v1/permissions/:agentType

GET    /api/v1/analytics/usage          Tool usage stats
GET    /api/v1/analytics/usage/:toolId  Per-tool stats
```

---

### 4.5 Skills Engine (:3200)

Reusable multi-step workflows composed from MCP tool calls.

**Built-in skills (ship with the product):**

| Skill             | Steps                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `clip-and-ship`   | Clipper → AI Personality (caption) → Thumbnail → Schedule queue          |
| `vod-to-shorts`   | Clipper (highlights) → Reformat 9:16 → Social Publisher (TikTok + Reels) |
| `stream-recap`    | Transcription → AI summary → Twitter thread + YouTube description        |
| `weekly-digest`   | Analytics pull → AI Personality (summary) → Email Marketing (send)       |
| `trending-post`   | Trends → AI Personality (caption idea) → CMS draft                       |
| `seo-optimize`    | Asset transcript → SEO Optimizer → Update YouTube title/tags             |
| `community-check` | Social Ingest → AI Personality (draft reply) → Approval request          |

**Endpoints:**

```
GET    /api/v1/skills                   List (filter: category, installed, public)
POST   /api/v1/skills                   Create custom skill
GET    /api/v1/skills/:id
PATCH  /api/v1/skills/:id
DELETE /api/v1/skills/:id

POST   /api/v1/skills/:id/versions      New version
POST   /api/v1/skills/:id/execute       Run skill now
                                        Body: { input, orgId }
GET    /api/v1/executions               Execution history
GET    /api/v1/executions/:id           Execution detail + step logs

# Marketplace
GET    /api/v1/marketplace              Browse public skills
POST   /api/v1/marketplace/:id/install  Install to org
POST   /api/v1/marketplace/:id/fork     Fork + customize
POST   /api/v1/marketplace/:id/rate     Rate/review
POST   /api/v1/skills/:id/publish       Submit to marketplace
```

---

### 4.6 ML Training (:8300)

**Purpose:** Fine-tune open-source LLMs (Llama 3.1, Mistral) on creator's voice using LoRA/QLoRA. Trained model deployed to RunPod for low-latency inference.

**Pipeline:**

1. Collect voice samples (transcripts, captions, tweets) from Knowledge service
2. Format as instruction-following JSONL dataset
3. Submit fine-tuning job to RunPod (A100 / H100 pod)
4. Monitor training (loss curve, eval metrics)
5. Export LoRA adapter weights
6. Deploy adapter to RunPod serverless endpoint
7. Register endpoint in AI Personality service

**Endpoints:**

```
POST /api/v1/training/start          Start fine-tune job
                                     Body: { orgId, baseModel, datasetId,
                                             loraRank, epochs, learningRate }
GET  /api/v1/training/:jobId         Status + metrics (loss, step, ETA)
POST /api/v1/training/:jobId/cancel
GET  /api/v1/training/:jobId/logs    Streaming training logs

POST /api/v1/models/deploy           Deploy trained model to RunPod endpoint
GET  /api/v1/models/:orgId           Deployed model info (endpoint URL, version)
POST /api/v1/generate                Test inference against trained model
GET  /api/v1/datasets                List training datasets
POST /api/v1/datasets/build          Build dataset from org's content history
```

---

## 5. Analytics layer

### 5.1 Analytics Dashboard Go service (:8800)

High-performance aggregation. PostgreSQL + Redis cache.

**Endpoints:**

```
GET /api/v1/overview            Cross-platform totals + deltas vs previous period
GET /api/v1/metrics/:platform   Platform-specific detailed metrics
GET /api/v1/content             Top content ranked by metric
GET /api/v1/audience            Audience breakdown (age, geo, device, gender)
GET /api/v1/revenue             Revenue by source + trend
GET /api/v1/schedule            Engagement heatmap (day × hour grid)
GET /api/v1/compare             Compare two date ranges
GET /api/v1/export/csv          Export data as CSV
GET /api/v1/export/pdf          Generate analytics report PDF
```

**Caching strategy:**

- Overview: Redis cache 5 min, invalidated on sync
- Historical data: Redis cache 1 hour
- Real-time stream metrics: no cache, live from LivestreamAnalytics

---

### 5.2 Livestream Analytics Go service (:9500)

Real-time metrics during a live stream.

**Endpoints:**

```
POST /api/v1/streams/start          Register stream start
POST /api/v1/streams/:id/end        Register stream end
GET  /api/v1/streams/:id/live       SSE — real-time viewer count, chat rate, donations
GET  /api/v1/streams/:id/summary    Post-stream summary (peak viewers, avg duration, etc.)
GET  /api/v1/streams                Stream history
```

---

### 5.3 Social Ingest (:8100)

Normalizes events from all platforms into a single canonical stream. Stored in Postgres, fanned out via Redis Streams.

**Endpoints:**

```
POST /api/v1/ingest/:platform        Platform webhook receiver (internal — not public)

GET  /api/v1/messages               Paginated message history
GET  /api/v1/events                 Platform event stream (stream start, donation, sub, etc.)
GET  /api/v1/analytics/user/:id     Per-user engagement stats
GET  /api/v1/analytics/channel/:id  Per-channel stats
GET  /api/v1/search                 Full-text search across messages
GET  /api/v1/leaderboard            Top users by points/activity
```

---

### 5.4 SEO Optimizer (:9300)

**Features:**

- Keyword research (YouTube autocomplete, Google Keyword Planner)
- Title optimization (keyword placement, click-through optimization)
- Description writing (SEO-structured + persona voice)
- Tag generation
- Competitor keyword gap analysis
- Search volume estimates
- Thumbnail CTR prediction

**Endpoints:**

```
POST /api/v1/optimize/title         Generate SEO-optimized title variants
POST /api/v1/optimize/description   Generate SEO description
POST /api/v1/optimize/tags          Generate tags for a topic
POST /api/v1/keywords/research      Research keywords for a topic
POST /api/v1/keywords/gap           Find keywords competitors rank for that you don't
GET  /api/v1/rankings               Current search ranking for tracked keywords
POST /api/v1/rankings/track         Add keyword to tracking
```

---

## 6. Bot layer

### 6.1 Discord Bot

**Slash commands (current + planned):**

| Command                      | Description                           |
| ---------------------------- | ------------------------------------- |
| `/clip`                      | Clip the last N minutes of the stream |
| `/highlight [timestamp]`     | Mark a highlight                      |
| `/publish [url]`             | Queue a piece of content for posting  |
| `/analytics`                 | Show latest stats                     |
| `/schedule`                  | Show upcoming posts                   |
| `/poll [question] [options]` | Create a poll                         |
| `/giveaway`                  | Start a giveaway                      |
| `/trivia`                    | Start trivia game                     |
| `/points`                    | Check community points                |
| `/daily`                     | Claim daily reward                    |
| `/leaderboard`               | Top community members                 |
| `/reminder [time] [text]`    | Set a reminder                        |
| `/stream`                    | Show current stream info              |
| `/ask [question]`            | Ask Wave (AI companion) a question    |
| `/mod [action] [@user]`      | Moderate a user                       |

**Events handled:**

- `messageCreate` → spam/toxicity check via auto-mod
- `guildMemberAdd` → welcome message, role assignment
- `interactionCreate` → slash commands
- Stream online/offline → announcement embed

---

### 6.2 Twitch Bot

**Chat commands (current + planned):**

| Command              | Permission  | Action               |
| -------------------- | ----------- | -------------------- |
| `!clip`              | Mod         | Create Twitch clip   |
| `!so @user`          | Mod         | Shoutout             |
| `!title [new title]` | Broadcaster | Update stream title  |
| `!game [new game]`   | Broadcaster | Update game category |
| `!scene [name]`      | Broadcaster | Switch OBS scene     |
| `!poll [question]`   | Mod         | Start Twitch poll    |
| `!raid [channel]`    | Broadcaster | Initiate raid        |
| `!points`            | All         | Check points         |
| `!leaderboard`       | All         | Points leaderboard   |
| `!uptime`            | All         | Stream uptime        |
| `!discord`           | All         | Discord invite link  |
| `!socials`           | All         | All social links     |
| `!schedule`          | All         | Upload schedule      |
| `!ask [question]`    | All         | AI companion answer  |

**Auto-responses:**

- New follower — configurable message
- Subscription (T1/T2/T3/Gifted) — variant messages
- Bits/Cheer — threshold messages
- Raid — raid message
- First chat — welcome message
- Keyword triggers (custom per streamer)

---

### 6.3 Telegram Bot

**Commands:**

- `/analytics` — latest stats summary
- `/schedule` — upcoming posts
- `/clip [url] [start] [end]` — create clip
- `/publish` — queue content
- `/ask [question]` — AI companion
- `/alert [on|off]` — toggle stream alerts

---

### 6.4 WhatsApp Bot

**Use cases:**

- Client communication for agencies (status updates, approvals)
- Quick `!stats` to get daily summary
- Approval flow: agent sends draft → creator replies `approve` or `edit: [new text]`
- Alert forwarding (stream online, milestone reached)

---

## 7. Business layer

### 7.1 Sponsor Manager (:8900)

**Features:**

- Sponsor CRM (contact, deal value, deliverables, deadlines)
- Contract tracking
- Deliverable checklist (video mentions, social posts, discount codes)
- Payment tracking via Stripe
- Auto-reminder when deadline approaches
- Media kit generation (PDF with stats, audience demographics, rate card)
- Discount code tracking (UTM + promo code performance)
- Integration with Queue (auto-tag sponsored posts)

**Endpoints:**

```
GET    /api/v1/sponsors             List
POST   /api/v1/sponsors             Add sponsor
GET    /api/v1/sponsors/:id
PATCH  /api/v1/sponsors/:id
DELETE /api/v1/sponsors/:id

POST   /api/v1/sponsors/:id/contract   Upload contract PDF
GET    /api/v1/sponsors/:id/media-kit  Generate media kit PDF

GET    /api/v1/deals                List deals
POST   /api/v1/deals                Create deal (linked to sponsor)
GET    /api/v1/deals/:id
PATCH  /api/v1/deals/:id/status      (negotiating|active|completed|cancelled)

GET    /api/v1/deliverables         All pending deliverables
PATCH  /api/v1/deliverables/:id/complete

GET    /api/v1/payments             Payment history
POST   /api/v1/payments/record      Log payment received

GET    /api/v1/promo-codes          Tracked promo codes + performance
POST   /api/v1/promo-codes
```

---

### 7.2 Merch Integration (:9800)

**Platforms:** Printful, Teespring (Spring), Shopify

**Features:**

- Product catalog sync
- Order tracking
- Revenue reporting
- Auto-promote new products (trigger publishing job)
- Low-stock alerts

**Endpoints:**

```
GET    /api/v1/products             List products across platforms
GET    /api/v1/products/:id
POST   /api/v1/products/sync        Force-sync from merch platform

GET    /api/v1/orders               Order history (filter: status, platform)
GET    /api/v1/orders/:id
GET    /api/v1/orders/stats         Revenue, units sold, top products

POST   /api/v1/promotions/generate  Generate a post to promote a product
                                    (calls AI Personality + queue)
```

---

### 7.3 Email Marketing (:9200)

**Providers:** SendGrid (transactional), Mailchimp or Loops.so (newsletters)

**Features:**

- Subscriber list management
- Segmentation (Twitch subs, YouTube members, Patreon tiers)
- Campaign creation and scheduling
- AI-written email drafts via AI Personality
- Open/click rate tracking
- Unsubscribe handling (CAN-SPAM/GDPR)
- Welcome sequence automation

**Endpoints:**

```
GET    /api/v1/lists                Subscriber lists
POST   /api/v1/lists/:id/subscribe  Add subscriber
DELETE /api/v1/lists/:id/unsubscribe

GET    /api/v1/campaigns            Campaign history
POST   /api/v1/campaigns            Create campaign
POST   /api/v1/campaigns/:id/send   Send now or schedule
GET    /api/v1/campaigns/:id/stats  Open/click rates

POST   /api/v1/templates            Email template (AI-generated)
```

---

### 7.4 Link Router (Go, edge)

**Purpose:** Short-link creation (`wave.st/abc123`), UTM tracking, redirect analytics. Deployed to Cloudflare Workers for sub-millisecond redirect latency.

**Endpoints:**

```
POST /api/v1/links                  Create short link (target URL + UTM params)
GET  /api/v1/links                  List links
GET  /api/v1/links/:slug/stats      Click stats (total, unique, referrer, geo, device)
PATCH /api/v1/links/:slug
DELETE /api/v1/links/:slug

GET  /:slug                         Public redirect endpoint (on edge)
```

---

## 8. Infrastructure layer

### 8.1 Auto-Mod (:8700)

Runs on every inbound message from Discord, Twitch, YouTube comments, TikTok comments.

**Detection models:**

- Toxicity (Perspective API or local ONNX model)
- Spam (TF-IDF + rule engine)
- Hate speech
- NSFW (image moderation for thumbnails/profile pics)
- Self-promotion (link detection)
- Caps-lock spam
- Repeated-message flood

**Actions (configurable per threshold):**

- `warn` — send DM/reply warning
- `delete` — remove message
- `timeout [duration]` — temporary mute
- `ban` — permanent ban
- `escalate` — flag for human review in notifications

**Endpoints:**

```
POST /api/v1/check              Check content → returns { score, action, reason }
POST /api/v1/check/batch        Batch check (up to 100 messages)
GET  /api/v1/violations/:userId  Violation history
GET  /api/v1/violations/recent   Recent violations across all users
PUT  /api/v1/config             Update thresholds and actions
GET  /api/v1/config
GET  /api/v1/stats              Moderation stats (today, week, month)
GET  /api/v1/allowlist          Trusted users bypass list
POST /api/v1/allowlist
DELETE /api/v1/allowlist/:userId
```

---

## 9. Complete database schema

Each service owns its own tables but all live in the same Postgres instance (different schema namespaces for isolation). Core app uses the `public` schema; services use named schemas.

### Schema: public (core-app)

```sql
-- Users and orgs
users (id, email, password_hash, name, avatar_url, role, org_id,
       email_verified_at, last_seen_at, created_at)

organizations (id, name, slug, plan, billing_customer_id,
               trial_ends_at, settings jsonb, created_at)

invites (id, org_id, email, role, token, expires_at, accepted_at)

-- Platform OAuth
platform_credentials (id, org_id, platform, account_id, account_handle,
                       account_avatar_url, access_token, refresh_token,
                       token_expires_at, scope text[], status, created_at, updated_at)

-- Media
projects (id, org_id, name, description, settings jsonb, created_at)

assets (id, org_id, project_id, filename, title, description,
        mime_type, size_bytes, duration, width, height, fps, bitrate,
        storage_type, storage_path, storage_key, cdn_url, thumbnail_url,
        source_url, start_time, end_time,
        transcript jsonb, chapters jsonb, tags text[],
        status, processing_job_id, processing_error,
        published_count int, total_views bigint,
        created_at, updated_at)

-- Publishing
queue_items (id, org_id, project_id, asset_id, title, caption,
             hashtags text[], mentions text[], platforms text[],
             schedule_at timestamptz, timezone, status,
             idempotency_key, outbox jsonb,
             first_comment_text, crosspost_settings jsonb,
             ai_generated bool, approval_required bool,
             approved_by, approved_at,
             published_at, failed_at, failure_reason,
             retry_count int, max_retries int)

posts (id, org_id, queue_item_id, platform, external_id, url, published_at)

-- CMS
content_items (id, org_id, project_id, type, title, body jsonb,
               excerpt, status, tags text[], assigned_to,
               source_asset_id, template_id, versions jsonb,
               created_by, created_at, updated_at)

content_templates (id, org_id, name, type, body, variables jsonb,
                   is_public, usage_count, created_at)

brand_kits (id, org_id, primary_color, secondary_color, accent_color,
            logo_url, watermark_url, font_primary, font_secondary,
            voice_tone, default_hashtags text[], default_mentions text[],
            signature_lines text[], updated_at)

-- Notifications & webhooks
notifications (id, org_id, user_id, type, title, body, data jsonb,
               cta_url, read_at, created_at)

webhook_configs (id, org_id, url, secret, events text[], is_active, created_at)
webhook_deliveries (id, config_id, event, payload jsonb, response_status,
                    response_body, attempt int, delivered_at, failed_at)

-- Billing
billing_events (id, org_id, event_type, quantity, metadata jsonb, created_at)

-- Audit
audit_events (id, org_id, actor_id, actor_email, actor_ip,
              action, resource_type, resource_id, resource_name,
              diff jsonb, metadata jsonb, created_at)
```

### Schema: analytics

```sql
platform_snapshots (id, org_id, platform, account_id, period,
                    followers bigint, views bigint, impressions bigint,
                    watch_time_minutes bigint, engagement_rate numeric,
                    revenue_cents bigint, new_subs int,
                    snapshotted_at timestamptz)

content_performance (id, org_id, platform, external_id, asset_id,
                     title, published_at, views bigint,
                     likes int, comments int, shares int,
                     watch_time_minutes bigint, ctr numeric,
                     revenue_cents bigint, fetched_at)

stream_sessions (id, org_id, platform, stream_id, title,
                 started_at, ended_at, peak_viewers int,
                 avg_viewers int, chat_messages int,
                 followers_gained int, revenue_cents bigint)

tracked_keywords (id, org_id, keyword, platform, current_rank int,
                  prev_rank int, search_volume int, updated_at)
```

### Schema: agents

```sql
agent_configs (id, org_id, agent_type, autonomy_level,
               is_enabled, allowed_skills text[],
               system_prompt, settings jsonb, updated_at)

agent_tasks (id, org_id, agent_type, priority, status,
             input jsonb, output jsonb, reasoning_trace jsonb,
             error text, created_at, started_at, completed_at)

agent_decisions (id, task_id, decision_type, reasoning, data jsonb, created_at)

approval_requests (id, org_id, task_id, agent_type,
                   draft jsonb, expires_at, status,
                   reviewed_by, reviewed_at, feedback text)

agent_crews (id, org_id, name, goal, agents text[],
             status, created_at, completed_at)

crew_messages (id, crew_id, from_agent, to_agent, message_type,
               content jsonb, created_at)

chat_sessions (id, org_id, user_id, agent_type, created_at)

chat_messages (id, session_id, role, content, metadata jsonb, created_at)
```

### Schema: knowledge

```sql
documents (id, org_id, collection_id, title, source_type,
           source_url, content, status, chunk_count int,
           embedding_model, created_at)

document_chunks (id, document_id, content, token_count int,
                 chroma_id, chunk_index int)

collections (id, org_id, name, description, embedding_model, created_at)

context_rules (id, org_id, agent_type, collection_ids text[],
               max_chunks int, min_score numeric,
               system_prompt_prefix, updated_at)

ingestion_jobs (id, org_id, document_id, status, error, created_at, completed_at)
```

### Schema: sponsors

```sql
sponsors (id, org_id, name, logo_url, contact_name,
          contact_email, contact_phone, website, notes,
          created_at, updated_at)

deals (id, org_id, sponsor_id, value_cents int, currency,
       deliverables jsonb, status, start_date, end_date,
       contract_url, created_at)

deliverables (id, deal_id, title, due_date, platform,
              content_type, is_complete, completed_at)

payments (id, deal_id, amount_cents int, currency,
          paid_at, notes)

promo_codes (id, org_id, deal_id, code, platform,
             total_clicks int, conversions int, revenue_cents bigint,
             created_at)

media_kits (id, org_id, generated_at, pdf_url, data jsonb)
```

---

## 10. External services

### Compute & GPU

| Service               | Purpose                     | When to use                                                |
| --------------------- | --------------------------- | ---------------------------------------------------------- |
| **RunPod Serverless** | On-demand GPU (A100/H100)   | ML training, SD thumbnail gen, Whisper transcription       |
| **RunPod Pods**       | Persistent GPU instance     | If training jobs are long and frequent (cheaper per-hour)  |
| **Modal.com**         | Alternative serverless GPU  | Great DX, easy Python deploy, pay-per-second               |
| **Replicate**         | Hosted SD/SDXL/FLUX models  | Simplest path for thumbnail generation (no GPU management) |
| **Fal.ai**            | Fast image gen (FLUX, SDXL) | Faster than Replicate for real-time thumbnail generation   |
| **Together.ai**       | Hosted open-source LLMs     | Cheaper alternative to OpenAI for bulk generation          |
| **Groq**              | Ultra-fast LLM inference    | Near-instant responses for chat/companion (Llama 3.1 70B)  |
| **Ollama**            | Local LLM (self-hosted)     | Dev environment, privacy mode, no-internet scenarios       |

**RunPod setup for WaveStack:**

```
Serverless endpoints to create:
  1. whisper-transcription   — openai/whisper-large-v3 (A10G, ~0.3s/min audio)
  2. sdxl-thumbnail          — SDXL 1.0 + ControlNet (A10G, ~4s/image)
  3. lora-training           — Axolotl + LoRA (A100 80GB, pay per training run)
  4. ffmpeg-gpu              — NVENC encode for fast video processing

Persistent pod for:
  5. ChromaDB + embedding model  (if not using hosted)
```

---

### Storage & CDN

| Service               | Purpose                      | Notes                                                        |
| --------------------- | ---------------------------- | ------------------------------------------------------------ |
| **Cloudflare R2**     | Primary object storage       | S3-compatible, free egress, cheapest for large media files   |
| **AWS S3**            | Fallback / enterprise        | If customer requires AWS                                     |
| **Cloudflare Stream** | Video hosting + HLS delivery | Auto-transcodes, thumbnail extraction, adaptive bitrate      |
| **Mux**               | Alternative video hosting    | Better analytics, higher cost                                |
| **BunnyCDN**          | Media CDN + storage          | Cheaper than Cloudflare Stream for raw file delivery         |
| **Cloudflare Images** | Thumbnail CDN + resizing     | Automatic resizes at the edge, replaces on-the-fly transform |

**Recommended storage architecture:**

- Raw uploads → Cloudflare R2 (source of truth)
- Published video → Cloudflare Stream or BunnyCDN (delivery)
- Thumbnails → Cloudflare Images (served at edge, auto-resized)
- Assets URL pattern: `https://cdn.wavestack.io/assets/{orgId}/{assetId}/{filename}`

---

### Databases (managed)

| Service          | Purpose                    | Notes                                                  |
| ---------------- | -------------------------- | ------------------------------------------------------ |
| **Neon**         | Managed Postgres           | Serverless, branching for dev/staging, scales to zero  |
| **Supabase**     | Postgres + auth + realtime | Good if you want a managed auth layer                  |
| **Upstash**      | Managed Redis              | Serverless Redis, per-request pricing, global replicas |
| **Qdrant Cloud** | Alternative vector DB      | Better query performance than ChromaDB at scale        |
| **Pinecone**     | Hosted vector DB           | Simplest managed option if you drop ChromaDB           |

**Recommendation:** Neon + Upstash for managed prod. ChromaDB self-hosted on a small persistent RunPod or Fly.io instance until traffic justifies Qdrant/Pinecone.

---

### AI / LLM providers

| Service              | Model                     | Use case                                         |
| -------------------- | ------------------------- | ------------------------------------------------ |
| **OpenAI**           | GPT-4o / GPT-4o-mini      | Default reasoning + generation                   |
| **Anthropic**        | Claude Sonnet 4.6 / Haiku | Long context, coding, structured output          |
| **Together.ai**      | Llama 3.1 70B             | Cheap bulk generation                            |
| **Groq**             | Llama 3.1 70B             | Real-time companion chat (very fast)             |
| **Deepgram**         | Nova-2                    | Speech-to-text (faster/cheaper than Whisper API) |
| **AssemblyAI**       | Universal                 | Transcription + speaker diarization              |
| **ElevenLabs**       | Voice Clone               | Creator's voice for video narration / TTS        |
| **Replicate/Fal.ai** | SDXL, FLUX                | Thumbnail generation                             |
| **Perspective API**  | Toxicity                  | Auto-mod (free from Google)                      |

---

### Platform APIs

| Platform       | Auth method                 | Key limits                                            |
| -------------- | --------------------------- | ----------------------------------------------------- |
| YouTube        | OAuth 2.0                   | 10,000 quota units/day — manage carefully             |
| Instagram      | Meta Graph API, OAuth       | Rate limits per app, not per user                     |
| TikTok         | TikTok for Developers OAuth | Content Posting API required for video upload         |
| Facebook       | Meta Graph API              | Long-lived page tokens (60 days)                      |
| LinkedIn       | OAuth 2.0                   | 500 req/day per member, 100k/day per app              |
| Twitter/X      | OAuth 1.0a + 2.0            | Free tier: 1,500 posts/month per app — premium needed |
| Twitch         | OAuth 2.0 + EventSub        | EventSub for webhooks (replaces IRC pubsub)           |
| Discord        | Bot token + OAuth           | Gateway intents must be enabled in dev portal         |
| Streamlabs     | OAuth 2.0                   | Socket.IO for realtime alerts                         |
| StreamElements | JWT                         | WebSocket for overlay data                            |
| Patreon        | OAuth 2.0                   | Webhooks for pledge events                            |
| Stripe         | API key                     | Webhook signature verification required               |

---

### Payments & billing

| Service                    | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| **Stripe**                 | Subscriptions, usage-based billing, customer portal, invoices |
| **Stripe Metered Billing** | Per-clip, per-AI-token overage charges                        |

---

### Email & messaging

| Service       | Purpose                                             | Notes                           |
| ------------- | --------------------------------------------------- | ------------------------------- |
| **Resend**    | Transactional email (auth, notifications, invoices) | Best DX, generous free tier     |
| **Loops.so**  | Product marketing emails, onboarding sequences      | Creator-focused, good templates |
| **SendGrid**  | Bulk email for creators' own newsletters            | Already in .env.example         |
| **Mailchimp** | Alternative newsletter                              | Already in .env.example         |

---

### Observability

| Service                         | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| **Sentry**                      | Error tracking (frontend + backend)                     |
| **PostHog**                     | Product analytics + feature flags + session recording   |
| **Grafana + Prometheus**        | Service metrics (CPU, memory, queue depth, error rates) |
| **Loki**                        | Log aggregation (pairs with Grafana)                    |
| **Uptime Robot / BetterUptime** | External uptime monitoring                              |

---

### Edge & networking

| Service                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| **Cloudflare Workers** | Link router (short URLs at the edge, sub-ms redirects) |
| **Cloudflare Tunnel**  | Expose local dev to internet for webhook testing       |
| **Caddy**              | Reverse proxy + automatic HTTPS (already in infra/)    |

---

## 11. Deployment & compute

### Environments

| Environment    | Stack                             | Notes                                         |
| -------------- | --------------------------------- | --------------------------------------------- |
| **Local dev**  | Docker Compose                    | Full stack local, Ollama for LLMs             |
| **Staging**    | Fly.io or Railway                 | Cheap, easy deploy, Postgres + Redis included |
| **Production** | Hetzner Cloud + Coolify OR Fly.io | Hetzner is ~10× cheaper than AWS for VPS      |

### Service sizing (production starting point)

| Service               | Instance       | Replicas                 |
| --------------------- | -------------- | ------------------------ |
| core-app              | 2 vCPU, 2 GB   | 2 (behind load balancer) |
| analytics (Go)        | 2 vCPU, 1 GB   | 2                        |
| agent-orchestrator    | 4 vCPU, 4 GB   | 1 (scale on load)        |
| clipper               | 4 vCPU, 8 GB   | 1-3 (burst with RunPod)  |
| thumbnail-gen         | 2 vCPU, 2 GB   | 1 (RunPod for GPU work)  |
| bots (Discord/Twitch) | 1 vCPU, 512 MB | 1 each                   |
| PostgreSQL (Neon)     | Serverless     | managed                  |
| Redis (Upstash)       | Serverless     | managed                  |

### RunPod workflow

```
1. User requests a clip or thumbnail
   ↓
2. core-app enqueues BullMQ job
   ↓
3. clipper/thumbnail service picks up job
   ↓
4. Service calls RunPod Serverless API:
   POST https://api.runpod.ai/v2/{endpoint_id}/run
   { "input": { "video_url": "...", "start": 0, "end": 30 } }
   ↓
5. Poll for result or use webhook callback
   ↓
6. Download output to Cloudflare R2
   ↓
7. Update asset record, send notification
```

```
RunPod endpoint IDs (store in env):
  RUNPOD_ENDPOINT_WHISPER=xxxx
  RUNPOD_ENDPOINT_SDXL=xxxx
  RUNPOD_ENDPOINT_FFMPEG=xxxx
  RUNPOD_ENDPOINT_TRAINING=xxxx
  RUNPOD_API_KEY=xxxx
```

---

## 12. Things not to forget

These are easy to overlook and expensive to retrofit.

### Auth & security

- [ ] Refresh token rotation (issue new refresh + revoke old on each use)
- [ ] Rate limiting on all public endpoints (already partially done — extend per-IP + per-org)
- [ ] OAuth state parameter (CSRF protection on platform OAuth callbacks)
- [ ] Encrypt platform tokens at rest (AES-256 via a key stored in env, not in DB)
- [ ] API key hashing (store `sha256(key)` in DB, show full key only once on creation)
- [ ] CORS configured properly (not `*`) before first public release
- [ ] Content Security Policy headers on core-app responses

### Platform quota management

- [ ] YouTube quota tracker (10k units/day shared across org — uploads cost 1600 units)
- [ ] Exponential back-off on all platform API calls (429 handling)
- [ ] Queue platform jobs with a per-platform concurrency limit (don't hammer one platform)
- [ ] Store platform API rate limit headers and respect them

### Data integrity

- [ ] Idempotency on all write endpoints (already started in queue — extend everywhere)
- [ ] Soft deletes everywhere (deleted_at) so data can be recovered
- [ ] Outbox pattern for publishing events (prevent double-publish if service crashes mid-job)
- [ ] Database migrations versioned via Prisma — never raw SQL changes in production

### User experience

- [ ] Onboarding flow backend: track completion state (`onboarding_step`, `onboarding_completed_at`)
- [ ] First-run wizard: connect first platform → create first queue item
- [ ] Platform connection health check (run on every login, surface broken tokens)
- [ ] Content duplicate detection (don't let the same asset be queued to the same platform twice)

### Content pipeline

- [ ] Aspect ratio reformatting for every target platform on upload (16:9 → 9:16 → 1:1)
- [ ] Automatic subtitle generation on every uploaded video (Whisper, stored as VTT + JSON)
- [ ] Subtitle burn-in option when reformatting (for TikTok/Reels auto-play)
- [ ] Maximum duration enforcement per platform (TikTok: 3 min, Reels: 15 min, Shorts: 60s)
- [ ] File size limits per platform (Instagram: 4 GB, TikTok: 287.6 MB)
- [ ] Thumbnail generation fallback (frame extract if AI generation fails)

### AI & agents

- [ ] Token usage metering per org (feed into billing module)
- [ ] LLM response caching (cache identical prompts for 24h — saves cost on repeated requests)
- [ ] Prompt injection protection on all user-supplied inputs to LLMs
- [ ] Agent memory TTL (auto-purge memories older than `MEMORY_RETENTION_DAYS`)
- [ ] Approval expiry handling (auto-cancel tasks if not approved in time)
- [ ] Graceful degradation (if OpenAI is down, fallback to Anthropic, then Ollama)

### Analytics

- [ ] Platform data sync scheduler (cron: pull YouTube/TikTok stats every 6h)
- [ ] Historical backfill on initial platform connect (pull last 90 days of data)
- [ ] Anomaly detection (spike/drop alerts via notifications)
- [ ] Data export (CSV download of all analytics data — GDPR requirement)

### Teams & multi-tenancy

- [ ] Role-based access enforced at the DB query level (all queries include org_id filter)
- [ ] Team invite system (email invite → accept → join org)
- [ ] Per-user permission grants (already in frontend — need backend to enforce)
- [ ] Audit log on every mutating action (already planned — don't skip this)
- [ ] Agency mode: one user account managing multiple orgs (super-org concept)

### Compliance & legal

- [ ] GDPR: data export endpoint (`GET /api/me/export` — returns JSON of all user data)
- [ ] GDPR: account deletion (`DELETE /api/me` — purge all PII, anonymize audit logs)
- [ ] COPPA: no data collection for users under 13 (age gate on signup)
- [ ] Platform ToS compliance: auto-publishing must respect each platform's rules (no spam, rate limits)
- [ ] Stripe tax handling (Stripe Tax or manual VAT handling for EU users)

### Resilience

- [ ] Health check endpoints on every service (`GET /health` → `{ status: "ok", db: "ok", redis: "ok" }`)
- [ ] Graceful shutdown handlers (drain in-flight requests, close DB connections)
- [ ] Dead letter queue (DLQ) for failed BullMQ jobs — review failed jobs in UI
- [ ] Circuit breaker on all outbound HTTP calls to third-party services
- [ ] Postgres connection pooling via PgBouncer (especially if using Neon serverless)

### Missing services (not yet created)

- [ ] **Uploader service** — signed URL generation, chunked upload, post-upload trigger
- [ ] **Link router** — short URLs, UTM tracking, click analytics
- [ ] **Streaming overlays service** — serve browser source HTML for OBS overlays
- [ ] **Competitor tracker** — monitor competitor channels, surface their trending content
- [ ] **Comment responder** — draft AI replies to YouTube/TikTok comments, push for approval
- [ ] **DM automator** — auto-reply to Instagram/Twitter DMs using AI Personality
- [ ] **Transcription service** — dedicated Whisper worker (or route to RunPod/Deepgram)
- [ ] **n8n workflow bridge** — expose WaveStack events as n8n triggers, WaveStack actions as n8n nodes

### Monitoring checklist

- [ ] Alert when BullMQ queue depth > 1000 (something is stuck)
- [ ] Alert when any service is down (health check failures)
- [ ] Alert when platform token expires within 7 days
- [ ] Alert when YouTube quota usage > 80% of daily limit
- [ ] Alert when RunPod endpoint cold-start takes > 30s (use warmup pings)
- [ ] Dashboard for token usage, queue throughput, error rate per service

---

> **Rule of thumb:** If the frontend can see it, the backend must validate it. If it crosses an org boundary, the query must include `orgId`. If it calls an LLM, meter it. If it touches a platform API, rate-limit it.
