# Bot Integration Readiness Guide

## Overview

This document outlines the current state and requirements for Discord and Twitch bot integration in WaveStack. Both bots are part of the core vision but require implementation.

---

## ✅ Prerequisites (Already in Place)

### Infrastructure Ready
- ✅ **Authentication System** - JWT-based auth with org_id support
- ✅ **Queue System** - BullMQ for async job processing
- ✅ **Database** - PostgreSQL with Prisma ORM
- ✅ **Video Clipping** - Functional clipper service for highlight generation
- ✅ **API Gateway** - Nginx with auth validation
- ✅ **Workflow Engine** - n8n available for platform integrations

### API Endpoints Available
- ✅ `/api/queue/v1/queue` - Enqueue content for publishing
- ✅ `/api/auth/token` - Generate service tokens
- ✅ `/api/clipper/v1/clip` - Create video clips
- ✅ `/api/clipper/v1/status/:id` - Check clip status

---

## 🚧 What Needs to Be Built

### 1. Discord Bot Service

#### Core Features (from Plans.md)
- [ ] Automated welcome messages and role assignments
- [ ] Moderation tools (message filtering, user muting)
- [ ] Integration with social-ingest service for updates
- [ ] Custom commands for streamer schedules, announcements, polls
- [ ] Slash commands and interactive components
- [ ] Logging and analytics

#### Technical Requirements
```
Service Name: discord-bot
Language: Node.js/TypeScript (recommended) or Python
Framework: discord.js or discord.py
```

#### Environment Variables Needed
```bash
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_CLIENT_ID=<client-id>
DISCORD_GUILD_ID=<server-id>
WAVESTACK_API_URL=http://core-app:3000
WAVESTACK_CLIENT_ID=discord-bot-service
WAVESTACK_CLIENT_SECRET=<generated-secret>
```

#### Integration Points
1. **Clip Sharing** - Post auto-clipped highlights to Discord channels
2. **Queue Management** - Queue clips for publishing from Discord commands
3. **Auth** - Use core-app `/api/auth/token` for service auth
4. **Webhooks** - Receive events from core-app (clip ready, publish complete)

#### Example Commands
```
/clip <start_time> <duration> - Create a clip from current stream
/schedule <title> <platforms> - Schedule content for publishing
/highlights - View recent auto-clips
/stats - Show channel statistics
```

---

### 2. Twitch Bot Service

#### Core Features (from Plans.md)
- [ ] Chat commands for information and mini-games
- [ ] Moderation (spam detection, timeout enforcement)
- [ ] Integration with social-ingest and Discord bot
- [ ] Channel point redemptions and custom alerts
- [ ] Real-time viewer engagement analytics

#### Technical Requirements
```
Service Name: twitch-bot
Language: Node.js/TypeScript or Go
Framework: tmi.js (Node) or gempir/go-twitch-irc (Go)
```

#### Environment Variables Needed
```bash
TWITCH_BOT_USERNAME=<bot-username>
TWITCH_BOT_TOKEN=<oauth-token>
TWITCH_CHANNEL=<channel-name>
TWITCH_CLIENT_ID=<client-id>
TWITCH_CLIENT_SECRET=<client-secret>
WAVESTACK_API_URL=http://core-app:3000
WAVESTACK_CLIENT_ID=twitch-bot-service
WAVESTACK_CLIENT_SECRET=<generated-secret>
```

#### Integration Points
1. **Auto-Clipping** - Trigger clips via chat commands (!clip)
2. **Highlight Detection** - Use AI/keywords to detect highlight moments
3. **Cross-Posting** - Notify Discord when clips are created
4. **Queue Integration** - Auto-queue clips for YouTube/Instagram/X

#### Example Chat Commands
```
!clip - Create a 30-second clip of the last moment
!clip 60 - Create a 60-second clip
!highlights - Show recent clips
!schedule - Show upcoming streams
!commands - List all bot commands
```

---

### 3. Social-Ingest Service

This service normalizes data from Discord, Twitch, and other platforms. It's a prerequisite for advanced bot features.

#### Purpose
- Normalize chat messages, events, and interactions
- Store engagement metrics (viewers, messages, emotes)
- Provide unified API for analytics
- Feed AI training pipeline

#### Data Models Needed
```prisma
model ChatMessage {
  id          String   @id @default(cuid())
  platform    String   // "discord", "twitch", "youtube"
  channelId   String   // Platform-specific channel ID
  userId      String   // Platform-specific user ID
  username    String
  message     String
  timestamp   DateTime
  metadata    Json     // Platform-specific data
}

model StreamEvent {
  id          String   @id @default(cuid())
  platform    String
  channelId   String
  eventType   String   // "stream_start", "raid", "subscription", etc.
  timestamp   DateTime
  metadata    Json
}
```

---

## 📋 Implementation Roadmap

### Phase 1: Basic Discord Bot (Est. 2-3 days)
1. Create `services/discord-bot` directory
2. Set up discord.js with slash commands
3. Implement `/clip` command that calls clipper API
4. Implement `/highlights` command to list recent clips
5. Add bot to Docker Compose
6. Document setup in README

