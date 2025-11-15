# WaveStack n8n Workflow Templates

Automated content pipeline workflows for n8n integration with WaveStack services.

## Available Workflows

### 1. Clip-to-Social Pipeline
**File:** `clip-to-social-pipeline.json`

Automatically publishes clips across all social media platforms with AI-enhanced content.

**Flow:**
1. **Webhook Trigger** - Receives clip creation event
2. **Get Clip** - Fetches clip from Clipper service
3. **Generate Thumbnail** - Creates AI-powered thumbnail
4. **Enhance Caption** - Uses AI Personality for engaging captions
5. **Generate Hashtags** - AI generates platform-specific hashtags
6. **Publish to YouTube** - Uploads to YouTube with metadata
7. **Publish to Social** - Posts to Instagram, TikTok, Facebook, LinkedIn

**Setup:**
- Import into n8n
- Configure webhook URL
- Set API credentials for all services
- Connect to WaveStack services (clipper:8000, thumbnail-generator:8400, ai-personality:8200, youtube-publisher:8500, social-publisher:8600)

### 2. Stream-to-Highlights Pipeline
**File:** `stream-to-highlights-pipeline.json`

Automatically creates highlights from Twitch/YouTube streams and distributes them.

**Flow:**
1. **Schedule Trigger** - Runs after stream ends (configurable interval)
2. **Get Stream Info** - Fetches stream metadata
3. **Create Clips** - Uses Clipper service to extract best moments
4. **AI Analysis** - AI Personality analyzes clips for engagement potential
5. **Generate Thumbnails** - Creates custom thumbnails for top clips
6. **Publish Highlights** - Distributes to YouTube Shorts, TikTok, Instagram Reels

**Setup:**
- Import into n8n
- Set schedule (e.g., every 2 hours during streaming)
- Configure stream platform credentials
- Set minimum clip engagement threshold

### 3. AI Content Generator Pipeline
**File:** `ai-content-generator-pipeline.json`

Generates original content using AI and publishes across platforms on a schedule.

**Flow:**
1. **Schedule Trigger** - Runs at configured intervals (e.g., daily)
2. **Generate Content Idea** - AI Personality creates content concept
3. **Generate Image/Video** - Creates visual content (thumbnail generator)
4. **Write Caption** - AI writes engaging caption
5. **Generate Hashtags** - Platform-specific hashtags
6. **Multi-Platform Publish** - Posts to all configured platforms

**Setup:**
- Import into n8n
- Set posting schedule
- Configure content themes/topics
- Enable/disable specific platforms

### 4. Multi-Platform Content Scheduler
**File:** `multi-platform-scheduler.json`

Schedule and distribute content across all platforms with optimal timing.

**Flow:**
1. **Manual Trigger** - Upload content manually
2. **Content Processing** - Formats for each platform (aspect ratios, lengths)
3. **AI Enhancement** - Optimizes captions, titles, descriptions per platform
4. **Schedule Queue** - Adds to Redis queue with optimal posting times
5. **Platform Distribution** - Publishes at scheduled times

**Setup:**
- Import into n8n
- Configure posting times per platform
- Set content format preferences
- Connect to social-publisher and youtube-publisher

### 5. Auto-Moderation Integration
**File:** `auto-moderation-integration.json`

Real-time content moderation for Discord and Twitch using AI.

**Flow:**
1. **Webhook Trigger** - Receives message events from bots
2. **Moderate Message** - Calls auto-mod service (port 8700)
3. **Check Violations** - Analyzes toxicity, spam, banned words
4. **Execute Actions** - Delete, timeout, or ban based on severity
5. **Log Violations** - Stores in database for tracking
6. **Notify Moderators** - Alerts human mods for severe violations

**Setup:**
- Import into n8n
- Configure webhook endpoints in Discord/Twitch bots
- Set moderation thresholds
- Configure moderator notification channels

### 6. Content Repurposing Pipeline
**File:** `content-repurposing-pipeline.json`

Repurposes existing content into multiple formats for different platforms.

**Flow:**
1. **Manual/Webhook Trigger** - New video uploaded
2. **Extract Clips** - Creates short clips (30s, 60s, 90s)
3. **Format Conversion** - Converts to vertical (9:16) for Reels/Shorts/TikTok
4. **Generate Variants** - Creates multiple thumbnail options
5. **AI Captioning** - Platform-specific captions
6. **Batch Publish** - Schedules across all platforms

**Setup:**
- Import into n8n
- Set clip durations
- Configure platform preferences
- Enable/disable auto-publishing

## Installation

1. **Import Workflow:**
   ```bash
   # Navigate to n8n UI (http://localhost:5678)
   # Go to Workflows > Import from File
   # Select the desired JSON template
   ```

2. **Configure Credentials:**
   - Set WaveStack service URLs:
     - Clipper: `http://clipper:8000`
     - AI Personality: `http://ai-personality:8200`
     - Thumbnail Generator: `http://thumbnail-generator:8400`
     - YouTube Publisher: `http://youtube-publisher:8500`
     - Social Publisher: `http://social-publisher:8600`
     - Auto-Mod: `http://auto-mod:8700`

3. **Set Environment Variables:**
   - Platform API keys (Instagram, TikTok, Facebook, LinkedIn)
   - YouTube OAuth credentials
   - Webhook URLs
   - Organization IDs

4. **Test Workflow:**
   - Use manual trigger to test
   - Verify all nodes execute successfully
   - Check output on each platform

## Common Use Cases

### Daily Content Automation
1. Use **AI Content Generator** with schedule trigger (9 AM daily)
2. Generates and posts fresh content every morning
3. Platform-specific optimization

### Live Stream Workflow
1. Use **Stream-to-Highlights** after each stream
2. Automatically creates best moments
3. Publishes highlights within hours of stream end

### Multi-Platform Distribution
1. Upload video once
2. Use **Content Repurposing** to create all formats
3. Schedule across all platforms with **Multi-Platform Scheduler**

### Community Moderation
1. Connect Discord/Twitch bots to **Auto-Moderation Integration**
2. Real-time filtering of toxic/spam messages
3. Automatic action enforcement

## Customization

Each workflow can be customized:
- **Triggers:** Change from schedule to webhook or manual
- **Filters:** Add conditions (minimum views, engagement rate)
- **Platforms:** Enable/disable specific social platforms
- **AI Settings:** Adjust creativity, tone, style
- **Timing:** Configure posting schedules per platform

## Troubleshooting

**Workflow fails:**
- Check service connectivity (all services must be running)
- Verify credentials are set correctly
- Check logs in n8n execution view

**AI not generating content:**
- Ensure AI Personality service is running
- Check OPENAI_API_KEY or OLLAMA configuration
- Verify AI_PERSONALITY_URL is correct

**Publishing fails:**
- Verify platform credentials (Instagram, TikTok, etc.)
- Check media format compatibility
- Review API rate limits

## Advanced Features

### Custom AI Personalities
- Configure different AI personalities per workflow
- Create brand-specific voices
- Use fine-tuned models from ML Training service

### Analytics Integration
- Add analytics nodes to track performance
- A/B test content variations
- Optimize posting times based on engagement

### Content Queues
- Build Redis-backed content queues
- Schedule weeks of content in advance
- Auto-repost high-performing content

## Support

For issues or questions:
1. Check n8n execution logs
2. Review WaveStack service logs
3. Verify all services are healthy in docker-compose
4. Check the WaveStack documentation
