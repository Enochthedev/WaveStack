# WaveStack — Railway Deployment Guide

This document lists every environment variable needed to deploy WaveStack on Railway.
Variables are grouped so you can use Railway's **Shared Variables** feature to avoid
repeating the same value across dozens of services.

---

## How to use this with Railway

1. Create a **Railway project** with one environment (`production`).
2. Go to **Project → Shared Variables** and add all the globals below.
3. In each service, add only the service-specific variables (the shared ones are
   inherited automatically).
4. Infrastructure (Postgres, Redis, ChromaDB) should be Railway-provisioned services.
   Railway will auto-inject `DATABASE_URL` and `REDIS_URL` for those — override the
   defaults below with the Railway-provided values.

---

## Tier 1 — Every service uses these

Set these as **Shared Variables** at the project level.

| Variable                  | Example / Notes                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`            | `postgresql://user:pass@host:5432/wave` — use Railway's Postgres plugin, it injects this automatically |
| `REDIS_URL`               | `redis://default:pass@host:6379` — use Railway's Redis plugin                                          |
| `INTERNAL_SERVICE_SECRET` | `openssl rand -hex 32` — one strong random secret, same value on all services                          |
| `NODE_ENV`                | `production`                                                                                           |
| `LOG_LEVEL`               | `info`                                                                                                 |

---

## Tier 2 — Services that call AI APIs

Applies to: `core-app`, `model-router`, `agent-orchestrator`, `ai-personality`,
`seo-optimizer`, `knowledge`, `thumbnail-generator`

| Variable             | Notes                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`  | [console.anthropic.com](https://console.anthropic.com/settings/keys) — required for Claude |
| `OPENAI_API_KEY`     | Optional. Used for embeddings and fallback generation                                      |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) — recommended for cheap base-model calls  |
| `TOGETHER_API_KEY`   | Only needed if deploying personal fine-tuned LoRA models                                   |
| `AI_PROVIDER`        | `anthropic` (default on Railway — do not set to `ollama`)                                  |

---

## Tier 3 — Services that need internal service URLs

These are the Railway private network URLs for service-to-service calls.
In Railway, each service gets a private hostname like `core-app.railway.internal`.

| Variable                  | Value pattern                                      |
| ------------------------- | -------------------------------------------------- |
| `CORE_APP_URL`            | `http://core-app.railway.internal:3000`            |
| `AI_PERSONALITY_URL`      | `http://ai-personality.railway.internal:8200`      |
| `MODEL_ROUTER_URL`        | `http://model-router.railway.internal:3700`        |
| `MCP_GATEWAY_URL`         | `http://mcp-gateway.railway.internal:4100`         |
| `SKILLS_URL`              | `http://skills.railway.internal:3200`              |
| `KNOWLEDGE_URL`           | `http://knowledge.railway.internal:3900`           |
| `NOTIFICATIONS_URL`       | `http://notifications.railway.internal:4000`       |
| `AUTO_MOD_URL`            | `http://auto-mod.railway.internal:8700`            |
| `THUMBNAIL_GENERATOR_URL` | `http://thumbnail-generator.railway.internal:8400` |
| `YOUTUBE_PUBLISHER_URL`   | `http://youtube-publisher.railway.internal:8500`   |
| `STREAM_ENGINE_URL`       | `http://stream-engine.railway.internal:3400`       |
| `AGENT_ORCHESTRATOR_URL`  | `http://agent-orchestrator.railway.internal:3300`  |

> **Tip:** Add these as Shared Variables too. Any service that doesn't need a particular
> URL will just ignore it.

---

## Tier 4 — CORS / Auth (web-facing services only)

Applies to: `core-app`, `mcp-gateway`

