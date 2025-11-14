# WaveStack AI Personality System Guide

## Overview

The WaveStack AI Personality System is a comprehensive platform that creates a digital clone of you. It learns from your conversations across all platforms, responds in your voice, and can even post content on your behalf.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Sources                           │
│   Discord │ Twitch │ Telegram │ WhatsApp │ Twitter │ Streams │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Personality Service (Python)                 │
│  • Personality Engine (GPT-4/Claude)                        │
│  • Memory Manager (ChromaDB + Sentence Transformers)         │
│  • Content Generator (VADER Sentiment)                       │
│  • Learning Pipeline (Continuous Learning)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Output Channels                             │
│   Auto-Responses │ Twitter Posts │ Content Review │ n8n      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. AI Personality Service (Python/FastAPI)

**Location:** `services/ai-personality-py/`

**Purpose:** Core ML service that generates responses in your voice

**Key Features:**
- **Personality Engine:** Generates responses using OpenAI GPT-4 or Anthropic Claude
- **Memory Manager:** Stores and retrieves long-term memories with semantic search
- **Content Generator:** Creates tweets/posts with sentiment filtering
- **Learning Pipeline:** Continuously learns from all platforms

**API Endpoints:**
- `POST /api/v1/personality/generate` - Generate response in your voice
- `POST /api/v1/personality/learn` - Add message to training data
- `POST /api/v1/memory/store` - Store a memory
- `POST /api/v1/memory/retrieve` - Get relevant memories
- `POST /api/v1/content/generate/tweet` - Generate a tweet
- `POST /api/v1/learning/train/batch` - Submit batch training data

**Technology Stack:**
- FastAPI for async API
- OpenAI GPT-4 / Anthropic Claude for generation
- ChromaDB for vector embeddings
- Sentence-transformers for semantic search
- VADER for sentiment analysis
- Prisma for database access
- Redis for caching

### 2. Twitter Auto-Poster (Python)

**Location:** `services/twitter-autoposter/`

**Purpose:** Automatically posts AI-generated content to Twitter

**Key Features:**
- Auto-generates tweets using AI personality
- Scheduled posting with approval workflow
- Sentiment filtering and controversy avoidance
- Analytics tracking
- Rate limit handling
- Content buffer (maintains 5 tweet queue)

**Configuration:**
```env
TWITTER_POST_INTERVAL=60        # Minutes between cycles
AUTO_GENERATE_TWEETS=true       # Auto-generate new tweets
AUTO_POST_ENABLED=false         # Enable auto-posting (default: false for safety)
```

**Workflow:**
1. AI generates tweet → Draft status
2. (Optional) Human reviews → Approved/Rejected
3. Approved content → Scheduled
4. Auto-poster posts at scheduled time → Posted

### 3. Bot Ecosystem

All bots integrate with the AI personality service to respond in your voice.

#### Discord Bot (TypeScript)

**Location:** `services/discord-bot/`

**Commands:**
- `/clip` - Create video clips
- `/trivia` - Start trivia game
- `/giveaway` - Run giveaways
- `/points` - Check points
- `/daily` - Daily reward
- `/leaderboard` - Top users

**Features:**
- Stream monitoring and alerts
- Economy system with points
- Mini-games (trivia, giveaways)
- Auto-moderation
- AI personality responses

#### Twitch Bot (TypeScript)

**Location:** `services/twitch-bot/`

**Commands:**
- `!clip` - Create clip
- `!points` - Check points
- `!title` - Update stream title
- `!game` - Update game
- `!shoutout @user` - Shoutout
- `!poll` - Create poll
- `!obs scene` - Control OBS

**Features:**
- OBS WebSocket integration
- Auto-clip detection
- Stream control
- Event responses (subs, raids, bits)
- AI personality chat

#### Telegram Bot (TypeScript)

**Location:** `services/telegram-bot/`

**Commands:**
- `/clip` - Create clip
- `/points` - Check points
- `/trivia` - Trivia game
- `/daily` - Daily points
- `/song` - Current song
- `/ask` - Ask AI anything
- `/chat` - Chat with AI
- `/vibe` - Vibe check
- `/weather` - Weather info
- `/time` - Current time
- `/remind` - Set reminder

**Features:**
- AI personality integration
- Rich inline keyboards
- Media support
- Group chat support

#### WhatsApp Bot (TypeScript)

**Location:** `services/whatsapp-bot/`

**Commands:**
- `!help` - Show help
- `!about` - About bot
- `!stats` - Statistics
- `!ask [question]` - Ask AI
- `!vibe` - Vibe check

**Features:**
- WhatsApp Web.js integration
- QR code authentication
- DM and group chat support
- @ mention responses
- AI personality integration

## Database Schema

The AI personality system uses 6 main models:

### PersonalityProfile
Stores learned personality traits and writing style:
- `traits` - Personality traits (humor, formality, etc.)
- `writingStyle` - Sentence length, vocabulary
- `catchphrases` - Common phrases
- `emojiPreference` - Emoji usage patterns
- `tone` - Casual, professional, etc.
- `vocabulary` - Common words
- `avoidedTopics` - Topics to avoid
- `controversyLevel` - 1-10 scale
- `confidence` - 0-1, how confident the AI is

