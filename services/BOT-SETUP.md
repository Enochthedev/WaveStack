# 🤖 WaveStack Bots Setup Guide

Complete guide for setting up and running all WaveStack bots and integrations.

---

## 📦 Services Overview

WaveStack includes three main bot services:

1. **Discord Bot** - Full-featured community bot with games, economy, and stream alerts
2. **Twitch Bot** - Chat bot with clip creation, moderation, and OBS control
3. **Social Ingest** - Data collection and normalization from all platforms

Plus integrations for:
- **OBS Studio** (stream control)
- **Streamlabs** (alerts and donations)
- **StreamElements** (tips and overlays)

---

## 🚀 Quick Start

### 1. Discord Bot

#### Prerequisites
- Discord Application created at [Discord Developer Portal](https://discord.com/developers/applications)
- Bot token and client ID
- Server (guild) ID where the bot will operate

#### Setup
```bash
cd services/discord-bot

# Install dependencies
pnpm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Discord tokens

# Deploy slash commands
pnpm deploy-commands

# Start bot
pnpm dev
```

#### Required Environment Variables
```bash
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-server-id

# WaveStack API
WAVESTACK_API_URL=http://localhost:3000
WAVESTACK_CLIENT_ID=discord-bot-service
WAVESTACK_CLIENT_SECRET=your-secret

# Stream monitoring
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-secret
TWITCH_CHANNEL_NAME=your-channel

# Channels
CLIP_CHANNEL_ID=channel-for-clips
STREAM_ALERT_CHANNEL_ID=channel-for-stream-alerts
WELCOME_CHANNEL_ID=channel-for-welcomes
```

#### Commands
- `/clip [duration] [offset] [title]` - Create stream clip
- `/trivia [category]` - Play trivia game
- `/giveaway <prize> <duration> [winners]` - Start giveaway
- `/points [user]` - Check points
- `/daily` - Claim daily reward
- `/leaderboard [type]` - View leaderboard

#### Features
- ✅ Slash commands
- ✅ Economy system (points, levels, daily rewards)
- ✅ Mini-games (trivia, giveaways)
- ✅ Stream alerts (Twitch + YouTube)
- ✅ Clip creation and posting
- ✅ Auto-moderation (spam, links, bad words)
- ✅ Welcome messages and auto-roles

---

### 2. Twitch Bot

#### Prerequisites
- Twitch account for the bot
- OAuth token from [Twitch Token Generator](https://twitchtokengenerator.com/)
- Twitch application for API access

#### Setup
```bash
cd services/twitch-bot

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your Twitch credentials

# Start bot
pnpm dev
```

#### Required Environment Variables
```bash
# Twitch IRC
TWITCH_BOT_USERNAME=your-bot-name
TWITCH_BOT_OAUTH=oauth:your-token-here
TWITCH_CHANNEL=your-channel

# Twitch API
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret

# WaveStack
WAVESTACK_API_URL=http://localhost:3000
WAVESTACK_CLIENT_ID=twitch-bot-service
WAVESTACK_CLIENT_SECRET=your-secret

# OBS (optional)
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=your-obs-password
```

#### Commands
- `!clip [duration] [offset]` - Create clip from stream
- `!points [user]` - Check points
- `!leaderboard` - View top chatters
- `!settitle <new title>` - Change stream title (mod only)
- `!setgame <game>` - Change stream category (mod only)
- `!so <user>` - Shoutout another streamer
- `!poll <question> | <opt1> | <opt2>` - Create poll
- `!raid <channel>` - Start raid (broadcaster only)
- `!scene <name>` - Switch OBS scene (mod only)
- `!startstream` - Start OBS stream (mod only)

#### Features
- ✅ Chat commands with cooldowns
- ✅ Clip creation and auto-posting
- ✅ Point economy system
- ✅ Auto-clip detection (chat keywords)
- ✅ Moderation (spam, links, caps)
- ✅ Event responses (subs, raids, bits)
- ✅ OBS WebSocket control
- ✅ Stream title/game management

---

### 3. Social Ingest Service

#### Purpose
Collects and normalizes data from Discord, Twitch, YouTube, and Twitter/X into a unified format for analytics.

#### Setup
```bash
cd services/social-ingest

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Run database migrations
pnpm prisma migrate dev --name init

# Start service
pnpm dev
```

#### API Endpoints
- `GET /api/v1/messages` - Get messages (filtered by platform, channel, user)
- `GET /api/v1/events` - Get platform events
- `GET /api/v1/analytics/user/:userId` - Get user analytics
- `GET /api/v1/analytics/channel/:channelId` - Get channel analytics
- `GET /api/v1/search?q=query` - Search messages
- `GET /api/v1/leaderboard` - Get leaderboard

#### Features
- ✅ Real-time Discord message ingestion
- ✅ Twitch IRC chat ingestion
- ✅ YouTube live chat polling
- ✅ Message normalization across platforms
- ✅ User analytics (message count, activity patterns)
- ✅ Channel analytics (peak viewers, top users)
- ✅ Search and leaderboards

---

## 🔧 OBS Integration

### Setup OBS WebSocket

1. Install OBS Studio (v28+)
2. Tools → WebSocket Server Settings
3. Enable WebSocket server
4. Set password
5. Note the port (default: 4455)

### Configuration
```bash
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=your-password
```

### Available Controls
- Switch scenes
- Show/hide sources
- Start/stop stream
- Start/stop recording
- Get stream stats
- Control filters

---

## 📡 Streaming Platform Integrations

### Streamlabs

#### Setup
1. Get API token from [Streamlabs Dashboard](https://streamlabs.com/dashboard#/settings/api-settings)
2. Add to environment:
```bash
STREAMLABS_TOKEN=your-token
```

#### Features
- ✅ Donation alerts
- ✅ Follow notifications
- ✅ Subscription events
- ✅ Bits/cheers tracking
- ✅ Real-time WebSocket connection

### StreamElements

#### Setup
1. Get JWT token and Account ID from [StreamElements Dashboard](https://streamelements.com/dashboard/account/channels)
2. Add to environment:
```bash
STREAMELEMENTS_ACCOUNT_ID=your-account-id
STREAMELEMENTS_JWT_TOKEN=your-jwt
```

#### Features
- ✅ Tip/donation alerts
- ✅ Merch purchase notifications
- ✅ Store integration
- ✅ Leaderboard API
- ✅ Overlay updates

---

## 🐳 Docker Compose Setup

Run all services together:

```bash
# Start all bots and services
docker-compose --profile bots up -d

# View logs
docker-compose logs -f discord-bot twitch-bot social-ingest

# Stop all
docker-compose down
```

### docker-compose.yml (add to existing)
```yaml
# Discord Bot
discord-bot:
  build: ./services/discord-bot
  env_file:
    - ./services/discord-bot/.env
  depends_on:
    - redis
    - core-app
  restart: unless-stopped
  profiles: ["bots"]

# Twitch Bot
twitch-bot:
  build: ./services/twitch-bot
  env_file:
    - ./services/twitch-bot/.env
  depends_on:
    - redis
    - core-app
  restart: unless-stopped
  profiles: ["bots"]

# Social Ingest
social-ingest:
  build: ./services/social-ingest
  ports:
    - "8100:8100"
  env_file:
    - ./services/social-ingest/.env
  depends_on:
    - postgres
    - redis
  restart: unless-stopped
  profiles: ["bots"]
```

---

## 🧪 Testing

### Test Discord Bot
```bash
# In Discord server
/clip
/trivia
/daily
/points
/leaderboard
```

### Test Twitch Bot
```bash
# In Twitch chat
!clip
!points
!leaderboard
!so username
```

### Test APIs
```bash
# Test social-ingest
curl http://localhost:8100/health
curl http://localhost:8100/api/v1/messages?platform=twitch&limit=10
curl http://localhost:8100/api/v1/leaderboard?platform=discord
```

---

## 🔐 Security Best Practices

### Tokens and Secrets
- ✅ Never commit tokens to git
- ✅ Use environment variables
- ✅ Rotate tokens regularly
- ✅ Use different tokens for dev/prod
- ✅ Restrict bot permissions to minimum needed

### Permissions

#### Discord Bot Permissions
- Read Messages
- Send Messages
- Manage Messages (for moderation)
- Add Reactions
- Use Slash Commands
- Manage Roles (for auto-roles)

#### Twitch Bot Permissions
- chat:read
- chat:edit
- channel:moderate
- channel:manage:broadcast (for title/game)

---

## 📊 Monitoring and Logs

### View Bot Logs
```bash
# Discord bot
docker-compose logs -f discord-bot

# Twitch bot
docker-compose logs -f twitch-bot

# Social ingest
docker-compose logs -f social-ingest
```

### Health Checks
All services expose health endpoints:
- Discord Bot: Internal health monitoring
- Twitch Bot: Reconnection handling
- Social Ingest: `GET /health`

### Metrics
- Message counts per platform
- Command usage statistics
- User engagement metrics
- Stream uptime and viewer counts

---

## 🐛 Troubleshooting

### Discord Bot Issues

**Bot not responding to commands**
- Check bot is online in Discord
- Verify slash commands were deployed
- Check bot has correct permissions
- View logs for errors

**Stream alerts not working**
- Verify Twitch/YouTube API credentials
- Check stream alert channel ID is correct
- Ensure bot can send messages in that channel

### Twitch Bot Issues

**Bot not connecting to chat**
- Verify OAuth token is valid (regenerate if needed)
- Check bot username is correct
- Ensure channel name is lowercase

**Commands not working**
- Check command prefix matches (!clip vs /clip)
- Verify user has required permissions (mod, VIP)
- Check cooldowns haven't been hit

**OBS commands failing**
- Verify OBS is running
- Check WebSocket is enabled in OBS
- Verify password and port are correct
- Ensure no firewall blocking connection

### Social Ingest Issues

**Messages not being ingested**
- Check database connection
- Verify platform credentials
- Check for rate limiting
- View service logs for errors

**API not responding**
- Verify service is running (docker-compose ps)
- Check port 8100 is accessible
- Ensure database migrations ran

---

## 🚀 Production Deployment

### Recommendations
1. Use environment-specific configs
2. Set up proper logging (Grafana, Loki)
3. Monitor resource usage
4. Set up alerts for bot downtime
5. Regular database backups
6. Use PM2 or Docker restart policies

### Scaling
- Run multiple bot instances behind load balancer
- Use Redis for shared state
- Separate read/write database replicas
- Cache frequently accessed data

---

## 📚 Additional Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)
- [OBS WebSocket Protocol](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)
- [WaveStack API Documentation](../docs/API.md)

---

## 💡 Tips and Tricks

### Discord Bot
- Use ephemeral replies for errors to reduce clutter
- Implement command cooldowns to prevent spam
- Cache frequently used data in Redis
- Use embeds for rich formatting

### Twitch Bot
- Implement exponential backoff for reconnections
- Rate limit API calls to avoid Twitch bans
- Store clip URLs in database for history
- Use TMI.js message queue for burst protection

### General
- Monitor Redis memory usage
- Use database indexes for common queries
- Implement proper error handling
- Log important events for debugging
- Test thoroughly before going live

---

**Your bots are ready to automate your creator workflow!** 🎉
