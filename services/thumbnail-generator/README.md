# Thumbnail Generator Service

AI-powered thumbnail generation for YouTube and social media content.

## Features

- **Multiple AI Providers**
  - OpenAI DALL-E 3 (paid, highest quality)
  - Stability AI (paid, high quality)
  - Local Stable Diffusion XL (FREE, good quality)

- **8 Pre-designed Templates**
  - Bold, Dramatic, Colorful, Minimal
  - Gaming, Split, Gradient, Vlog

- **Smart Text Overlays**
  - Auto-sizing text
  - Customizable fonts, colors, strokes
  - Multi-line support
  - Shadow effects

- **AI Integration**
  - Let AI generate optimized image prompts
  - Learns your content style over time

- **YouTube-Optimized**
  - Standard 1280x720 resolution
  - High-quality PNG/JPEG export
  - Click-worthy designs

## Quick Start

### 1. Setup Environment

```bash
cd services/thumbnail-generator
cp .env.example .env
```

Edit `.env` and configure your image provider:

**For FREE local generation:**
```env
IMAGE_PROVIDER=local
SD_MODEL=stabilityai/stable-diffusion-xl-base-1.0
```

**For paid API (better quality):**
```env
IMAGE_PROVIDER=openai
OPENAI_API_KEY=your-key-here
```

### 2. Run with Docker

```bash
docker build -t wavestack-thumbnail-generator .

# With GPU (recommended for local SD)
docker run --gpus all -p 8400:8400 \
  -v $(pwd)/thumbnails:/app/thumbnails \
  wavestack-thumbnail-generator

# Without GPU (slower)
docker run -p 8400:8400 \
  -v $(pwd)/thumbnails:/app/thumbnails \
  wavestack-thumbnail-generator
```

### 3. Generate Your First Thumbnail

```bash
curl -X POST http://localhost:8400/api/v1/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How I Built an AI Bot in 24 Hours",
    "description": "Tutorial on building an AI-powered Discord bot",
    "tags": ["programming", "ai", "tutorial"],
    "style": "tech",
    "template": "bold",
    "overlay_text": "AI BOT TUTORIAL"
  }'
```

Response:
```json
{
  "success": true,
  "thumbnail_url": "/api/v1/thumbnails/abc123def456",
  "cache_key": "abc123def456",
  "message": "Thumbnail generated successfully"
}
```

### 4. Download Thumbnail

```bash
curl http://localhost:8400/api/v1/thumbnails/abc123def456 --output thumbnail.png
```

## API Endpoints

### Generate Thumbnail
`POST /api/v1/thumbnails/generate`

```json
{
  "title": "Video Title",
  "description": "Video description",
  "tags": ["tag1", "tag2"],
  "style": "dramatic",
  "template": "bold",
  "overlay_text": "CUSTOM TEXT",
  "subtitle": "Subtitle text",
  "use_ai_prompt": true
}
```

### Get Thumbnail
`GET /api/v1/thumbnails/{cache_key}`

Returns the generated image.

### Quick Generation
`POST /api/v1/thumbnails/generate-from-prompt`

```
?prompt=astronaut+riding+a+horse
&style=dramatic
&template=bold
&title=SPACE+ADVENTURE
```

### List Templates
`GET /api/v1/thumbnails/templates/list`

Returns all available templates with descriptions.

### List Styles
`GET /api/v1/thumbnails/styles/list`

Returns all available visual styles.

## Templates

### Bold
- Large text with yellow accent
- Dark vignette
- High contrast
- **Best for:** Gaming, tech, tutorials

### Dramatic
- Desaturated background
- Red accent text
- Heavy shadows
- **Best for:** Story-driven content, documentaries

### Colorful
- Enhanced saturation
- Rainbow gradient overlay
- Vibrant and playful
- **Best for:** Fun content, vlogs, lifestyle

### Minimal
- Blurred background
- Clean text
- Semi-transparent bar
- **Best for:** Professional content, business

### Gaming
- Neon colors (cyan/lime)
- Tech aesthetic
- High energy
- **Best for:** Gaming videos, tech reviews