### Conversation
Stores conversation history for context:
- `role` - user, assistant, system
- `content` - Message content
- `platform` - discord, twitch, telegram, whatsapp
- `wasAIGenerated` - Boolean
- `model` - Which AI generated this
- `confidence` - Confidence score

### Memory
Long-term memories about you:
- `memoryType` - fact, preference, event, relationship
- `content` - Memory content
- `importance` - 1-10 scale
- `tags` - For categorization
- `embedding` - Vector embedding for semantic search
- `lastAccessedAt` - When last retrieved
- `accessCount` - Access frequency

### TrainingData
Raw data from all platforms:
- `platform` - Source platform
- `dataType` - message, stream_transcript, tweet
- `content` - Raw content
- `isProcessed` - Processing status

### GeneratedContent
AI-generated posts:
- `platform` - twitter, instagram, etc.
- `generatedText` - The content
- `status` - draft, scheduled, posted, rejected
- `sentiment` - -1 to 1
- `approved` - Boolean
- `feedback` - Human feedback

### EngagementMetrics
Analytics for generated content:
- `impressions`, `likes`, `comments`, `shares`
- `sentiment` - -1 to 1
- `engagementRate` - Calculated metric

## How Learning Works

### 1. Data Collection

All bots collect messages and send them to the AI personality service:

```typescript
// Example from Discord bot
await axios.post(`${AI_PERSONALITY_URL}/api/v1/learning/train/single`, {
  user_id: CREATOR_USER_ID,
  platform: 'discord',
  data_type: 'message',
  content: message.content,
  metadata: {
    channel: message.channel.name,
    server: message.guild.name
  }
});
```

### 2. Learning Pipeline Processing

The learning pipeline runs every 5 minutes (configurable):

```python
# Process in batches
training_data = await db.trainingdata.find_many(
    where={"isProcessed": False},
    take=50
)

# Extract insights
- Writing style (sentence length, tone, formality)
- Vocabulary (common words, phrases)
- Catchphrases (repeated expressions)
- Topics (interests, expertise)
- Emoji usage patterns
```

### 3. Profile Updates

Insights are merged into your personality profile:

```python
await db.personalityprofile.update(
    data={
        "writingStyle": analyzed_style,
        "vocabulary": top_words[:200],
        "catchphrases": repeated_phrases[:30],
        "topics": detected_topics,
        "confidence": confidence + 0.01  # Increases over time
    }
)
```

### 4. Memory Creation

Important statements are stored as memories:

```python
# Detect important statements
if "i love" in text or "my favorite" in text:
    await memory_manager.store_memory(
        user_id,
        content,
        "preference",
        importance=8
    )
```

### 5. Response Generation

When generating responses, the AI uses:
- **Personality Profile:** Writing style, tone, catchphrases
- **Recent Memories:** Top 10 most relevant via semantic search
- **Conversation History:** Last 20 messages for context

```python
system_prompt = f"""
You are {profile.name}. Respond EXACTLY as they would.

PERSONALITY TRAITS:
{traits}

WRITING STYLE:
- Tone: {tone}
- Common phrases: {catchphrases}
- Emoji usage: {emojis}

KEY MEMORIES:
{top_memories}

GUIDELINES:
- Stay in character
- Avoid: {avoided_topics}
{controversy_guidelines if enabled}
"""
```

## Safety Features

### 1. Sentiment Filtering

All generated content is analyzed for sentiment:

```python
sentiment_scores = vader_analyzer.polarity_scores(text)
compound = sentiment_scores['compound']  # -1 to 1

if compound < MIN_SENTIMENT_SCORE:
    status = "rejected"
    feedback = "Sentiment too negative"
```

### 2. Controversy Avoidance

Controversial keywords are filtered:

```python
controversy_keywords = [
    "hate", "kill", "attack", "war",
    "racist", "sexist", "offensive"
]

if any(keyword in text.lower() for keyword in keywords):
    status = "rejected"
```

### 3. Approval Workflow

Auto-posting is disabled by default:

```env
AUTO_POST_ENABLED=false  # Requires manual approval
CONTENT_REVIEW_REQUIRED=true
```

Content goes through: **Draft → Review → Approved → Scheduled → Posted**

### 4. Confidence Threshold

Low-confidence responses can be filtered:

```python
if confidence < MIN_CONFIDENCE_SCORE:
    # Don't post automatically
    require_human_review = True
```

## Configuration

### AI Provider Selection

