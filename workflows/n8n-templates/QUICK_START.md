# n8n Workflow Templates - Quick Start Guide

Get your WaveStack automation pipelines running in minutes.

## Prerequisites

1. **WaveStack Services Running**
   ```bash
   docker-compose up -d
   ```

2. **n8n Access**
   - URL: http://localhost:5678
   - Default credentials: admin / changeme (change in docker-compose.yml)

3. **Platform Credentials**
   - YouTube OAuth tokens
   - Instagram username/password
   - TikTok session ID
   - Facebook access token + page ID
   - LinkedIn access token

## Step 1: Import Workflows

1. Open n8n (http://localhost:5678)
2. Click "Workflows" in sidebar
3. Click "+ Add Workflow" dropdown
4. Select "Import from File"
5. Choose a workflow JSON file
6. Click "Import"

**Recommended Import Order:**
1. `clip-to-social-pipeline.json` - Start here for basic automation
2. `ai-content-generator-pipeline.json` - Daily content posting
3. `stream-to-highlights-pipeline.json` - Stream automation
4. `auto-moderation-integration.json` - Chat moderation
5. `multi-platform-scheduler.json` - Advanced scheduling
6. `content-repurposing-pipeline.json` - Content multiplication

## Step 2: Configure Credentials

### Redis Credential (Required for all workflows)

1. Click "Credentials" in n8n sidebar
2. Click "+ Add Credential"
3. Search for "Redis"
4. Fill in:
   - **Host:** redis
   - **Port:** 6379
   - **Database:** 0
5. Click "Save"

### HTTP Request (No Auth Needed)

Most workflows use HTTP requests to WaveStack services, which don't require authentication since they're internal.

## Step 3: Configure Each Workflow

### Clip-to-Social Pipeline

**Purpose:** Automatically publish clips to all social platforms

**Configuration:**
1. Open the workflow
2. Click "Webhook - Clip Created" node
3. Copy the webhook URL
4. Add to your clipper service config:
   ```env
   WEBHOOK_ON_CLIP_CREATED=<webhook-url>
   ```
5. Test with manual trigger

**Usage:**
```bash
curl -X POST http://clipper:8000/api/v1/clips/create \
  -H "Content-Type: application/json" \
  -d '{
    "stream_id": "123",
    "start_time": 60,
    "duration": 30
  }'
```

### AI Content Generator

**Purpose:** Generate and post AI content daily

**Configuration:**
1. Open the workflow
2. Click "Daily Schedule - 9 AM" node
3. Adjust trigger time if needed
4. Click "Generate Content Idea" node
5. Modify topics array to match your content:
   ```javascript
   ["gaming", "streaming", "tech", "your-topic"]
   ```
6. Save and activate workflow

**Testing:**
1. Click "Execute Workflow" button
2. Wait for execution to complete
3. Check each platform for posted content

### Stream-to-Highlights

**Purpose:** Auto-create highlights after streams

**Configuration:**
1. Open the workflow
2. Click "Schedule - After Stream" node
3. Set time to run after your typical stream (e.g., 11:30 PM)
4. Adjust in "Filter Top Clips" node:
   - `minScore`: Minimum engagement score (0.0-1.0)
   - `.slice(0, 3)`: Number of top clips to publish
5. Save and activate

**Manual Trigger:**
```bash
# Trigger manually for latest stream
curl -X POST <n8n-webhook-url>/stream-to-highlights
```

### Auto-Moderation Integration

**Purpose:** Real-time chat moderation for Discord/Twitch

**Configuration:**
1. Open the workflow
2. Copy webhook URL from "Webhook - Message Event"
3. **For Discord Bot:**
   - Edit `services/discord-bot/src/events/messageCreate.ts`
   - Add webhook call:
   ```typescript
   const moderationResult = await fetch('http://n8n:5678/webhook/moderate-message', {
     method: 'POST',
     body: JSON.stringify({
       message: message.content,
       user_id: message.author.id,
       username: message.author.username,
       platform: 'discord',
       channel_id: message.channel.id,
       user_roles: message.member?.roles.cache.map(r => r.name) || []
     })
   });
   ```

4. **For Twitch Bot:**
   - Edit `services/twitch-bot/src/index.ts`
   - Add similar webhook call in message handler

5. Adjust moderation thresholds in auto-mod service `.env`

**Testing:**
```bash
curl -X POST <webhook-url> \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test toxic message",
    "user_id": "123",
    "username": "testuser",
    "platform": "discord",
    "channel_id": "456",
    "user_roles": ["member"]
  }'
```

### Multi-Platform Scheduler

**Purpose:** Schedule content across platforms with optimal timing

**Configuration:**
1. Open the workflow
2. In "Extract Metadata" node, adjust default schedule times:
   ```javascript
   schedule_times: {
     youtube: '14:00',    // 2 PM
     instagram: '18:00',  // 6 PM
     tiktok: '19:00',     // 7 PM
     facebook: '12:00',   // 12 PM
     linkedin: '09:00'    // 9 AM
   }
   ```
3. Save and activate both triggers (webhook + hourly processor)

**Usage:**
```bash
curl -X POST <webhook-url> \
  -H "Content-Type: application/json" \
  -d '{
    "video_path": "/path/to/video.mp4",
    "title": "My Video Title",
    "description": "Video description",
    "platforms": ["youtube", "instagram", "tiktok"],
    "schedule_times": {
      "youtube": "14:00",
      "instagram": "18:00",
      "tiktok": "19:00"
    }
  }'
```

### Content Repurposing Pipeline

**Purpose:** Convert one video into multiple platform-specific formats

**Configuration:**
1. Open the workflow
2. In "Define Output Formats" node, customize formats:
   - Add/remove platforms
   - Adjust durations
   - Change aspect ratios
3. Save and activate

**Usage:**
```bash
curl -X POST <webhook-url> \
  -H "Content-Type: application/json" \
  -d '{
    "video_path": "/path/to/long-video.mp4",
    "title": "Original Video Title",
    "description": "Full description of the video content"
  }'
```

## Step 4: Activate Workflows

1. Open each workflow
2. Click the toggle switch in top-right
3. Confirm "Active" status appears

## Step 5: Monitor Executions

1. Click "Executions" in n8n sidebar
2. View real-time execution status
3. Click any execution to see detailed logs
4. Debug failed nodes

## Common Issues & Solutions

### Workflow Fails: "Could not connect to service"

**Solution:** Ensure all WaveStack services are running
```bash
docker-compose ps
docker-compose logs <service-name>
```

### "Authentication failed" errors

**Solution:**
1. Check platform credentials in docker-compose.yml
2. For OAuth (YouTube), re-authenticate
3. For tokens (Instagram), verify they're not expired

### Redis connection errors

**Solution:**
1. Verify Redis credential in n8n
2. Test Redis connection:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

### Webhook not triggering

**Solution:**
1. Check webhook URL is correct
2. Verify workflow is ACTIVE
3. Test with curl directly
4. Check n8n logs:
   ```bash
   docker-compose logs n8n
   ```

### AI content generation fails

**Solution:**
1. Check AI Personality service is running
2. Verify OPENAI_API_KEY or OLLAMA_MODEL is set
3. Review service logs:
   ```bash
   docker-compose logs ai-personality
   ```

## Advanced Customization

### Add Custom Platform

1. Open workflow
2. Add new HTTP Request node
3. Configure endpoint: `http://social-publisher:8600/api/v1/publish/<platform>`
4. Connect to publishing flow
5. Save and test

### Change AI Behavior

Edit AI Personality service settings:
```env
PERSONALITY_TEMPERATURE=0.8  # Creativity (0.0-1.0)
PERSONALITY_MAX_TOKENS=500   # Response length
SENTIMENT_FILTERING=true     # Filter negative content
```

### Schedule Multiple Posts Per Day

1. Open AI Content Generator
2. Add more Schedule Trigger nodes
3. Set different times (e.g., 9 AM, 3 PM, 9 PM)
4. Connect all to "Generate Content Idea"

### Filter Content by Engagement

In Stream-to-Highlights workflow:
1. Edit "Filter Top Clips" code node
2. Adjust `minScore` variable
3. Add additional filters (views, likes, comments)

## Best Practices

1. **Start Small:** Activate one workflow at a time
2. **Test First:** Use manual triggers before scheduling
3. **Monitor Closely:** Check executions daily for first week
4. **Adjust Gradually:** Fine-tune thresholds based on results
5. **Backup Workflows:** Export JSON files regularly
6. **Set Rate Limits:** Don't exceed platform API limits
7. **Review Content:** Manually approve AI-generated content initially

## Getting Help

1. **Check Logs:** Always start with service logs
2. **Test Individually:** Isolate failing node
3. **Verify Services:** Ensure all dependencies are running
4. **Review Docs:** Check WaveStack service documentation
5. **n8n Community:** https://community.n8n.io

## Next Steps

1. Set up analytics tracking
2. Create custom workflows for your use case
3. Integrate with additional platforms
4. Build content approval flows
5. Add A/B testing for captions

---

**Need more help?** Check the full README.md for detailed workflow documentation.
