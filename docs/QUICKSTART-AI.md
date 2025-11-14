# WaveStack AI Personality - Quick Start Guide

Get your AI personality clone running in under 10 minutes!

## Prerequisites

- Docker and Docker Compose installed
- OpenAI API key OR Anthropic API key
- Bot tokens (Discord, Twitch, Telegram, WhatsApp - optional)

## Step 1: Clone and Configure

```bash
# Clone the repository (if not already done)
git clone https://github.com/yourusername/WaveStack.git
cd WaveStack

# Copy environment file
cp .env.example .env
```

## Step 2: Add Your API Keys

Edit `.env` and add at minimum:

```env
# Choose your AI provider
AI_PROVIDER=openai

# Add your API key
OPENAI_API_KEY=sk-your-openai-key-here

# OR use Anthropic
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Set your user ID (any string)
CREATOR_USER_ID=my_user_id
```

## Step 3: Start Core Services

```bash
# Start just the core AI services
docker-compose up -d postgres redis chromadb ai-personality
```

Wait for services to be ready (~30 seconds):

```bash
docker-compose logs -f ai-personality
# Wait for: "🎉 AI Personality Service running on 0.0.0.0:8200"
```

## Step 4: Test the AI

```bash
# Generate a response
curl -X POST http://localhost:8200/api/v1/personality/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "my_user_id",
    "message": "Hey, how are you doing today?",
    "platform": "test"
  }'
```

You should get a response! 🎉

## Step 5: Add Bot Tokens (Optional)

To connect bots, add tokens to `.env`:

```env
# Discord
DISCORD_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-client-id

# Twitch
TWITCH_BOT_USERNAME=your-bot-username
TWITCH_OAUTH_TOKEN=oauth:your-token
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
TWITCH_CHANNELS=your_channel

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Twitter (for auto-posting)
TWITTER_API_KEY=your-api-key
TWITTER_API_SECRET=your-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_SECRET=your-access-secret
TWITTER_BEARER_TOKEN=your-bearer-token
```

## Step 6: Start the Bots

```bash
# Start all services
docker-compose up -d

# Or start specific bots
docker-compose up -d discord-bot twitch-bot telegram-bot
```

For WhatsApp:

```bash
docker-compose up whatsapp-bot

# Scan the QR code that appears with your phone
# Press Ctrl+C after authentication, then:
docker-compose up -d whatsapp-bot
```

## Step 7: Train Your AI

The AI learns from your conversations automatically! Talk naturally on any platform and it will:

1. **Collect** messages from Discord, Twitch, Telegram, WhatsApp
2. **Analyze** your writing style, vocabulary, and personality
3. **Store** important facts and preferences as memories
4. **Generate** responses that sound like you

Check your training progress:

```bash
curl http://localhost:8200/api/v1/learning/stats/my_user_id
```

## Step 8: Generate Your First Tweet

```bash
# Generate a tweet
curl -X POST http://localhost:8200/api/v1/content/generate/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "my_user_id"
  }'
```

The tweet will be in **draft** status. Review it in the database or build a review UI!

## Step 9: Enable Auto-Posting (Carefully!)

**⚠️ Warning:** Only enable after reviewing many generated tweets!

```env
# In .env
AUTO_POST_ENABLED=true
TWITTER_POST_INTERVAL=60  # Post every 60 minutes
```

Restart the Twitter autoposter:

```bash
docker-compose restart twitter-autoposter
```

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ai-personality
docker-compose logs -f discord-bot
docker-compose logs -f twitter-autoposter
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart ai-personality
```

### Stop Everything

```bash
docker-compose down
```

### Update After Code Changes

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Accessing Services

- **AI Personality API:** http://localhost:8200
  - Docs: http://localhost:8200/docs
  - Health: http://localhost:8200/health

- **Core App:** http://localhost:3000

- **Clipper:** http://localhost:8000

- **Social Ingest:** http://localhost:8100

- **n8n:** http://localhost:5678
  - Username: admin
  - Password: changeme (change in .env)

- **ChromaDB:** http://localhost:8000

## Bot Commands

### Discord

- `/clip <url> <start> <duration>` - Create clip
- `/trivia` - Start trivia
- `/giveaway` - Run giveaway
- `/points` - Check points
- `/daily` - Daily reward

### Twitch

- `!clip` - Create clip
- `!points` - Check points
- `!title <new title>` - Update title
- `!game <game>` - Update game
- `!shoutout @user` - Shoutout
- `!obs <scene>` - Control OBS

### Telegram

- `/clip` - Create clip
- `/ask <question>` - Ask AI
- `/chat` - Chat with AI
- `/vibe` - Vibe check
- `/points` - Check points

### WhatsApp

- `!help` - Show commands
- `!ask <question>` - Ask AI
- `!vibe` - Vibe check
- `!stats` - Bot statistics

## Monitoring

### Check Service Health

```bash
# AI Personality
curl http://localhost:8200/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "ai-personality",
#   "version": "1.0.0",
#   "ai_provider": "openai",
#   "features": {
#     "auto_respond": true,
#     "sentiment_filtering": true,
#     "controversy_avoidance": true
#   }
# }
```

### Check Learning Stats

```bash
curl http://localhost:8200/api/v1/learning/stats/my_user_id
```

### View Database

```bash
# Connect to Postgres
docker-compose exec postgres psql -U postgres -d wave

# View tables
\dt

# View personality profiles
SELECT * FROM personality_profiles;

# View memories
SELECT * FROM memories ORDER BY importance DESC LIMIT 10;

# View generated content
SELECT * FROM generated_content ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### AI not responding

**Check logs:**
```bash
docker-compose logs -f ai-personality
```

**Common issues:**
- Invalid API key - check `.env`
- Out of credits - check OpenAI/Anthropic dashboard
- Service not started - `docker-compose up -d ai-personality`

### Bot not connecting

**Discord:**
- Check token is valid
- Check bot has proper permissions in server
- Check bot is in the server

**Twitch:**
- OAuth token must start with `oauth:`
- Bot must be moderator in channel
- Channel name must be lowercase

**Telegram:**
- Check token with https://api.telegram.org/bot<TOKEN>/getMe
- Make sure bot is not blocked

**WhatsApp:**
- QR code expired - restart service and scan again
- `docker-compose restart whatsapp-bot`

### Memory not persisting

**Check volumes:**
```bash
docker volume ls | grep wavestack

# Should see:
# - wavestack_postgres_data
# - wavestack_redis_data
# - wavestack_chroma_data
# - wavestack_whatsapp_auth
```

### High memory usage

**Reduce context window:**
```env
CONTEXT_WINDOW=10  # Down from 20
PERSONALITY_MAX_TOKENS=300  # Down from 500
```

**Use smaller model:**
```env
OPENAI_MODEL=gpt-3.5-turbo  # Instead of gpt-4
# Or
ANTHROPIC_MODEL=claude-3-haiku-20240307  # Instead of sonnet
```

## Next Steps

1. **Read the full guide:** `docs/AI-PERSONALITY-GUIDE.md`
2. **Train your AI** with 1000+ messages for good results
3. **Review generated content** before enabling auto-posting
4. **Set up n8n workflows** for advanced automation
5. **Customize bot commands** in each bot's `src/commands/` folder

## Getting Help

- **Documentation:** Check `docs/` folder
- **Issues:** Open issue on GitHub
- **Logs:** Always include logs when asking for help

---

**Pro Tip:** The AI gets better over time! Feed it more conversations and review the generated content to improve quality.

Enjoy your AI clone! 🤖✨