| Variable               | Notes                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS`         | Comma-separated list of allowed origins, e.g. `https://app.wavestack.io,https://wavestack.io` |
| `AUTH_MODE`            | `hs256` for simple JWT, `jwks` for external IdP                                               |
| `AUTH_JWT_SECRET`      | Required if `AUTH_MODE=hs256`. `openssl rand -hex 32`                                         |
| `AUTH_JWKS_URL`        | Required if `AUTH_MODE=jwks`. Your IdP's JWKS endpoint                                        |
| `AUTH_AUDIENCE`        | JWT audience claim, e.g. `wavestack`                                                          |
| `AUTH_ISSUER`          | JWT issuer claim, e.g. `https://auth.wavestack.io`                                            |
| `TOKEN_ENCRYPTION_KEY` | **Required in production.** `openssl rand -hex 32` (exactly 64 hex chars)                     |

---

## Per-Service Variables

### `core-app` (port 3000)

| Variable                      | Notes                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `PORT`                        | `3000`                                                                                                                  |
| `R2_ACCOUNT_ID`               | Cloudflare R2 account ID (for file storage)                                                                             |
| `R2_ACCESS_KEY_ID`            | R2 access key                                                                                                           |
| `R2_SECRET_ACCESS_KEY`        | R2 secret key                                                                                                           |
| `R2_BUCKET`                   | `wavestack-production`                                                                                                  |
| `R2_PUBLIC_URL`               | Public URL for your R2 bucket/CDN                                                                                       |
| `RATE_LIMIT_POINTS`           | Requests allowed per window (default `100`)                                                                             |
| `RATE_LIMIT_DURATION`         | Window in seconds (default `60`)                                                                                        |
| `AUTH_TOKEN_TTL_SECONDS`      | Access token lifetime (default `900` = 15 min)                                                                          |
| `AUTH_REFRESH_TTL_DAYS`       | Refresh token lifetime (default `30`)                                                                                   |
| `OTEL_ENABLED`                | `true` to enable OpenTelemetry tracing                                                                                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Your OTLP collector endpoint if OTel is enabled                                                                         |
| `SERVICE_CLIENTS_JSON`        | JSON array of machine-to-machine clients: `[{"client_id":"...","client_secret":"...","org_id":"...","scopes":["..."]}]` |

---

### `mcp-gateway` (port 4100)

| Variable             | Notes                                                                             |
| -------------------- | --------------------------------------------------------------------------------- |
| `PORT`               | `4100`                                                                            |
| `OAUTH_CALLBACK_URL` | Public URL for OAuth redirect, e.g. `https://api.wavestack.io/mcp/oauth/callback` |
| `CACHE_TTL_SECONDS`  | MCP response cache TTL (default `300`)                                            |

---

### `agent-orchestrator` (port 3300)

| Variable                 | Notes                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| `PORT`                   | `3300`                                                                   |
| `APPROVAL_TIMEOUT_HOURS` | How long to wait for human approval before auto-cancelling (default `4`) |
| `MAX_CONCURRENT_TASKS`   | Max parallel agent tasks per worker (default `10`)                       |
| `ENV`                    | `production`                                                             |

---

### `model-router` (port 3700)

| Variable                        | Notes                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`                          | `3700`                                                                           |
| `CLAUDE_MODEL`                  | Claude model for standard calls (default `claude-sonnet-4-6`)                    |
| `CLAUDE_COMPLEX_MODEL`          | Claude model for complex/escalated calls (default `claude-opus-4-6`)             |
| `OPENROUTER_BASE_MODEL`         | Base model via OpenRouter (default `meta-llama/llama-3.2-3b-instruct:free`)      |
| `PLATFORM_BASE_MODEL`           | Fine-tune base model on Together AI (default `meta-llama/Llama-3.2-3B-Instruct`) |
| `PERSONAL_MODEL_MIN_CONFIDENCE` | Minimum confidence to use a creator's personal model (default `0.6`)             |
| `PERSONAL_MODEL_MIN_EXAMPLES`   | Minimum training examples required (default `500`)                               |

---

### `ai-personality` (port 8200)

| Variable                  | Notes                                               |
| ------------------------- | --------------------------------------------------- |
| `CHROMA_HOST`             | ChromaDB hostname, e.g. `chromadb.railway.internal` |
| `CHROMA_PORT`             | `8000`                                              |
| `ML_TRAINING_URL`         | `http://ml-training.railway.internal:8300`          |
| `PERSONALITY_TEMPERATURE` | Generation temperature (default `0.8`)              |
| `PERSONALITY_MAX_TOKENS`  | Max tokens per response (default `500`)             |
| `SENTIMENT_FILTERING`     | `true` — filters negative/toxic outputs             |
| `CONTROVERSY_AVOIDANCE`   | `true` — avoids controversial content               |

