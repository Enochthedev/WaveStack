# Social Publisher Service

Universal social media publishing for Instagram, TikTok, Facebook, and LinkedIn with AI-enhanced content.

## Features

### Supported Platforms

✅ **Instagram**
- Photos
- Videos (Reels)
- Carousels
- Stories
- AI-generated hashtags
- AI-enhanced captions

✅ **TikTok**
- Video uploads
- TikTok Content Posting API integration
- AI-generated hashtags
- Trend-optimized captions

✅ **Facebook**
- Text posts
- Photos
- Videos
- Link sharing
- Page publishing
- AI-enhanced content

✅ **LinkedIn**
- Text posts
- Images
- Videos
- Link sharing
- Professional AI optimization

### AI Features

- **AI-Enhanced Captions** - Platform-optimized captions for maximum engagement
- **AI-Generated Hashtags** - Trending and relevant hashtags
- **Multi-Platform Optimization** - Content adapted per platform

## Quick Start

### 1. Configure Credentials

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

**Instagram:**
```env
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
```

**TikTok:**
```env
TIKTOK_SESSION_ID=your_session_id
# OR use TikTok Content Posting API (preferred)
```

**Facebook:**
```env
FACEBOOK_ACCESS_TOKEN=your_page_access_token
FACEBOOK_PAGE_ID=your_page_id
```

**LinkedIn:**
```env
LINKEDIN_ACCESS_TOKEN=your_access_token
```

### 2. Run Service

```bash
docker-compose up social-publisher
```

### 3. Publish Content

**Multi-Platform Publishing:**
```bash
curl -X POST http://localhost:8600/api/v1/publish/multi-platform \
  -F "org_id=my_org" \
  -F "platforms=instagram,tiktok,facebook,linkedin" \
  -F "caption=Check out my latest content!" \
  -F "media_type=photo" \
  -F "media=@photo.jpg"
```

**Instagram Only:**
```bash
curl -X POST http://localhost:8600/api/v1/publish/instagram \
  -F "org_id=my_org" \
  -F "caption=Amazing photo! #photography" \
  -F "post_type=photo" \
  -F "media=@photo.jpg"
```

**Facebook Only:**
```bash
curl -X POST http://localhost:8600/api/v1/publish/facebook \
  -F "org_id=my_org" \
  -F "message=Exciting news!" \
  -F "post_type=text"
```

## API Endpoints

### Multi-Platform

- `POST /api/v1/publish/multi-platform` - Publish to multiple platforms simultaneously

### Platform-Specific

- `POST /api/v1/publish/instagram` - Instagram posts
- `POST /api/v1/publish/tiktok` - TikTok videos
- `POST /api/v1/publish/facebook` - Facebook posts
- `POST /api/v1/publish/linkedin` - LinkedIn posts

## Getting Platform Credentials

### Instagram

1. Use your Instagram username and password
2. Session is cached for reuse
3. **Note:** Consider using official Instagram Graph API for production

### TikTok

**Option 1: Content Posting API (Recommended for production)**
1. Create TikTok Developer account
2. Apply for Content Posting API access
3. Get user access token
4. Use `post_with_api()` method

**Option 2: Session ID (Quick testing)**
1. Login to TikTok in browser
2. Get `sessionid` cookie value
3. Set in environment variables

### Facebook

1. Create Facebook App
2. Get Page Access Token:
   - Go to Graph API Explorer
   - Select your Page
   - Generate token with `pages_manage_posts` permission
3. Get Page ID from Page settings

### LinkedIn

1. Create LinkedIn App
2. Get authorization code via OAuth 2.0
3. Exchange for access token
4. Use token in API calls

Required scopes:
- `w_member_social` - Post on behalf of user
- `r_basicprofile` - Read basic profile

## Platform Limits

### Instagram
- Max video: 60 seconds (Reels)
- Max caption: 2,200 characters
- Max hashtags: 30
- Rate limit: ~100 posts/hour

### TikTok
- Max video: 3 minutes
- Max caption: 2,200 characters
- Rate limit: ~10 posts/day (unofficial API)

### Facebook
- Max video: 4 hours
- Max caption: 5,000 characters
- Rate limit: Depends on Page tier

### LinkedIn
- Max video: 10 minutes
- Max caption: 3,000 characters
- Rate limit: ~100 posts/day

## AI Integration

The service automatically enhances your content using the AI personality service:

