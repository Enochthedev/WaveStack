# YouTube Publisher Service

Automated YouTube video publishing with AI-enhanced metadata and thumbnail generation.

## Features

- **OAuth Authentication** - Secure YouTube API access
- **Video Upload** - Resumable uploads with retry logic
- **AI Metadata** - Auto-generate descriptions and tags
- **Thumbnail Integration** - Auto-generate professional thumbnails
- **Privacy Controls** - Private, unlisted, or public
- **Playlist Management** - Auto-add to playlists
- **Scheduled Publishing** - Schedule video releases

## Quick Start

### 1. Get YouTube API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:8500/oauth2callback`

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
```

### 3. Run Service

```bash
docker-compose up youtube-publisher
```

### 4. Authorize YouTube Access

```bash
# Get authorization URL
curl http://localhost:8500/api/v1/youtube/auth/url?org_id=my_org

# Visit the URL, authorize, and you'll be redirected back
```

### 5. Upload a Video

```bash
curl -X POST http://localhost:8500/api/v1/youtube/upload \
  -F "org_id=my_org" \
  -F "title=My Awesome Video" \
  -F "description=Check out this video!" \
  -F "tags=gaming,tutorial,fun" \
  -F "privacy=private" \
  -F "video=@/path/to/video.mp4"
```

## API Endpoints

- `GET /api/v1/youtube/auth/url` - Get authorization URL
- `GET /api/v1/youtube/oauth2callback` - OAuth callback
- `POST /api/v1/youtube/upload` - Upload video
- `GET /api/v1/youtube/status/{org_id}` - Check auth status

## AI Features

**Auto-generated Descriptions:**
The AI personality service creates engaging descriptions based on your title and existing description.

**Auto-generated Tags:**
AI suggests relevant tags to improve discoverability.

**Auto-generated Thumbnails:**
Professional thumbnails are created using the thumbnail generator service.

## License

MIT