### Split
- Title at top
- Subtitle at bottom
- Gradient bars
- **Best for:** Before/after, comparisons

### Gradient
- Purple gradient overlay
- Modern and stylish
- Eye-catching
- **Best for:** Music, art, creative content

### Vlog
- Warm tones
- Personal feel
- Light vignette
- **Best for:** Vlogs, lifestyle, personal content

## Visual Styles

Styles modify the AI-generated background image:

- `dramatic` - Dramatic lighting, high contrast, cinematic
- `colorful` - Vibrant colors, saturated, eye-catching
- `minimalist` - Clean, simple, minimal design
- `gaming` - Gaming aesthetic, neon colors
- `tech` - Futuristic, modern tech design
- `professional` - Clean, high-quality, professional
- `fun` - Playful, energetic, fun atmosphere
- `dark` - Dark theme, moody lighting

## AI Prompt Generation

When `use_ai_prompt: true`, the service calls the AI personality service to generate an optimized image prompt based on your video metadata. This creates more relevant and engaging backgrounds.

Example:
```
Input: "How to Cook Perfect Pasta"
AI Prompt: "Professional Italian kitchen, fresh pasta being made,
           warm lighting, appetizing food photography, high quality"
```

## Image Providers

### Local Stable Diffusion (FREE)

**Pros:**
- Completely free
- Unlimited generations
- No API costs
- Privacy (runs locally)

**Cons:**
- Requires GPU (8GB+ VRAM)
- Slower than paid APIs (~30 seconds)
- Requires ~10GB disk space for model

**Recommended GPU:**
- RTX 3060 (12GB) - Good
- RTX 3080 (10GB) - Better
- RTX 4090 (24GB) - Best

### OpenAI DALL-E 3

**Pros:**
- Highest quality
- Fast generation (~10 seconds)
- Best text rendering in images

**Cons:**
- ~$0.04 per image (HD quality)
- API key required
- Rate limits apply

### Stability AI

**Pros:**
- High quality
- Fast generation
- Good value

**Cons:**
- ~$0.02 per image
- API key required
- Rate limits apply

## Custom Fonts

Add custom fonts to `./fonts/` directory:

```bash
fonts/
  Impact.ttf
  Bebas.ttf
  Montserrat-Bold.ttf
```

Use in API:
```json
{
  "overlay_text": "CUSTOM FONT",
  "font_name": "Bebas"
}
```

## Performance

**Generation Times:**
- DALL-E 3: ~10 seconds
- Stability AI: ~5-8 seconds
- Local SD (GPU): ~20-30 seconds
- Local SD (CPU): ~5-10 minutes (not recommended)

**Caching:**
Thumbnails are cached by default. Identical requests return cached images instantly.

## Integration with YouTube Publisher

The thumbnail generator integrates seamlessly with the YouTube publishing service:

```python
# Auto-generate thumbnail for video upload
thumbnail = await thumbnail_generator.generate({
    "title": video_title,
    "description": video_description,
    "tags": video_tags,
    "template": "bold"
})

# Upload to YouTube with thumbnail
youtube.upload_video(
    file=video_file,
    title=title,
    description=description,
    thumbnail=thumbnail
)
```

## Troubleshooting

### Out of Memory (GPU)

Reduce model size or use CPU:
```env
SD_MODEL=stabilityai/stable-diffusion-2-1-base
```

### Slow Generation

- Use paid API (DALL-E or Stability)
- Ensure GPU is enabled
- Check GPU utilization: `nvidia-smi`

### Poor Quality Images

- Use DALL-E 3 for best quality
- Increase image size in config
- Use better prompts
- Enable AI prompt generation

### Text Not Readable

- Use templates instead of raw overlay
- Choose high-contrast templates (Bold, Dramatic)
- Increase stroke width
- Use shadow effects

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python -m src.main

# Test generation
curl -X POST http://localhost:8400/api/v1/thumbnails/generate-from-prompt \
  -d "prompt=cool+tech+background" \
  -d "title=TEST" \
  --output test.png
```

## License

MIT