**Caption Enhancement:**
- Platform-specific tone adaptation
- Engagement optimization
- Character limit compliance

**Hashtag Generation:**
- Trending hashtag identification
- Relevance scoring
- Platform best practices

**Disable AI:**
```bash
curl -X POST http://localhost:8600/api/v1/publish/instagram \
  -F "org_id=my_org" \
  -F "caption=My caption" \
  -F "use_ai_caption=false" \
  ...
```

## Content Types

### Instagram

**Photo:**
```bash
-F "post_type=photo" -F "media=@image.jpg"
```

**Reel:**
```bash
-F "post_type=reel" -F "media=@video.mp4"
```

**Story:**
```bash
-F "post_type=story" -F "media=@image.jpg"
```

**Carousel:**
```python
await publisher.post_carousel(
    media_paths=["img1.jpg", "img2.jpg", "img3.jpg"],
    caption="Amazing collection!"
)
```

### TikTok

**Video:**
```bash
-F "caption=Viral content!" -F "video=@video.mp4"
```

### Facebook

**Text:**
```bash
-F "post_type=text" -F "message=Hello world!"
```

**Photo:**
```bash
-F "post_type=photo" -F "message=Check this out!" -F "media=@photo.jpg"
```

**Video:**
```bash
-F "post_type=video" -F "message=New video!" -F "media=@video.mp4"
```

**Link:**
```bash
-F "post_type=link" -F "message=Great article" -F "link=https://example.com"
```

### LinkedIn

**Text:**
```bash
-F "post_type=text" -F "text=Professional insight..."
```

**Image:**
```bash
-F "post_type=image" -F "text=Infographic" -F "media=@chart.png"
```

**Video:**
```bash
-F "post_type=video" -F "text=Tutorial" -F "media=@tutorial.mp4"
```

**Link:**
```bash
-F "post_type=link" -F "text=Article" -F "link=https://example.com"
```

## Best Practices

### Content Strategy

1. **Platform Adaptation**
   - Instagram: Visual storytelling, lifestyle
   - TikTok: Trending, viral, short-form
   - Facebook: Community, longer-form
   - LinkedIn: Professional, insightful

2. **Posting Schedule**
   - Instagram: 1-2 posts/day
   - TikTok: 1-4 videos/day
   - Facebook: 1-2 posts/day
   - LinkedIn: 1 post/day

3. **Content Types**
   - Mix photos, videos, text
   - Use carousels for tutorials
   - Stories for behind-the-scenes
   - Videos for maximum reach

### Hashtag Strategy

- Instagram: 10-15 hashtags
- TikTok: 3-5 trending hashtags
- Facebook: 1-3 hashtags
- LinkedIn: 3-5 professional hashtags

### Video Optimization

- Instagram: 9:16 (vertical)
- TikTok: 9:16 (vertical)
- Facebook: 16:9 or 1:1
- LinkedIn: 16:9

## Automation Examples

### Daily Content Pipeline

```python
# 1. Generate content with AI
content = await ai_personality.generate_content(topic="tech tips")

# 2. Create thumbnail
thumbnail = await thumbnail_generator.generate(title=content.title)

# 3. Publish everywhere
await social_publisher.publish_multi_platform(
    platforms=["instagram", "tiktok", "facebook", "linkedin"],
    caption=content.caption,
    media=thumbnail
)
```

### Clip-to-Social Workflow

```python
# 1. Create clip from stream
clip = await clipper.create_clip(start=100, duration=60)

# 2. Publish as Reel/Short
await social_publisher.publish_instagram(
    post_type="reel",
    caption=clip.title,
    media=clip.file
)
```

## Troubleshooting

### Instagram Login Failed

- Check username/password
- Enable 2FA and use app password
- Wait 5 minutes between login attempts
- Consider using Instagram Graph API

### TikTok Upload Failed

- Verify session ID is valid
- Check video format (MP4, H.264)
- Ensure video < 3 minutes
- Use Content Posting API for reliability

### Facebook API Error

- Verify access token is valid
- Check token has required permissions
- Ensure Page ID is correct
- Review Facebook API changelog

### LinkedIn Upload Error

- Refresh access token
- Check file size limits
- Verify video format
- Use LinkedIn URN format

## Security

- Store credentials securely (environment variables)
- Use access tokens over passwords
- Rotate tokens regularly
- Never commit credentials to Git
- Use OAuth when available

## License

MIT