### Phase 2: Basic Twitch Bot (Est. 2-3 days)
1. Create `services/twitch-bot` directory
2. Set up tmi.js for chat connection
3. Implement `!clip` chat command
4. Implement `!highlights` command
5. Add bot to Docker Compose
6. Document Twitch OAuth setup

### Phase 3: Social-Ingest Service (Est. 3-4 days)
1. Create `services/social-ingest` directory
2. Add Prisma models for chat/events
3. Implement Discord message ingestion
4. Implement Twitch chat ingestion
5. Create analytics endpoints
6. Connect bots to ingest service

### Phase 4: Advanced Features (Est. 1-2 weeks)
1. Auto-highlight detection (AI/keyword-based)
2. Cross-platform notifications (Discord ↔ Twitch)
3. Moderation tools (spam, NSFW filtering)
4. Channel point redemptions
5. Engagement analytics dashboard

---

## 🔌 API Integration Examples

### Authenticate Bot Service
```bash
curl -X POST http://core-app:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "discord-bot-service",
    "client_secret": "secret-here",
    "scope": "clip:create clip:read queue:write"
  }'
```

### Create Clip from Bot
```bash
curl -X POST http://clipper:8000/api/v1/clip \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://twitch.tv/videos/123456789",
    "start_sec": 120,
    "duration_sec": 30,
    "out_ext": "mp4"
  }'
```

### Queue Clip for Publishing
```bash
curl -X POST http://core-app:3000/api/queue/v1/queue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: clip-123-publish" \
  -d '{
    "projectId": "proj_default",
    "assetId": "asset_abc123",
    "title": "Epic Moment from Stream!",
    "caption": "Check out this highlight #gaming #twitch",
    "platforms": ["youtube", "x"]
  }'
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Command parsing and validation
- [ ] API client integration
- [ ] Error handling and retries

### Integration Tests
- [ ] Bot connects to Discord/Twitch
- [ ] Commands trigger API calls correctly
- [ ] Auth tokens are refreshed properly

### End-to-End Tests
- [ ] User runs `/clip` → clip is created → notification sent
- [ ] Twitch chat `!clip` → Discord notification with link
- [ ] Auto-highlight detection → clip created → queued for YouTube

---

## 📝 Configuration Files Needed

### services/discord-bot/.env.example
```bash
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-server-id
WAVESTACK_API_URL=http://core-app:3000
WAVESTACK_CLIENT_ID=discord-bot-service
WAVESTACK_CLIENT_SECRET=change-me
LOG_LEVEL=info
```

### services/twitch-bot/.env.example
```bash
TWITCH_BOT_USERNAME=your-bot-username
TWITCH_BOT_TOKEN=oauth:your-token-here
TWITCH_CHANNEL=your-channel-name
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
WAVESTACK_API_URL=http://core-app:3000
WAVESTACK_CLIENT_ID=twitch-bot-service
WAVESTACK_CLIENT_SECRET=change-me
LOG_LEVEL=info
```

---

## 🎯 Success Criteria

### Discord Bot
- ✅ Bot is online and responds to `/ping`
- ✅ `/clip` command creates clip via API
- ✅ Bot posts clip URL to channel
- ✅ Slash commands are discoverable

### Twitch Bot
- ✅ Bot connects to Twitch IRC
- ✅ `!clip` command works in chat
- ✅ Bot responds with clip link
- ✅ Commands have proper cooldowns

### Integration
- ✅ Discord bot notifies when Twitch stream starts
- ✅ Twitch clip auto-posts to Discord
- ✅ Both bots use core-app auth
- ✅ Analytics data flows to social-ingest

---

## 📚 Resources

### Discord
- [discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Slash Commands Guide](https://discord.com/developers/docs/interactions/application-commands)

### Twitch
- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)
- [tmi.js Documentation](https://github.com/tmijs/tmi.js)
- [Twitch IRC Guide](https://dev.twitch.tv/docs/irc)

### WaveStack APIs
- Core App: `http://core-app:3000/api`
- Clipper: `http://clipper:8000/api`
- JWKS: `http://core-app:3000/.well-known/jwks.json`

---

## 🚀 Next Steps

1. **Choose Implementation Language** - Node.js/TypeScript recommended for both bots
2. **Register Bot Applications** - Create apps in Discord/Twitch developer portals
3. **Start with Discord Bot** - Simpler API, faster to implement
4. **Add Twitch Bot** - Leverage learnings from Discord implementation
5. **Build Social-Ingest** - Once bots are functional
6. **Add AI Features** - Auto-highlight detection, sentiment analysis

---

## ✅ Current Status

- **Infrastructure**: ✅ Ready (auth, queue, DB, clipper)
- **API Integration Points**: ✅ Available
- **Bot Services**: ❌ Not implemented yet
- **Social-Ingest**: ❌ Not implemented yet
- **Documentation**: ✅ This guide

**Estimated Time to MVP**: 1-2 weeks for basic bot functionality

---

*This document should be updated as bot services are implemented.*