```env
AI_PROVIDER=openai      # openai, anthropic, or both
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**OpenAI Models:**
- `gpt-4-turbo-preview` (default)
- `gpt-4`
- `gpt-3.5-turbo`

**Anthropic Models:**
- `claude-3-sonnet-20240229` (default)
- `claude-3-opus-20240229`
- `claude-3-haiku-20240307`

### Personality Configuration

```env
PERSONALITY_TEMPERATURE=0.8    # 0-2, higher = more creative
PERSONALITY_MAX_TOKENS=500     # Response length limit
CONTEXT_WINDOW=20              # Messages to include for context
MEMORY_RETENTION_DAYS=90       # Keep memories for 90 days
```

### Learning Configuration

```env
LEARN_FROM_DISCORD=true
LEARN_FROM_TWITCH=true
LEARN_FROM_TELEGRAM=true
LEARN_FROM_TWITTER=true
LEARN_FROM_STREAMS=true
BATCH_SIZE=50                  # Process 50 items per cycle
LEARNING_INTERVAL_MINUTES=5    # Run every 5 minutes
```

### Safety Configuration

```env
SENTIMENT_FILTERING=true
CONTROVERSY_AVOIDANCE=true
MIN_SENTIMENT_SCORE=-0.3       # -1 to 1
MAX_CONTROVERSY_LEVEL=5        # 1-10
CONTENT_MODERATION=true
```

## Usage Examples

### 1. Generate a Response

```bash
curl -X POST http://localhost:8200/api/v1/personality/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your_user_id",
    "message": "What do you think about the new game?",
    "platform": "discord"
  }'
```

### 2. Generate a Tweet

```bash
curl -X POST http://localhost:8200/api/v1/content/generate/tweet \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your_user_id",
    "prompt": "Tweet about your latest stream"
  }'
```

### 3. Store a Memory

```bash
curl -X POST http://localhost:8200/api/v1/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your_user_id",
    "content": "I love playing RPGs, especially Dark Souls",
    "memory_type": "preference",
    "tags": ["gaming", "preferences"]
  }'
```

### 4. Get Learning Statistics

```bash
curl http://localhost:8200/api/v1/learning/stats/your_user_id
```

Response:
```json
{
  "user_id": "your_user_id",
  "messages_seen": 5420,
  "confidence": 0.87,
  "training_data_processed": 5000,
  "memories_stored": 156,
  "conversations_logged": 8234
}
```

## Best Practices

### 1. Training Your AI

**Do:**
- Have natural conversations across all platforms
- Let it observe your streams and content
- Review and approve generated content initially
- Provide feedback on rejected content

**Don't:**
- Spam training data
- Mix multiple people's styles
- Approve low-quality content just to be fast

### 2. Content Generation

**Start conservatively:**
```env
AUTO_POST_ENABLED=false
CONTENT_REVIEW_REQUIRED=true
MIN_CONFIDENCE_SCORE=0.8
```

**Gradually increase automation:**
- Review first 50-100 tweets manually
- Check sentiment patterns
- Adjust confidence threshold
- Enable auto-posting only when confident

### 3. Memory Management

**Run maintenance regularly:**
- Consolidate duplicate memories weekly
- Prune low-importance memories monthly
- Review high-importance memories for accuracy

## Troubleshooting

### AI responses don't sound like me

**Solution:** Train more!
- Minimum 1000 messages for basic personality
- 5000+ messages for good accuracy
- 10000+ messages for excellent results

Check confidence score:
```bash
curl http://localhost:8200/api/v1/learning/stats/your_user_id
```

If confidence < 0.5, keep training.

### Generated content is too negative

**Solution:** Adjust sentiment filtering
```env
MIN_SENTIMENT_SCORE=-0.1  # Stricter (was -0.3)
SENTIMENT_FILTERING=true
```

### AI is too cautious/boring

**Solution:** Adjust personality temperature
```env
PERSONALITY_TEMPERATURE=1.0  # More creative (was 0.8)
CONTROVERSY_AVOIDANCE=false  # If you want edgier content
```

### Memory growing too large

**Solution:** Adjust retention
```env
MEMORY_RETENTION_DAYS=60     # Shorter retention (was 90)
MIN_MEMORY_IMPORTANCE=7      # Only keep important memories (was 5)
```

Then run cleanup:
```bash
curl -X POST http://localhost:8200/api/v1/memory/prune/your_user_id
```

## Performance

### Response Times
- Simple response: 1-3 seconds
- Complex response with memory search: 3-5 seconds
- Tweet generation: 2-4 seconds

### Resource Usage
- **AI Personality Service:** 512MB-2GB RAM (depends on model)
- **ChromaDB:** 256MB-1GB RAM (depends on memory count)
- **Bots:** 128-256MB RAM each

### Scaling
- ChromaDB handles 1M+ vectors efficiently
- Horizontal scaling: Run multiple bot instances
- Vertical scaling: Use larger AI models (GPT-4, Claude Opus)

## Next Steps

1. **Add n8n Workflows** - Automate content pipelines
2. **Add Sentiment Analysis Dashboard** - Visualize personality evolution
3. **Add Voice Cloning** - Generate voice responses
4. **Add Image Generation** - Create memes in your style
5. **Multi-language Support** - Respond in multiple languages

---

For questions or issues, check the main README or open an issue on GitHub.