---

### `skills` (port 3200)

| Variable | Notes  |
| -------- | ------ |
| `PORT`   | `3200` |

---

### `knowledge` (port 3900)

| Variable      | Notes             |
| ------------- | ----------------- |
| `PORT`        | `3900`            |
| `CHROMA_HOST` | ChromaDB hostname |
| `CHROMA_PORT` | `8000`            |

---

### `notifications` (port 4000)

| Variable             | Notes                                                            |
| -------------------- | ---------------------------------------------------------------- |
| `PORT`               | `4000`                                                           |
| `RESEND_API_KEY`     | [resend.com](https://resend.com) — transactional email           |
| `EXPO_ACCESS_TOKEN`  | [expo.dev](https://expo.dev) — push notifications to mobile app  |
| `TELEGRAM_BOT_TOKEN` | If using Telegram for notifications (shared with `telegram-bot`) |

---

### `stream-engine` (port 3400)

| Variable | Notes  |
| -------- | ------ |
| `PORT`   | `3400` |

---

### `link-router` (port 3500)

| Variable        | Notes                                                                                  |
| --------------- | -------------------------------------------------------------------------------------- |
| `PORT`          | `3500`                                                                                 |
| `BASE_URL`      | Public URL of this service, e.g. `https://links.wavestack.io` — used in shortened URLs |
| `LINK_TTL_DAYS` | How long links live (default `365`)                                                    |

---

### `streaming-integrations` (port 3600)

| Variable | Notes  |
| -------- | ------ |
| `PORT`   | `3600` |

Credentials are not static env vars here — they are posted per-org via the API
(`POST /api/v1/streamelements/connect`, `POST /api/v1/streamlabs/connect`) and stored
in Redis.

---

### `analytics-dashboard` (port 8800)

| Variable                 | Notes                                        |
| ------------------------ | -------------------------------------------- |
| `PORT`                   | `8800`                                       |
| `METRICS_RETENTION_DAYS` | How many days to keep metrics (default `90`) |
| `CACHE_TTL_SECONDS`      | Dashboard cache TTL (default `300`)          |

---

### `ml-training` (port 8300)

| Variable            | Notes                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `HUGGINGFACE_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — for downloading base models |
| `ML_BASE_MODEL`     | Base model to fine-tune (default `meta-llama/Llama-2-7b-chat-hf`)                                      |

> **Note:** ML training is compute-heavy. On Railway, use this service on-demand or
> deploy to a GPU provider (RunPod, Modal) and point `ML_TRAINING_URL` at that instead.

---

### `thumbnail-generator` (port 8400)

| Variable                   | Notes                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `THUMBNAIL_IMAGE_PROVIDER` | `openai` (DALL-E) or `stability` or `local` (default `local`)                          |
| `STABILITY_API_KEY`        | [platform.stability.ai](https://platform.stability.ai) — if using Stable Diffusion API |

---

### `youtube-publisher` (port 8500)

| Variable                   | Notes                                                  |
| -------------------------- | ------------------------------------------------------ |
| `YOUTUBE_CLIENT_ID`        | Google Cloud OAuth 2.0 client ID (YouTube Data API v3) |
| `YOUTUBE_CLIENT_SECRET`    | Google Cloud OAuth 2.0 client secret                   |
| `AUTO_GENERATE_THUMBNAILS` | `true`                                                 |
| `USE_AI_DESCRIPTIONS`      | `true`                                                 |
| `USE_AI_TAGS`              | `true`                                                 |

---

### `social-publisher` (port 8600)

| Variable                | Notes                               |
| ----------------------- | ----------------------------------- |
| `INSTAGRAM_USERNAME`    | Instagram account username          |
| `INSTAGRAM_PASSWORD`    | Instagram account password          |
| `TIKTOK_SESSION_ID`     | TikTok session cookie (`sessionid`) |
| `FACEBOOK_ACCESS_TOKEN` | Facebook Page access token          |
| `FACEBOOK_PAGE_ID`      | Facebook Page ID                    |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth access token         |
| `USE_AI_CAPTIONS`       | `true`                              |
| `USE_AI_HASHTAGS`       | `true`                              |

---

### `social-ingest` (port 8100)

| Variable | Notes  |
| -------- | ------ |
| `PORT`   | `8100` |

---

### `auto-mod` (port 8700)

| Variable             | Notes                                                      |
| -------------------- | ---------------------------------------------------------- |
| `TOXICITY_THRESHOLD` | Float 0–1, messages above this are flagged (default `0.7`) |
| `SPAM_THRESHOLD`     | Float 0–1 (default `0.6`)                                  |
| `AUTO_DELETE`        | `true` — auto-delete flagged messages                      |
| `AUTO_TIMEOUT`       | `false` — auto-timeout offenders                           |
| `AUTO_BAN`           | `false` — auto-ban repeat offenders                        |
| `VIOLATIONS_FOR_BAN` | Number of violations before a ban (default `5`)            |

---

### `twitter-autoposter`

| Variable                | Notes                                              |
| ----------------------- | -------------------------------------------------- |
| `TWITTER_API_KEY`       | Twitter Developer App API key                      |
| `TWITTER_API_SECRET`    | Twitter Developer App API secret                   |
| `TWITTER_ACCESS_TOKEN`  | Account access token                               |
| `TWITTER_ACCESS_SECRET` | Account access token secret                        |
| `TWITTER_BEARER_TOKEN`  | Bearer token for read-only endpoints               |
| `TWITTER_POST_INTERVAL` | Minutes between auto-posts (default `60`)          |
| `AUTO_GENERATE_TWEETS`  | `true`                                             |
| `AUTO_POST_ENABLED`     | `false` — set to `true` only when ready to go live |

---

### `discord-bot`

| Variable            | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| `DISCORD_TOKEN`     | Bot token from [discord.com/developers](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_ID` | Application client ID                                                                |
| `USE_AI_MODERATION` | `true`                                                                               |

---

### `twitch-bot`

| Variable               | Notes                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| `TWITCH_BOT_USERNAME`  | The bot's Twitch username                                                   |
| `TWITCH_OAUTH_TOKEN`   | IRC OAuth token (get from [twitchapps.com/tmi](https://twitchapps.com/tmi)) |
| `TWITCH_CLIENT_ID`     | Twitch Developer app client ID                                              |
| `TWITCH_CLIENT_SECRET` | Twitch Developer app client secret                                          |
| `USE_AI_MODERATION`    | `true`                                                                      |

---

### `livestream-analytics` (port 9500)

| Variable               | Notes                                |
| ---------------------- | ------------------------------------ |
| `PORT`                 | `9500`                               |
| `TWITCH_CLIENT_ID`     | Shared with `twitch-bot`             |
| `TWITCH_CLIENT_SECRET` | Shared with `twitch-bot`             |
| `YOUTUBE_API_KEY`      | Google Cloud YouTube Data API v3 key |

---

### `telegram-bot`

| Variable             | Notes                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | From [BotFather](https://t.me/BotFather) — shared with `notifications` |

---

### `whatsapp-bot`

| Variable                     | Notes                                     |
| ---------------------------- | ----------------------------------------- |
| `CREATOR_USER_ID`            | The creator's user ID in the WaveStack DB |
| `WHATSAPP_AUTO_RESPOND`      | `false` — set to `true` when ready        |
| `WHATSAPP_RESPOND_TO_GROUPS` | `true`                                    |

> **Note:** WhatsApp Web.js uses a browser session stored on disk. On Railway this
> requires a persistent volume mount for `/app/.wwebjs_auth`. Scan the QR code once
> on first deploy.

---

### `sponsor-manager` (port 8900)

| Variable         | Notes                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `PORT`           | `8900`                                                                                      |
| `STRIPE_API_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com/apikeys) — for sponsor payment tracking |

---

### `merch-integration` (port 9800)

| Variable            | Notes                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| `PORT`              | `9800`                                                                           |
| `PRINTFUL_API_KEY`  | [printful.com/dashboard/store/api](https://www.printful.com/dashboard/store/api) |
| `TEESPRING_API_KEY` | Spring (Teespring) API key                                                       |
| `SHOPIFY_API_KEY`   | Shopify Admin API key                                                            |
| `SHOPIFY_SHOP_URL`  | Your store URL, e.g. `your-store.myshopify.com`                                  |

---

### `email-marketing` (port 9200)

| Variable            | Notes                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| `SENDGRID_API_KEY`  | [app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys) |
| `MAILCHIMP_API_KEY` | Mailchimp API key                                                                |
| `MAILCHIMP_SERVER`  | Mailchimp server prefix, e.g. `us1`                                              |

---

### `seo-optimizer` (port 9300)

| Variable      | Notes                                      |
| ------------- | ------------------------------------------ |
| `AI_PROVIDER` | `anthropic` or `openai` (default `openai`) |

---

### `n8n` (port 5678) — optional

| Variable                  | Notes                                                                     |
| ------------------------- | ------------------------------------------------------------------------- |
| `N8N_BASIC_AUTH_USER`     | Admin username (default `admin`)                                          |
| `N8N_BASIC_AUTH_PASSWORD` | Strong password                                                           |
| `WEBHOOK_URL`             | Public URL of n8n for incoming webhooks, e.g. `https://n8n.wavestack.io/` |

---

## Infrastructure (Railway-provisioned)

These are not services you build — add them as Railway plugins.

| Service        | Railway Plugin                             | Notes                                                        |
| -------------- | ------------------------------------------ | ------------------------------------------------------------ |
| **PostgreSQL** | Railway Postgres                           | Injects `DATABASE_URL` automatically                         |
| **Redis**      | Railway Redis                              | Injects `REDIS_URL` automatically                            |
| **ChromaDB**   | Deploy from Docker image `chromadb/chroma` | Set `IS_PERSISTENT=TRUE`, mount a volume at `/chroma/chroma` |

---

## Deployment order

Deploy in this order to avoid health-check failures on startup:

1. **Postgres** + **Redis** + **ChromaDB** (infrastructure)
2. `core-app`
3. `model-router`, `ml-training`
4. `ai-personality`, `knowledge`
5. `auto-mod`, `mcp-gateway`, `skills`, `notifications`
6. `agent-orchestrator`, `stream-engine`
7. All content/publishing services (`youtube-publisher`, `social-publisher`,
   `twitter-autoposter`, `thumbnail-generator`, `email-marketing`, `seo-optimizer`,
   `sponsor-manager`, `merch-integration`)
8. All bots (`discord-bot`, `twitch-bot`, `telegram-bot`, `whatsapp-bot`)
9. Supporting services (`analytics-dashboard`, `livestream-analytics`,
   `link-router`, `streaming-integrations`, `social-ingest`)
10. `n8n` (optional)

---

## Secrets that must be generated (never copy-paste defaults)

```bash
# TOKEN_ENCRYPTION_KEY — core-app
openssl rand -hex 32

# AUTH_JWT_SECRET — core-app (if AUTH_MODE=hs256)
openssl rand -hex 32

# INTERNAL_SERVICE_SECRET — all services
openssl rand -hex 32
```
