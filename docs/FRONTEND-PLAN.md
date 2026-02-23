# WaveStack Frontend Plan

> A modern, AI-native web dashboard for the WaveStack creator automation platform — with autonomous agents, MCP tool integration, and a composable skills ecosystem.

## Tech Stack (Recommended)

| Layer           | Choice                           | Reason                                   |
| --------------- | -------------------------------- | ---------------------------------------- |
| Framework       | **Next.js 14+ (App Router)**     | SSR, API routes, file-based routing      |
| Language        | **TypeScript**                   | Matches backend, type safety             |
| Styling         | **Tailwind CSS + shadcn/ui**     | Fast, consistent, accessible components  |
| State           | **TanStack Query (React Query)** | Server state caching, real-time sync     |
| Auth            | **NextAuth.js**                  | JWT integration with core-app            |
| Charts          | **Recharts**                     | Lightweight, composable analytics charts |
| Forms           | **React Hook Form + Zod**        | Validation with schema reuse             |
| Video           | **Video.js**                     | Clip preview and editing                 |
| Real-time       | **Socket.IO client**             | Live analytics, bot status               |
| AI SDK          | **Vercel AI SDK**                | Streaming chat UI, tool call rendering   |
| MCP Client      | **@modelcontextprotocol/sdk**    | Connect to MCP servers from frontend     |
| Agent Framework | **LangGraph / Custom**           | Multi-step agent orchestration           |
| Package Manager | **pnpm**                         | Matches existing monorepo                |

---

## Pages & Routes

### 1. Authentication

| Route              | Page              | Description                                      |
| ------------------ | ----------------- | ------------------------------------------------ |
| `/login`           | Login             | Email/password + OAuth (Discord, Twitch, Google) |
| `/register`        | Register          | Account creation with org setup                  |
| `/forgot-password` | Password Reset    | Email-based reset flow                           |
| `/onboarding`      | Onboarding Wizard | Connect platforms, set preferences, guided setup |

### 2. Dashboard

| Route        | Page               | Description                                                                                   |
| ------------ | ------------------ | --------------------------------------------------------------------------------------------- |
| `/dashboard` | **Main Dashboard** | Overview cards: total clips, scheduled posts, active bots, viewer stats, recent activity feed |

**Dashboard Widgets:**

- Quick stats (clips today, posts scheduled, active viewers, engagement rate)
- Recent activity timeline
- Upcoming scheduled content
- Live stream status indicator
- AI personality status
- Platform connection health

### 3. Content Management (CMS)

| Route                   | Page            | Description                                                      |
| ----------------------- | --------------- | ---------------------------------------------------------------- |
| `/content`              | Content Library | Grid/list of all assets (videos, clips, thumbnails) with filters |
| `/content/upload`       | Upload          | Drag-and-drop file upload with metadata form                     |
| `/content/:id`          | Asset Detail    | Preview, metadata editing, publishing history                    |
| `/content/projects`     | Projects        | Organize content into projects/campaigns                         |
| `/content/projects/:id` | Project Detail  | Project assets, settings, team members                           |

### 4. Clipper

| Route           | Page               | Description                                                                  |
| --------------- | ------------------ | ---------------------------------------------------------------------------- |
| `/clips`        | Clips Dashboard    | All clips with status (processing, ready, published)                         |
| `/clips/create` | Create Clip        | Source URL input, timeline scrubber, start/duration picker, format selection |
| `/clips/:id`    | Clip Detail        | Video preview, download, publish actions, metadata                           |
| `/clips/auto`   | Auto-Clip Settings | Configure keyword triggers, highlight detection rules                        |

**Key UI Components:**

- Video timeline scrubber with frame preview
- Real-time clip processing status bar
- Batch clip creation from a single source
- Quick publish to platforms from clip view

### 5. Publishing & Queue

| Route               | Page            | Description                                             |
| ------------------- | --------------- | ------------------------------------------------------- |
| `/publish`          | Publishing Hub  | Overview of all publishing activity                     |
| `/publish/queue`    | Content Queue   | Drag-and-drop reorderable queue, schedule calendar view |
| `/publish/schedule` | Calendar View   | Monthly/weekly calendar of scheduled posts              |
| `/publish/history`  | Publish History | Past publications with platform links and performance   |
| `/publish/compose`  | Compose Post    | Multi-platform post composer with preview per platform  |

**Key UI Components:**

- Calendar with drag-to-schedule
- Platform-specific preview panels (YouTube card, Instagram post, Tweet, TikTok)
- Hashtag suggestions (AI-powered)
- AI caption generator integration
- Bulk scheduling

### 6. Analytics

| Route                 | Page                | Description                                            |
| --------------------- | ------------------- | ------------------------------------------------------ |
| `/analytics`          | Analytics Overview  | High-level metrics across all platforms                |
| `/analytics/streams`  | Stream Analytics    | Live/past stream performance (viewers, chat, peaks)    |
| `/analytics/content`  | Content Performance | Per-post engagement, reach, impressions                |
| `/analytics/audience` | Audience Insights   | Demographics, growth trends, top fans                  |
| `/analytics/revenue`  | Revenue Analytics   | Sponsorship income, merch sales, donations, ad revenue |

**Charts & Visualizations:**

- Viewer count over time (line chart)
- Platform comparison (bar chart)
- Engagement funnel (funnel chart)
- Growth trend (area chart)
- Top content leaderboard (table)
- Audience heatmap (active hours)
- Revenue breakdown (pie/donut chart)

### 7. Bots Management

| Route                      | Page              | Description                                                     |
| -------------------------- | ----------------- | --------------------------------------------------------------- |
| `/bots`                    | Bots Overview     | Status cards for Discord, Twitch, Telegram, WhatsApp bots       |
| `/bots/discord`            | Discord Bot       | Server list, command config, economy settings, moderation rules |
| `/bots/discord/commands`   | Command Manager   | Enable/disable commands, set permissions, cooldowns             |
| `/bots/discord/economy`    | Economy Settings  | Points, levels, daily rewards, shop items                       |
| `/bots/discord/moderation` | Moderation Config | Auto-mod rules, word filters, spam thresholds                   |
| `/bots/discord/welcome`    | Welcome System    | Welcome message editor, auto-role assignment                    |
| `/bots/twitch`             | Twitch Bot        | Channel list, command config, OBS integration                   |
| `/bots/twitch/commands`    | Twitch Commands   | Custom commands, timers, cooldowns                              |
| `/bots/twitch/obs`         | OBS Control       | Scene management, source control, hotkeys                       |
| `/bots/twitch/alerts`      | Alert Config      | Sub/raid/follow alert customization                             |
| `/bots/telegram`           | Telegram Bot      | Chat config, AI response settings                               |
| `/bots/whatsapp`           | WhatsApp Bot      | Chat config, auto-reply rules                                   |
| `/bots/logs`               | Bot Logs          | Real-time log viewer across all bots                            |

### 8. AI Personality

| Route               | Page               | Description                                              |
| ------------------- | ------------------ | -------------------------------------------------------- |
| `/ai`               | AI Overview        | Personality status, confidence score, recent generations |
| `/ai/personality`   | Personality Config | Edit tone, style, topics, catchphrases, boundaries       |
| `/ai/training`      | Training Data      | Upload/manage training content, view learning progress   |
| `/ai/generate`      | Content Generator  | Generate tweets, captions, replies with preview & edit   |
| `/ai/conversations` | Conversations      | View AI conversation history across platforms            |
| `/ai/memory`        | Memory Browser     | View/edit stored memories, facts, preferences            |

### 9. Auto-Moderation

| Route               | Page                 | Description                                        |
| ------------------- | -------------------- | -------------------------------------------------- |
| `/moderation`       | Moderation Dashboard | Flagged content queue, action history              |
| `/moderation/rules` | Rule Editor          | Toxicity/spam/NSFW thresholds per platform         |
| `/moderation/queue` | Review Queue         | Flagged items awaiting human review                |
| `/moderation/log`   | Action Log           | History of auto-mod actions (delete, timeout, ban) |

### 10. SEO & Growth

| Route           | Page             | Description                                 |
| --------------- | ---------------- | ------------------------------------------- |
| `/seo`          | SEO Dashboard    | Content SEO scores, improvement suggestions |
| `/seo/optimize` | SEO Optimizer    | AI-powered title/description/tag generator  |
| `/seo/keywords` | Keyword Research | Trending keywords and search volume         |

### 11. Monetization

| Route                        | Page             | Description                                            |
| ---------------------------- | ---------------- | ------------------------------------------------------ |
| `/monetization`              | Revenue Overview | Combined revenue from all sources                      |
| `/monetization/sponsors`     | Sponsor Manager  | Sponsor relationships, contracts, deliverables tracker |
| `/monetization/sponsors/:id` | Sponsor Detail   | Contact info, deal terms, payment history              |
| `/monetization/merch`        | Merch Store      | Product catalog, Printful/Shopify integration          |
| `/monetization/email`        | Email Marketing  | Campaign builder, subscriber management, templates     |
| `/monetization/links`        | Link Router      | Short links, UTM tracking, click analytics             |

### 12. AI Command Center (Autonomous Agents)

| Route               | Page                      | Description                                                                                                 |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/agents`           | **Agent Hub**             | Overview of all AI agents — active, idle, paused — with live activity feed                                  |
| `/agents/chat`      | **AI Chat Interface**     | Conversational UI to control WaveStack via natural language ("clip the last 30 seconds and post to TikTok") |
| `/agents/autonomy`  | **Autonomy Settings**     | Global autonomy level slider (Manual → Copilot → Autopilot) per domain                                      |
| `/agents/tasks`     | **Agent Task Queue**      | Live view of what agents are doing, pending approvals, completed actions                                    |
| `/agents/tasks/:id` | **Task Detail**           | Step-by-step agent reasoning trace, tool calls made, results, human override                                |
| `/agents/policies`  | **Guardrails & Policies** | Define what agents can/cannot do autonomously (spending limits, platform rules, content guidelines)         |
| `/agents/logs`      | **Decision Log**          | Full audit trail of every autonomous decision with reasoning                                                |
| `/agents/schedules` | **Scheduled Agents**      | Cron-like agent runs ("every Monday, generate 5 tweet drafts")                                              |

**Autonomy Levels (per domain):**
| Level | Behavior | Example |
|-------|----------|---------|
| **Manual** | Agent suggests, human executes | "I recommend posting this clip to YouTube" |
| **Copilot** | Agent drafts, human approves | Shows draft post → user clicks Approve/Edit/Reject |
| **Autopilot** | Agent executes, human monitors | Auto-posts clips, user gets notification after |

**AI Chat Interface Features:**

- Natural language commands with streaming responses
- Inline tool call visualization (shows what the AI is doing)
- Multi-turn context (remembers conversation)
- Quick action chips ("Clip it", "Post now", "Schedule for later")
- Voice input support (Web Speech API)
- Slash commands inside chat (`/clip`, `/publish`, `/analytics`)
- Agent handoff — chat can spawn background agents for long tasks
- Confirmation dialogs for destructive/costly actions

**Agent Types:**
| Agent | Purpose | Default Autonomy |
|-------|---------|-------------------|
| **Content Agent** | Generate captions, titles, descriptions | Copilot |
| **Clip Agent** | Detect highlights, create clips | Copilot |
| **Publishing Agent** | Schedule and publish content | Copilot |
| **Moderation Agent** | Review flagged content, take action | Autopilot |
| **Analytics Agent** | Generate insights, weekly reports | Autopilot |
| **Growth Agent** | SEO optimization, trend surfing | Copilot |
| **Community Agent** | Respond to DMs, comments, mentions | Manual |
| **Revenue Agent** | Track sponsorships, optimize monetization | Manual |

### 13. MCP Tools Hub (Model Context Protocol)

| Route              | Page                 | Description                                                               |
| ------------------ | -------------------- | ------------------------------------------------------------------------- |
| `/mcp`             | **MCP Dashboard**    | Connected MCP servers, available tools, usage stats                       |
| `/mcp/servers`     | **Server Registry**  | Browse, connect, and configure MCP servers                                |
| `/mcp/servers/add` | **Add MCP Server**   | Connect via stdio, SSE, or HTTP — with connection testing                 |
| `/mcp/servers/:id` | **Server Detail**    | Server health, available tools/resources/prompts, config                  |
| `/mcp/tools`       | **Tool Explorer**    | Browse all available tools across connected servers with search           |
| `/mcp/tools/:id`   | **Tool Detail**      | Schema viewer, test playground, usage analytics, permissions              |
| `/mcp/playground`  | **MCP Playground**   | Interactive tool testing — pick a tool, fill params, execute, see results |
| `/mcp/resources`   | **Resource Browser** | Browse MCP resources (files, data, context) exposed by servers            |
| `/mcp/prompts`     | **Prompt Templates** | MCP prompt templates with variable filling                                |

**MCP Server Categories:**
| Category | Example Servers | Purpose |
|----------|----------------|---------|
| **Platform APIs** | YouTube MCP, Twitch MCP, Discord MCP | Direct platform access |
| **Content Tools** | FFmpeg MCP, ImageMagick MCP | Media processing |
| **AI Providers** | OpenAI MCP, Anthropic MCP, Ollama MCP | Model access |
| **Data Sources** | PostgreSQL MCP, Redis MCP, Analytics MCP | Data querying |
| **External** | Google Drive MCP, Notion MCP, Slack MCP | Third-party integrations |
| **Custom** | WaveStack Internal MCP | Internal service orchestration |

**Key UI Components:**

- Server connection status indicators (green/yellow/red)
- Tool schema auto-form generator (builds UI from JSON Schema)
- Real-time tool execution output stream
- Permission matrix (which agents can use which tools)
- Tool usage analytics and cost tracking

### 14. Skills & Tools Library

| Route                 | Page                   | Description                                                       |
| --------------------- | ---------------------- | ----------------------------------------------------------------- |
| `/skills`             | **Skills Marketplace** | Browse, search, and install skills — community + official         |
| `/skills/installed`   | **My Skills**          | Manage installed skills, enable/disable, configure                |
| `/skills/:id`         | **Skill Detail**       | Description, inputs/outputs, reviews, install button              |
| `/skills/create`      | **Skill Builder**      | Visual skill composer — chain tools into reusable workflows       |
| `/skills/create/code` | **Code Editor**        | Write custom skills in TypeScript/Python with live preview        |
| `/skills/categories`  | **Categories**         | Browse by category (content, analytics, growth, moderation, etc.) |
| `/skills/community`   | **Community Hub**      | Share skills, fork others, version control                        |

**What is a Skill?**
A skill is a composable, reusable unit of automation that combines one or more tools/MCP calls into a named action. Think of it like a "recipe" or "macro" for creator workflows.

**Example Skills:**
| Skill | Description | Tools Used |
|-------|-------------|------------|
| **Clip & Ship** | Auto-clip highlight → generate thumbnail → write caption → publish to TikTok + YouTube Shorts | Clipper, Thumbnail Gen, AI Personality, Social Publisher |
| **Stream Recap** | After stream ends → generate summary → create highlight reel → post recap thread on Twitter | Livestream Analytics, Clipper, AI Content Gen, Twitter Autoposter |
| **Trend Surfer** | Monitor trending topics → generate relevant content ideas → draft posts | SEO Optimizer, AI Personality, Content Queue |
| **Sponsor Report** | Pull analytics → generate branded performance report → email to sponsor | Analytics, AI Content Gen, Email Marketing |
| **Wake Up Post** | Every morning → check trending → draft tweet → queue for review | SEO, AI Personality, Content Queue |
| **Raid Thank You** | On Twitch raid → auto-shoutout → clip raid moment → post to Discord | Twitch Bot, Clipper, Discord Bot |
| **Content Recycler** | Find top-performing old content → repurpose for different platform | Analytics, AI Personality, Publisher |

**Skill Builder UI:**

```
┌──────────────────────────────────────────────┐
│  Skill Builder: "Clip & Ship"                │
├──────────────────────────────────────────────┤
│                                              │
│  [Trigger]──→[Clip Video]──→[Gen Thumbnail]  │
│                    │              │           │
│                    ▼              ▼           │
│              [AI Caption]──→[Publish]         │
│                              ├→ TikTok       │
│                              ├→ YT Shorts    │
│                              └→ Instagram    │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │ Node Config: AI Caption             │     │
│  │ Model: claude-sonnet-4-5            │     │
│  │ Tone: Match personality profile     │     │
│  │ Max length: 150 chars               │     │
│  │ Include hashtags: Yes               │     │
│  └─────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

**Skill Properties:**

- **Trigger types:** Manual, Scheduled (cron), Event-driven (webhook, stream start, raid, etc.)
- **Input/Output contracts:** Typed schemas so skills can chain together
- **Versioning:** Semantic versioning with rollback
- **Permissions:** Which MCP tools and autonomy level required
- **Cost estimation:** Estimated API/compute cost per run

### 15. AI Knowledge Base & RAG

| Route                    | Page                 | Description                                                     |
| ------------------------ | -------------------- | --------------------------------------------------------------- |
| `/knowledge`             | **Knowledge Base**   | Central knowledge store for AI agents                           |
| `/knowledge/sources`     | **Data Sources**     | Connect data: past streams, tweets, Discord history, docs, FAQs |
| `/knowledge/sources/add` | **Add Source**       | Upload files, connect URLs, sync platforms                      |
| `/knowledge/search`      | **Semantic Search**  | Natural language search across all ingested knowledge           |
| `/knowledge/embeddings`  | **Embedding Status** | ChromaDB vector store stats, re-index triggers                  |
| `/knowledge/context`     | **Context Rules**    | Define what knowledge is available to which agents/skills       |

**Supported Source Types:**

- PDF, Markdown, Text files (drag-and-drop upload)
- YouTube video transcripts (auto-transcribe)
- Twitch VOD chat logs
- Discord channel history
- Twitter/X post archive
- Notion pages (via MCP)
- Google Docs (via MCP)
- Website URLs (crawl and index)
- Custom API endpoints

### 16. Agent-to-Agent Collaboration

| Route                  | Page             | Description                                                 |
| ---------------------- | ---------------- | ----------------------------------------------------------- |
| `/agents/crews`        | **Agent Crews**  | Define groups of agents that work together on complex tasks |
| `/agents/crews/:id`    | **Crew Detail**  | Agent roles, communication flow, shared context             |
| `/agents/crews/create` | **Crew Builder** | Visual editor to wire agents together with handoff rules    |

**Example Crew: "Full Content Pipeline"**

```
Content Agent (research)
    → Clip Agent (create clips)
    → Content Agent (write captions)
    → Growth Agent (SEO optimize)
    → Publishing Agent (schedule & post)
    → Analytics Agent (report results after 24h)
```

### 17. Workflows (n8n)

| Route               | Page             | Description                                          |
| ------------------- | ---------------- | ---------------------------------------------------- |
| `/workflows`        | Workflow Library | Pre-built and custom automation workflows            |
| `/workflows/:id`    | Workflow Detail  | Visual workflow preview, enable/disable, run history |
| `/workflows/create` | Create Workflow  | Template picker or embed n8n editor                  |

### 13. Settings

| Route                     | Page                 | Description                                                |
| ------------------------- | -------------------- | ---------------------------------------------------------- |
| `/settings`               | General Settings     | App preferences, timezone, language                        |
| `/settings/profile`       | Profile              | User profile, avatar, display name                         |
| `/settings/organization`  | Organization         | Org name, plan, billing                                    |
| `/settings/team`          | Team Management      | Invite members, assign roles, permissions                  |
| `/settings/integrations`  | Platform Connections | Connect/disconnect Discord, Twitch, YouTube, Twitter, etc. |
| `/settings/api`           | API Keys             | Manage API keys, view usage                                |
| `/settings/storage`       | Storage Config       | Choose storage backend (local, S3, GDrive, OneDrive)       |
| `/settings/notifications` | Notifications        | Email/push notification preferences                        |
| `/settings/billing`       | Billing              | Plan management, payment method, invoices                  |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Top Bar: Logo | Search | Notifications | Profile   │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  Sidebar │          Main Content Area               │
│          │                                          │
│  - Dashboard                                        │
│  - AI Chat (persistent bottom panel)                │
│  - Content                                          │
│  - Clips                                            │
│  - Publish                                          │
│  - Analytics                                        │
│  ─── AI & Automation ───                            │
│  - Agents                                           │
│  - Skills                                           │
│  - MCP Tools                                        │
│  - Knowledge                                        │
│  ─── Platform ───                                   │
│  - Bots                                             │
│  - AI Personality                                   │
│  - Moderation                                       │
│  - SEO                                              │
│  - Monetization                                     │
│  - Workflows                                        │
│  - Settings                                         │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│  Status Bar: Connected services | Live indicators    │
└─────────────────────────────────────────────────────┘
```

### Responsive Behavior

- **Desktop (1280px+):** Full sidebar + content
- **Tablet (768-1279px):** Collapsible sidebar (icons only)
- **Mobile (< 768px):** Bottom nav bar + hamburger menu

---

## Shared Components

| Component             | Usage                                                       |
| --------------------- | ----------------------------------------------------------- |
| `DataTable`           | Sortable, filterable, paginated tables (clips, queue, logs) |
| `StatCard`            | Metric display with trend indicator                         |
| `PlatformBadge`       | Platform icon + name (YouTube, Twitch, Discord, etc.)       |
| `StatusBadge`         | Color-coded status (processing, ready, published, failed)   |
| `VideoPlayer`         | Clip/video preview with timeline controls                   |
| `ScheduleCalendar`    | Calendar component for content scheduling                   |
| `AIPromptInput`       | Text input with AI generation button                        |
| `FileUploader`        | Drag-and-drop with progress bar                             |
| `ConfirmDialog`       | Destructive action confirmation                             |
| `EmptyState`          | Illustrated empty states for each section                   |
| `CommandPalette`      | Cmd+K quick navigation                                      |
| `Toast`               | Success/error/info notifications                            |
| `BotStatusIndicator`  | Online/offline/error status for bots                        |
| `AgentActivityFeed`   | Real-time stream of agent actions and decisions             |
| `AutonomySlider`      | 3-level autonomy toggle (Manual/Copilot/Autopilot)          |
| `ToolCallCard`        | Expandable card showing MCP tool execution (input → output) |
| `ChatInterface`       | Streaming AI chat with tool call visualization              |
| `SkillNode`           | Drag-and-drop node for the visual skill builder             |
| `SkillFlowCanvas`     | React Flow-based canvas for wiring skills together          |
| `ApprovalBanner`      | Inline approval request from agent ("Approve this post?")   |
| `ReasoningTrace`      | Collapsible step-by-step agent thinking display             |
| `SchemaForm`          | Auto-generated form from JSON Schema (for MCP tool params)  |
| `KnowledgeSourceCard` | Card showing ingestion status of a knowledge source         |
| `CostEstimator`       | Estimated API/compute cost badge for skills and agent runs  |

---

## API Integration Map

| Frontend Section | Backend Service(s)                                         | Port(s)          |
| ---------------- | ---------------------------------------------------------- | ---------------- |
| Auth             | Core App (auth module)                                     | 3000             |
| Dashboard        | Core App + Analytics Dashboard                             | 3000, 8800       |
| Content/CMS      | Core App (cms module)                                      | 3000             |
| Clips            | Clipper Service                                            | 8000             |
| Publishing       | Core App (queue/publisher) + YouTube/Social Publisher      | 3000, 8500, 8600 |
| Analytics        | Analytics Dashboard + Social Ingest + Livestream Analytics | 8800, 8100, 9500 |
| Discord Bot      | Discord Bot (via Core App API)                             | 3000             |
| Twitch Bot       | Twitch Bot (via Core App API)                              | 3000             |
| AI Personality   | AI Personality Service                                     | 8200             |
| Auto-Moderation  | Auto-Mod Service                                           | 8700             |
| SEO              | SEO Optimizer Service                                      | 9300             |
| Sponsors         | Sponsor Manager Service                                    | 8900             |
| Merch            | Merch Integration Service                                  | 9800             |
| Email Marketing  | Email Marketing Service                                    | 9200             |
| Thumbnails       | Thumbnail Generator                                        | 8400             |
| AI Agents        | AI Personality + Core App + All Services                   | 8200, 3000       |
| MCP Hub          | MCP Gateway (new) + Connected MCP Servers                  | 3100 (new)       |
| Skills Library   | Skills Service (new) + MCP Gateway                         | 3200 (new)       |
| Knowledge Base   | AI Personality (ChromaDB) + Social Ingest                  | 8200, 8100       |
| Agent Crews      | Agent Orchestrator (new)                                   | 3300 (new)       |

---

## Page Count Summary

| Section                     | Pages         |
| --------------------------- | ------------- |
| Auth & Onboarding           | 4             |
| Dashboard                   | 1             |
| Content Management          | 5             |
| Clipper                     | 4             |
| Publishing & Queue          | 5             |
| Analytics                   | 5             |
| Bots Management             | 13            |
| AI Personality              | 6             |
| Auto-Moderation             | 4             |
| SEO & Growth                | 3             |
| Monetization                | 6             |
| **AI Command Center**       | **8**         |
| **MCP Tools Hub**           | **9**         |
| **Skills & Tools Library**  | **7**         |
| **AI Knowledge Base & RAG** | **6**         |
| **Agent Crews**             | **3**         |
| Workflows                   | 3             |
| Settings                    | 9             |
| **Total**                   | **101 pages** |

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- Auth (login, register)
- Dashboard (overview)
- Content library + upload
- Clips (create, list, detail)
- Publishing queue + compose
- Settings (profile, integrations)
- **~18 pages**

### Phase 2: Intelligence

- AI Personality (config, generate, training)
- Auto-Moderation (dashboard, rules)
- SEO Optimizer
- Analytics (overview, streams, content)
- **~12 pages**

### Phase 3: Bot Control Center

- Discord Bot management (full suite)
- Twitch Bot management (full suite)
- Telegram & WhatsApp config
- Bot logs
- **~13 pages**

### Phase 4: Monetization & Growth

- Sponsor Manager
- Merch Integration
- Email Marketing
- Revenue Analytics
- Link Router
- Audience Insights
- **~12 pages**

### Phase 5: AI Autonomy & Agents

- AI Chat Interface (natural language control)
- Agent Hub with autonomy levels
- Agent Task Queue + approval flows
- Guardrails & policies
- Decision audit log
- Scheduled agents
- **~8 pages**

### Phase 6: MCP & Tools Ecosystem

- MCP Server registry + connection manager
- Tool Explorer + Playground
- Resource browser + prompt templates
- Permission matrix for agent-tool access
- **~9 pages**

### Phase 7: Skills Marketplace & Knowledge

- Skills marketplace (browse, install, configure)
- Visual Skill Builder (node-based editor)
- Code editor for custom skills
- Community sharing + versioning
- Knowledge Base + RAG pipeline
- Semantic search across all creator data
- **~13 pages**

### Phase 8: Agent Collaboration & Polish

- Agent Crews (multi-agent pipelines)
- Crew builder (visual wiring)
- Workflow builder (n8n integration)
- Calendar scheduling view
- Onboarding wizard
- Command palette
- Mobile optimization
- Team management
- Billing & plans
- **~16 pages**

---

## Design Principles

1. **Creator-first:** Every UI decision should minimize clicks for common creator workflows
2. **Glanceable:** Dashboard and status pages should convey state in < 2 seconds
3. **Dark mode default:** Creators work late — dark theme primary, light theme optional
4. **Real-time:** Live indicators for streams, bot status, clip processing, agent activity
5. **Keyboard-friendly:** Power users should be able to navigate entirely via keyboard
6. **Progressive disclosure:** Show essential info first, details on demand
7. **Platform-aware:** Show platform-specific previews when composing content
8. **AI-native:** AI is not a bolt-on — it's the primary interaction model. Chat-first, forms second
9. **Human-in-the-loop:** Agents always have clear autonomy boundaries. Users see what agents do and why
10. **Composable:** Skills, tools, and agents are building blocks that users mix and match
11. **Transparent:** Every AI decision has a viewable reasoning trace and audit log
12. **Cost-aware:** Show estimated and actual costs for AI operations so creators stay in budget

---

## New Backend Services Required

These new services need to be built to support the AI-native frontend:

| Service                | Port          | Stack              | Purpose                                                                         |
| ---------------------- | ------------- | ------------------ | ------------------------------------------------------------------------------- |
| **MCP Gateway**        | 3100          | TypeScript/Fastify | Central MCP server manager — connects, routes, and caches MCP tool calls        |
| **Skills Service**     | 3200          | TypeScript/Fastify | Skill storage, versioning, marketplace, execution engine                        |
| **Agent Orchestrator** | 3300          | Python/FastAPI     | Multi-agent coordination, task planning, crew execution, approval queue         |
| **Knowledge Service**  | (extend 8200) | Python/FastAPI     | RAG pipeline, document ingestion, embedding management (extends AI Personality) |

### MCP Gateway Architecture

```
Frontend ──→ MCP Gateway ──→ MCP Server A (YouTube API)
                          ──→ MCP Server B (FFmpeg tools)
                          ──→ MCP Server C (PostgreSQL)
                          ──→ MCP Server D (Custom WaveStack)
                          ──→ MCP Server E (External/Community)
```

### Agent Orchestrator Architecture

```
User (Chat/UI) ──→ Agent Orchestrator
                        │
                        ├──→ Task Planner (breaks down intent)
                        ├──→ Tool Router (selects MCP tools)
                        ├──→ Approval Queue (human-in-the-loop)
                        ├──→ Execution Engine (runs skills/tools)
                        └──→ Memory Store (conversation + long-term)
```

//// last stop
597 + ├──→ Execution Engine (runs skills/tools)  
 598 + └──→ Memory Store (conversation + long-term)  
 599 +```

⏺ Now update the sidebar layout to include the new sections:

⏺ Update(docs/FRONTEND-PLAN.md)
⎿ Added 8 lines, removed 1 line
369 │ Sidebar │ Main Content Area │
370 │ │ │
371 │ - Dashboard │
372 +│ - AI Chat (persistent bottom panel) │  
 373 │ - Content │
374 │ - Clips │
375 │ - Publish │
376 │ - Analytics │
377 +│ ─── AI & Automation ─── │  
 378 +│ - Agents │  
 379 +│ - Skills │  
 380 +│ - MCP Tools │  
 381 +│ - Knowledge │  
 382 +│ ─── Platform ─── │  
 383 │ - Bots │
377 -│ - AI │  
 384 +│ - AI Personality │  
 385 │ - Moderation │
386 │ - SEO │
387 │ - Monetization │

⏺ The doc is updated. Here's what was added:

5 new major sections (+33 pages, 101 total):

AI Command Center (8 pages)

- AI Chat Interface — natural language control of the entire platform ("clip the last 30 seconds and post
  to TikTok")
- Autonomy levels — per-domain Manual / Copilot / Autopilot slider
- 8 agent types (Content, Clip, Publishing, Moderation, Analytics, Growth, Community, Revenue)
- Approval flows — agents request permission for actions outside their guardrails
- Decision audit log — full reasoning trace for every autonomous action

MCP Tools Hub (9 pages)

- Server registry — connect MCP servers via stdio/SSE/HTTP
- Tool Explorer — browse all tools across servers with search
- Playground — interactive tool testing with auto-generated forms from JSON Schema
- Resource browser + prompt templates
- Permission matrix — which agents can access which tools

Skills & Tools Library (7 pages)

- Skills Marketplace — browse, install, share reusable automation recipes
- Visual Skill Builder — node-based editor to chain tools into workflows (like "Clip & Ship": auto-clip →
  thumbnail → caption → publish)
- Code editor for custom skills in TypeScript/Python
- Community hub with versioning and forking

Knowledge Base & RAG (6 pages)

- Ingest past streams, tweets, Discord history, docs, FAQs
- Semantic search across all creator data
- Context rules — control what knowledge each agent can access

Agent Crews (3 pages)

- Wire multiple agents into collaborative pipelines
- Visual crew builder with handoff rules

Also added 4 new backend services needed (MCP Gateway, Skills Service, Agent Orchestrator, Knowledge
Service) and updated the implementation to 8 phases.

Check out the full doc at docs/FRONTEND-PLAN.md — let me know if you want to adjust anything or start
building.

✻ Cogitated for 2m 50s

❯ great now lets start and add the new backend services

⏺ Entered plan mode
Claude is now exploring and designing an implementation approach.

⏺ Let me explore the existing backend services to understand the patterns, architecture, and conventions used
across the codebase.

⏺ Explore(Explore core-app patterns)
⎿ Done (27 tool uses · 38.2k tokens · 2m 20s)
(ctrl+o to expand)

⏺ Explore(Explore existing services patterns)
⎿ Done (44 tool uses · 56.3k tokens · 1m 36s)
(ctrl+o to expand)

⏺ Now I have a thorough understanding of the codebase patterns. Let me design the implementation plan.

⏺ Plan(Plan new backend services)
⎿ Done (40 tool uses · 56.8k tokens · 3m 29s)
(ctrl+o to expand)

⏺ Now let me write the final plan based on all the exploration and design work.

⏺ Updated plan
⎿ /plan to preview
⎿ Tool use rejected with user message: our direct focus is the frontend, so if endpoints don't exist yet,
just mock and we'll get to it, then for the backend services that don't exist, you can create a folder
and a rough readme in them so i can build (as well as the best language stack for it ) as ides that,
everything is great, we can start

⏺ Updated plan
⎿ /plan to preview

⏺ User approved Claude's plan  
 ⎿ Plan saved to: ~/.claude/plans/jaunty-imagining-prism.md · /plan to edit
Plan: Add 4 New AI-Native Backend Services

     Context

     WaveStack is a creator automation platform with 26+ microservices. The frontend plan
     (docs/FRONTEND-PLAN.md) calls for AI autonomy, MCP tool integration, a skills marketplace, and a
     knowledge base — but no backend services exist for these yet. We need to build 4 new services that
     power the AI-native frontend sections.

     Build Order

     Services must be built in dependency order:

     1. MCP Gateway (Port 3100, TypeScript/Fastify) — no new-service deps
     2. Knowledge Service (Port 3400, Python/FastAPI) — no new-service deps
     3. Skills Service (Port 3200, TypeScript/Fastify) — depends on MCP Gateway
     4. Agent Orchestrator (Port 3300, Python/FastAPI) — depends on all three above

     Reference Patterns

     All new services follow existing conventions found in:
     - TypeScript pattern: services/social-ingest/ (Fastify + Prisma + pnpm + pino + Redis)
     - Python pattern: services/ai-personality/ (FastAPI + Prisma + pydantic-settings + Redis +
     lifespan)
     - Docker: docker-compose.yml at project root
     - DB: All services share PostgreSQL (postgresql://postgres:wave@postgres:5432/wave) with separate
     Prisma schemas and @@map table prefixes
     - Redis: All services share redis://redis:6379
     - API convention: /health + /api/v1/... prefix
     - Auth: Services trust X-Org-Id / X-User-Id headers from gateway

     ---
     Service 1: MCP Gateway (services/mcp-gateway/)

     Purpose: Central hub that connects to MCP servers, discovers tools, routes tool calls, caches
     results, and tracks permissions/usage.

     Directory Structure

     services/mcp-gateway/
     ├── Dockerfile
     ├── package.json
     ├── tsconfig.json
     ├── .env.example
     ├── prisma/
     │   └── schema.prisma
     └── src/
         ├── index.ts              # Fastify entry, Redis, Prisma, graceful shutdown
         ├── config/
         │   └── env.ts            # Zod env validation
         ├── shared/
         │   ├── db.ts             # PrismaClient singleton
         │   ├── logger.ts         # pino logger
         │   └── redis.ts          # Redis client singleton
         ├── api/
         │   ├── routes.ts         # Plugin registering all route groups
         │   ├── servers.ts        # CRUD MCP server connections
         │   ├── tools.ts          # Tool discovery + invocation
         │   ├── permissions.ts    # Agent-tool permission matrix
         │   └── analytics.ts      # Usage stats
         └── mcp/
             ├── manager.ts        # Connection lifecycle, reconnection
             ├── router.ts         # Routes tool calls to correct server
             ├── cache.ts          # Redis-backed result cache
             ├── types.ts          # MCP types
             └── transports/
                 ├── stdio.ts
                 ├── sse.ts
                 └── http.ts

     Prisma Models

     - McpServer — id, orgId, name, slug, transport, config(Json), status, lastPingAt →
     @@map("mcp_servers")
     - McpTool — id, serverId, name, description, inputSchema(Json), isEnabled → @@map("mcp_tools")
     - McpToolPermission — id, toolId, agentType, allowed → @@map("mcp_tool_permissions")
     - McpToolUsage — id, toolId, callerId, callerType, input, output, durationMs, status, cached →
     @@map("mcp_tool_usage")

     API Endpoints

     ┌────────┬────────────────────────────────┬────────────────────────────────────────────────────────
     ─┐
     │ Method │              Path              │                         Purpose
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ GET    │ /health                        │ Health check
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ GET    │ /api/v1/servers                │ List MCP servers
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ POST   │ /api/v1/servers                │ Register MCP server
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ GET    │ /api/v1/servers/:id            │ Server details + status
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ PUT    │ /api/v1/servers/:id            │ Update server config
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ DELETE │ /api/v1/servers/:id            │ Remove server
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ POST   │ /api/v1/servers/:id/connect    │ Connect to server
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ POST   │ /api/v1/servers/:id/disconnect │ Disconnect
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ GET    │ /api/v1/tools                  │ List all tools across servers
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ POST   │ /api/v1/tools/call             │ Invoke a tool { tool, arguments, callerId, callerType }
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ GET    │ /api/v1/permissions/:agentType │ Get tool permissions
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ PUT    │ /api/v1/permissions            │ Set permissions
      │
     ├────────┼────────────────────────────────┼────────────────────────────────────────────────────────
     ─┤
     │ GET    │ /api/v1/analytics/usage        │ Usage stats
      │
     └────────┴────────────────────────────────┴────────────────────────────────────────────────────────
     ─┘

     Key Dependencies

     fastify, @fastify/cors, @prisma/client, @modelcontextprotocol/sdk, pino, redis, zod, dotenv

     Environment Variables

     PORT=3100, DATABASE_URL, REDIS_URL, CACHE_TTL_SECONDS=300, LOG_LEVEL=info

     ---
     Service 2: Knowledge Service (services/knowledge/)

     Purpose: RAG pipeline — ingest documents, chunk text, store embeddings in ChromaDB, provide
     semantic search and agent-specific context retrieval.

     Directory Structure

     services/knowledge/
     ├── Dockerfile
     ├── requirements.txt
     ├── .env.example
     ├── prisma/
     │   └── schema.prisma
     └── src/
         ├── __init__.py
         ├── main.py               # FastAPI app, lifespan (Prisma, Redis, ChromaDB)
         ├── config.py             # pydantic-settings
         ├── api/
         │   ├── __init__.py
         │   └── routes.py         # All endpoints
         ├── rag/
         │   ├── __init__.py
         │   ├── embeddings.py     # Embedding generation (OpenAI / Ollama)
         │   ├── ingestion.py      # Document ingestion pipeline
         │   ├── chunking.py       # Text splitting
         │   ├── retrieval.py      # Semantic search + reranking
         │   └── context.py        # Context rules engine per agent
         └── storage/
             ├── __init__.py
             ├── chroma.py         # ChromaDB wrapper
             └── documents.py      # Document metadata helpers

     Prisma Models

     - Document — id, orgId, title, sourceType, sourceUrl, mimeType, content, status, chunkCount,
     collectionId, tags[] → @@map("documents")
     - DocumentChunk — id, documentId, chunkIndex, content, tokenCount, chromaId →
     @@map("document_chunks")
     - ContextRule — id, orgId, agentType, collectionIds[], maxChunks, minRelevance, systemPrompt →
     @@map("context_rules")
     - IngestionJob — id, orgId, documentId, sourceType, status, chunksCreated → @@map("ingestion_jobs")

     API Endpoints

     ┌────────┬──────────────────────────┬───────────────────────────────────────────────────────┐
     │ Method │           Path           │                        Purpose                        │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ GET    │ /health                  │ Health check                                          │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ POST   │ /api/v1/documents/ingest │ Ingest document (file, URL, or text)                  │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ GET    │ /api/v1/documents        │ List documents                                        │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ GET    │ /api/v1/documents/:id    │ Document details                                      │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ DELETE │ /api/v1/documents/:id    │ Remove document + embeddings                          │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ POST   │ /api/v1/search           │ Semantic search { query, orgId, limit }               │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ POST   │ /api/v1/context          │ Get RAG context for agent { query, agentType, orgId } │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ GET    │ /api/v1/collections      │ List ChromaDB collections                             │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ POST   │ /api/v1/collections      │ Create collection                                     │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ GET    │ /api/v1/context-rules    │ List context rules                                    │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ PUT    │ /api/v1/context-rules    │ Create/update context rule                            │
     ├────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
     │ GET    │ /api/v1/jobs             │ List ingestion jobs                                   │
     └────────┴──────────────────────────┴───────────────────────────────────────────────────────┘

     Key Dependencies

     fastapi, uvicorn, prisma, redis, chromadb, openai, sentence-transformers, langchain-text-splitters,
      httpx, python-multipart, beautifulsoup4

     Environment Variables

     PORT=3400, DATABASE_URL, REDIS_URL, CHROMA_HOST=chromadb, CHROMA_PORT=8000, AI_PROVIDER=ollama,
     OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL=text-embedding-3-small, OLLAMA_BASE_URL, CHUNK_SIZE=512,
     CHUNK_OVERLAP=50, LOG_LEVEL=INFO

     ---
     Service 3: Skills Service (services/skills/)

     Purpose: Composable workflow engine — store, version, publish, and execute multi-step "skills" that
      chain MCP tool calls together.

     Directory Structure

     services/skills/
     ├── Dockerfile
     ├── package.json
     ├── tsconfig.json
     ├── .env.example
     ├── prisma/
     │   └── schema.prisma
     └── src/
         ├── index.ts
         ├── config/
         │   └── env.ts
         ├── shared/
         │   ├── db.ts
         │   ├── logger.ts
         │   └── redis.ts
         ├── api/
         │   ├── routes.ts
         │   ├── skills.ts         # CRUD
         │   ├── versions.ts       # Versioning
         │   ├── marketplace.ts    # Publish, install, fork, rate
         │   └── executions.ts     # Run skills, view results
         └── engine/
             ├── executor.ts       # Walk steps, call MCP Gateway, build context
             ├── validator.ts      # Validate skill definitions
             └── types.ts          # SkillStep, SkillDefinition types

     Prisma Models

     - Skill — id, orgId, name, slug, description, category, isPublic, forkedFromId, installCount,
     ratingSum, ratingCount, authorId → @@map("skills")
     - SkillVersion — id, skillId, version(semver), definition(Json), inputSchema(Json),
     outputMapping(Json), isLatest, isPublished → @@map("skill_versions")
     - SkillExecution — id, skillId, versionId, orgId, triggeredBy, triggerType, input, output, status,
     stepResults(Json), durationMs → @@map("skill_executions")
     - SkillRating — id, skillId, userId, rating(1-5), review → @@map("skill_ratings")

     API Endpoints

     ┌────────┬─────────────────────────────────┬───────────────────────────────────────┐
     │ Method │              Path               │                Purpose                │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /health                         │ Health check                          │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /api/v1/skills                  │ List skills (query: category, search) │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/skills                  │ Create skill                          │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /api/v1/skills/:id              │ Get skill                             │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ PUT    │ /api/v1/skills/:id              │ Update skill metadata                 │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ DELETE │ /api/v1/skills/:id              │ Delete skill                          │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/skills/:id/versions     │ Create version                        │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /api/v1/skills/:id/versions     │ List versions                         │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/skills/:id/execute      │ Execute skill { input, triggeredBy }  │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /api/v1/executions              │ List executions                       │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /api/v1/executions/:id          │ Execution detail with step results    │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/executions/:id/cancel   │ Cancel execution                      │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ GET    │ /api/v1/marketplace             │ Browse public skills                  │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/marketplace/:id/install │ Install skill                         │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/marketplace/:id/fork    │ Fork skill                            │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/marketplace/:id/rate    │ Rate skill                            │
     ├────────┼─────────────────────────────────┼───────────────────────────────────────┤
     │ POST   │ /api/v1/skills/:id/publish      │ Publish to marketplace                │
     └────────┴─────────────────────────────────┴───────────────────────────────────────┘

     Execution Engine

     The executor walks skill definition steps sequentially, calling POST
     http://mcp-gateway:3100/api/v1/tools/call for each step. Step outputs are stored in a context
     object so later steps can reference earlier results via template variables.

     Key Dependencies

     fastify, @fastify/cors, @prisma/client, pino, redis, zod, dotenv

     Environment Variables

     PORT=3200, DATABASE_URL, REDIS_URL, MCP_GATEWAY_URL=http://mcp-gateway:3100, LOG_LEVEL=info

     ---
     Service 4: Agent Orchestrator (services/agent-orchestrator/)

     Purpose: Multi-agent coordination — manage agent configs, autonomy levels, task queues with
     approval workflows, agent crews, and an AI chat interface with streaming.

     Directory Structure

     services/agent-orchestrator/
     ├── Dockerfile
     ├── requirements.txt
     ├── .env.example
     ├── prisma/
     │   └── schema.prisma
     └── src/
         ├── __init__.py
         ├── main.py
         ├── config.py
         ├── api/
         │   ├── __init__.py
         │   ├── routes.py
         │   ├── agents.py         # Agent config CRUD
         │   ├── tasks.py          # Task queue
         │   ├── approvals.py      # Approval workflow
         │   ├── crews.py          # Multi-agent crews
         │   └── chat.py           # SSE streaming chat
         ├── agents/
         │   ├── __init__.py
         │   ├── base.py           # BaseAgent class
         │   ├── types.py          # AgentType, AutonomyLevel enums
         │   ├── registry.py       # Agent registry
         │   ├── content.py        # ContentAgent
         │   ├── clip.py           # ClipAgent
         │   ├── publishing.py     # PublishingAgent
         │   ├── moderation.py     # ModerationAgent
         │   ├── analytics.py      # AnalyticsAgent
         │   ├── growth.py         # GrowthAgent
         │   ├── community.py      # CommunityAgent
         │   └── revenue.py        # RevenueAgent
         ├── orchestration/
         │   ├── __init__.py
         │   ├── planner.py        # LLM-powered task decomposition
         │   ├── scheduler.py      # Priority queue scheduling
         │   ├── executor.py       # Execute via skills/MCP tools
         │   ├── approval.py       # Approval queue logic
         │   └── reasoning.py      # Reasoning trace logger
         ├── crews/
         │   ├── __init__.py
         │   ├── manager.py        # Crew lifecycle
         │   └── communication.py  # Agent-to-agent messaging
         └── chat/
             ├── __init__.py
             ├── handler.py        # Chat message routing
             └── streaming.py      # SSE streaming

     Prisma Models

     - AgentConfig — id, orgId, agentType, name, autonomyLevel("manual"|"copilot"|"autopilot"),
     isEnabled, config(Json), allowedSkills[], systemPrompt → @@map("agent_configs")
     - AgentTask — id, orgId, agentId, title, taskType, priority(1-10), status, input, output, skillId,
     reasoningTrace(Json) → @@map("agent_tasks")
     - AgentDecision — id, taskId, agentType, decisionType, reasoning, action(Json), result(Json),
     confidence → @@map("agent_decisions")
     - ApprovalRequest — id, taskId(unique), orgId, agentType, title, description, proposedAction(Json),
      status, reviewedBy, expiresAt → @@map("approval_requests")
     - AgentCrew — id, orgId, name, goal, status → @@map("agent_crews")
     - AgentCrewMember — id, crewId, agentId, role("lead"|"worker"|"reviewer") →
     @@map("agent_crew_members")
     - CrewMessage — id, crewId, fromAgentType, toAgentType, messageType, content(Json) →
     @@map("crew_messages")
     - ChatMessage — id, orgId, sessionId, role, content, agentType, metadata(Json) →
     @@map("chat_messages")

     API Endpoints

     ┌────────┬───────────────────────────────┬───────────────────────────────────────────────────┐
     │ Method │             Path              │                      Purpose                      │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /health                       │ Health check                                      │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/agents                │ List agent configs                                │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/agents/:agentType     │ Get agent config                                  │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ PUT    │ /api/v1/agents/:agentType     │ Update config (autonomy, skills, etc.)            │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/tasks                 │ Create task { agentType, title, input, priority } │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/tasks                 │ List tasks (query: status, agentType)             │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/tasks/:id             │ Task detail + reasoning trace                     │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/tasks/:id/cancel      │ Cancel task                                       │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/approvals             │ List pending approvals                            │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/approvals/:id/approve │ Approve                                           │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/approvals/:id/reject  │ Reject { note }                                   │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/crews                 │ Create crew { name, goal, memberAgentTypes }      │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/crews                 │ List crews                                        │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/crews/:id             │ Crew detail + messages                            │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/crews/:id/start       │ Start crew                                        │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/crews/:id/stop        │ Stop crew                                         │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ POST   │ /api/v1/chat                  │ Chat message → SSE stream response                │
     ├────────┼───────────────────────────────┼───────────────────────────────────────────────────┤
     │ GET    │ /api/v1/chat/:sessionId       │ Chat history                                      │
     └────────┴───────────────────────────────┴───────────────────────────────────────────────────┘

     Key Dependencies

     fastapi, uvicorn, prisma, redis, openai, anthropic, langchain, httpx, sse-starlette

     Environment Variables

     PORT=3300, DATABASE_URL, REDIS_URL, MCP_GATEWAY_URL=http://mcp-gateway:3100,
     SKILLS_URL=http://skills:3200, KNOWLEDGE_URL=http://knowledge:3400,
     AI_PERSONALITY_URL=http://ai-personality:8200, AI_PROVIDER=ollama, OPENAI_API_KEY,
     ANTHROPIC_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL=llama2, MAX_CONCURRENT_TASKS=10,
     APPROVAL_TIMEOUT_HOURS=24, LOG_LEVEL=INFO

     ---
     Docker Compose Changes

     Add these 4 services to docker-compose.yml after the core-app block:

     mcp-gateway:
       build: ./services/mcp-gateway
       ports: ["3100:3100"]
       environment:
         PORT: 3100
         DATABASE_URL: postgresql://postgres:wave@postgres:5432/wave
         REDIS_URL: redis://redis:6379
       depends_on: [postgres, redis]
       restart: unless-stopped

     skills:
       build: ./services/skills
       ports: ["3200:3200"]
       environment:
         PORT: 3200
         DATABASE_URL: postgresql://postgres:wave@postgres:5432/wave
         REDIS_URL: redis://redis:6379
         MCP_GATEWAY_URL: http://mcp-gateway:3100
       depends_on: [postgres, redis, mcp-gateway]
       restart: unless-stopped

     agent-orchestrator:
       build: ./services/agent-orchestrator
       ports: ["3300:3300"]
       environment:
         DATABASE_URL: postgresql://postgres:wave@postgres:5432/wave
         REDIS_URL: redis://redis:6379
         MCP_GATEWAY_URL: http://mcp-gateway:3100
         SKILLS_URL: http://skills:3200
         KNOWLEDGE_URL: http://knowledge:3400
         AI_PERSONALITY_URL: http://ai-personality:8200
         AI_PROVIDER: ${AI_PROVIDER:-ollama}
         OLLAMA_BASE_URL: http://ollama:11434
       depends_on: [postgres, redis, mcp-gateway, skills, knowledge]
       restart: unless-stopped

     knowledge:
       build: ./services/knowledge
       ports: ["3400:3400"]
       environment:
         DATABASE_URL: postgresql://postgres:wave@postgres:5432/wave
         REDIS_URL: redis://redis:6379
         CHROMA_HOST: chromadb
         CHROMA_PORT: 8000
         AI_PROVIDER: ${AI_PROVIDER:-ollama}
         OLLAMA_BASE_URL: http://ollama:11434
       depends_on: [postgres, redis, chromadb, ollama]
       restart: unless-stopped

     ---
     Approach: Frontend-First

     The frontend is the priority. For the 4 new backend services:
     - Create a folder + README for each with stack recommendation and API contract
     - The frontend will use mock data / mock API handlers for any endpoints that don't exist yet
     - Backend services will be built later to match the API contracts defined here

     Verification Plan

     1. Frontend builds and runs: pnpm dev from apps/web/
     2. All pages render with mock data
     3. Navigation works across all 101 routes
     4. Responsive layout works at desktop/tablet/mobile breakpoints

⏺ Plan approved. Let me start executing — first the backend service stubs, then the frontend.

⏺ Let me create the 4 backend service stub folders with READMEs.

⏺ Bash(mkdir -p /Users/user/Code/WaveStack/services/mcp-gateway /Users/user/Code/WaveStack/services/skills  
 /Users/user/Code/WaveStack/services/agent-orchestrator /User…)  
 ⎿ Done

⏺ Write(services/mcp-gateway/README.md)  
 ⎿ Wrote 128 lines to services/mcp-gateway/README.md  
 1 # MCP Gateway  
 2  
 3 Central hub for Model Context Protocol (MCP) server management — connects to MCP servers, dis  
 covers tools, routes tool calls, caches results, and tracks permissions/usage.  
 4  
 5 ## Stack
6  
 7 | Layer | Choice |  
 8 |-------|--------|
9 | Runtime | Node.js 20 |
10 | Framework | Fastify 4 |
… +118 lines (ctrl+o to expand)

⏺ Write(services/knowledge/README.md)  
 ⎿ Wrote 131 lines to services/knowledge/README.md  
 1 # Knowledge Service  
 2  
 3 RAG (Retrieval-Augmented Generation) pipeline — ingest documents, chunk text, store embedding
s in ChromaDB, provide semantic search and agent-specific context retrieval.
4  
 5 ## Stack
6  
 7 | Layer | Choice |  
 8 |-------|--------|
9 | Runtime | Python 3.11 |
10 | Framework | FastAPI |
… +121 lines (ctrl+o to expand)

⏺ Write(services/skills/README.md)  
 ⎿ Wrote 148 lines to services/skills/README.md  
 1 # Skills Service  
 2  
 3 Composable workflow engine — store, version, publish, and execute multi-step "skills" that ch
ain MCP tool calls together. Includes a marketplace for sharing skills.
4  
 5 ## Stack
6  
 7 | Layer | Choice |  
 8 |-------|--------|
9 | Runtime | Node.js 20 |
10 | Framework | Fastify 4 |
… +138 lines (ctrl+o to expand)

⏺ Write(services/agent-orchestrator/README.md)  
 ⎿ Wrote 219 lines to services/agent-orchestrator/README.md
1 # Agent Orchestrator  
 2  
 3 Multi-agent coordination service — manage autonomous AI agents, task queues with approval wor
kflows, agent crews, and an AI chat interface with streaming responses.
4  
 5 ## Stack
6  
 7 | Layer | Choice |  
 8 |-------|--------|
9 | Runtime | Python 3.11 |
10 | Framework | FastAPI |
… +209 lines (ctrl+o to expand)

⏺ Backend stubs done. Now let's initialize the Next.js frontend.

⏺ Read 1 file (ctrl+o to expand)

⏺ Bash(cd /Users/user/Code/WaveStack/apps && npx create-next-app@latest web --typescript --tailwind --eslint
--app --src-dir --import-alias "@/\*" --use-pnpm --no-turbo…)
⎿ ? Would you like to use React Compiler? › No / Yes  
 ⎿ (timeout 2m)

⏺ Bash(npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/\*"
--use-pnpm --no-turbopack --yes 2>&1)  
 ⎿ Running in the background (↓ to manage)  
 ⎿ (timeout 2m)

⏺ Read 2 files (ctrl+o to expand)

⏺ Good, Next.js app is created. But it was created in the current directory instead of apps/. Let me check.

⏺ Bash(ls /Users/user/Code/WaveStack/web 2>/dev/null && echo "EXISTS AT ROOT" || echo "NOT AT ROOT"  
 ls /Users/user/Code/WaveStack/apps/web 2>/dev/null && echo "EXISTS…)  
 ⎿ NOT AT ROOT  
 README.md  
 eslint.config.mjs  
 … +9 lines (ctrl+o to expand)

⏺ It's at the right location. Now let me install the key dependencies and set up shadcn/ui.

⏺ Bash(cd /Users/user/Code/WaveStack/apps/web && pnpm add lucide-react clsx tailwind-merge  
 class-variance-authority 2>&1)  
 ⎿ ../.. |  WARN  `node_modules` is present. Lockfile only installa  
 tion will make it out-of-date  
 ../.. | Progress: resolved 1, reused 0, downloaded 0, added 0  
 … +18 lines (ctrl+o to expand)  
 ⎿ (timeout 1m)

⏺ Bash(npx shadcn@latest init -y --defaults 2>&1)  
 ⎿ Running in the background (↓ to manage)  
 ⎿ (timeout 1m)

⏺ Bash(sleep 5 && cat /private/tmp/claude-501/-Users-user-Code-WaveStack/tasks/bfecd9e.output)  
 ⎿ npm warn exec The following package was not found and will be installed: shadcn@3.8.5  
 ⎿ (timeout 30s)

⏺ Task Output bfecd9e  
 ⎿ npm warn exec The following package was not found and will be installed: shadcn@3.8.5

- Preflight checks.  
  ✔ Preflight checks.  
  … +23 lines (ctrl+o to expand)

⏺ Now let me add the shadcn components we'll need most.

⏺ Bash(npx shadcn@latest add button card badge input separator sheet dropdown-menu avatar tooltip scroll-area
tabs dialog select textarea switch slider progress -y 2>&…)  
 ⎿ - Checking registry.  
 ✔ Checking registry.

- Installing dependencies.  
  … +38 lines (ctrl+o to expand)  
  ⎿ (timeout 2m)

⏺ Good. Now let me read the current globals.css and layout to understand what shadcn set up, then build the  
 app layout.

⏺ Read 2 files (ctrl+o to expand)

⏺ Now let me build everything. I'll create the layout, sidebar, mock data, and all the Phase 1 pages. Let me
work in parallel on the core structure files.

⏺ Let me create all the foundational files — layout, sidebar, shared components, mock data, and route  
 structure — in parallel batches.

⏺ Write(src/app/layout.tsx)  
 ⎿ Added 5 lines, removed 4 lines  
 1 import type { Metadata } from "next";  
 2 import { Geist, Geist_Mono } from "next/font/google";  
 3 +import { TooltipProvider } from "@/components/ui/tooltip";  
 4 import "./globals.css";  
 5  
 6 const geistSans = Geist({
...  
 14 });  
 15  
 16 export const metadata: Metadata = {
16 - title: "Create Next App",  
 17 - description: "Generated by create next app",  
 17 + title: "WaveStack",  
 18 + description: "Creator automation platform",  
 19 };
20  
 21 export default function RootLayout({
...
24 children: React.ReactNode;
25 }>) {
26 return (
26 - <html lang="en">  
 27 + <html lang="en" className="dark">  
 28 <body
29 className={`${geistSans.variable} ${geistMono.variable} antialiased`}
30 >
30 - {children}  
 31 + <TooltipProvider>{children}</TooltipProvider>  
 32 </body>
33 </html>
34 );

⏺ Now let me create the sidebar navigation, dashboard layout, and mock data in parallel.

⏺ Bash(mkdir -p /Users/user/Code/WaveStack/apps/web/src/components/layout
/Users/user/Code/WaveStack/apps/web/src/components/shared /Users/user/Code/WaveStack/apps/web…)
⎿ Done

⏺ Write(src/components/layout/sidebar.tsx)  
 ⎿ Wrote 166 lines to src/components/layout/sidebar.tsx
1 "use client";  
 2  
 3 import Link from "next/link";  
 4 import { usePathname } from "next/navigation";  
 5 import { cn } from "@/lib/utils";  
 6 import {
7 LayoutDashboard,  
 8 FolderOpen,  
 9 Scissors,
10 Send,
… +156 lines (ctrl+o to expand)

⏺ Write(src/components/layout/topbar.tsx)  
 ⎿ Wrote 58 lines to src/components/layout/topbar.tsx
1 "use client";  
 2  
 3 import { Bell, Search, User } from "lucide-react";
4 import { Button } from "@/components/ui/button";
5 import { Input } from "@/components/ui/input";  
 6 import {
7 DropdownMenu,  
 8 DropdownMenuContent,  
 9 DropdownMenuItem,
10 DropdownMenuSeparator,
… +48 lines (ctrl+o to expand)

⏺ Write(src/components/shared/stat-card.tsx)  
 ⎿ Wrote 53 lines to src/components/shared/stat-card.tsx
1 import { Card, CardContent } from "@/components/ui/card";
2 import { cn } from "@/lib/utils";  
 3 import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
4
5 interface StatCardProps {  
 6 title: string;
7 value: string | number;  
 8 change?: string;  
 9 trend?: "up" | "down" | "neutral";
10 icon: LucideIcon;
… +43 lines (ctrl+o to expand)

⏺ Write(src/components/shared/status-badge.tsx)  
 ⎿ Wrote 48 lines to src/components/shared/status-badge.tsx
1 import { Badge } from "@/components/ui/badge";
2 import { cn } from "@/lib/utils";  
 3  
 4 const statusStyles: Record<string, string> = {
5 published: "bg-green-500/10 text-green-500 border-green-500/20",  
 6 ready: "bg-green-500/10 text-green-500 border-green-500/20",
7 completed: "bg-green-500/10 text-green-500 border-green-500/20",  
 8 approved: "bg-green-500/10 text-green-500 border-green-500/20",  
 9 connected: "bg-green-500/10 text-green-500 border-green-500/20",
10 online: "bg-green-500/10 text-green-500 border-green-500/20",
… +38 lines (ctrl+o to expand)

⏺ Write(src/components/shared/page-header.tsx)  
 ⎿ Wrote 20 lines to src/components/shared/page-header.tsx
1 interface PageHeaderProps {  
 2 title: string;  
 3 description?: string;  
 4 children?: React.ReactNode;
5 }  
 6
7 export function PageHeader({ title, description, children }: PageHeaderProps) {  
 8 return (  
 9 <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
10 <div>
… +10 lines (ctrl+o to expand)

⏺ Now let me create the mock data and the dashboard layout.

⏺ Write(src/lib/mock-data/index.ts)  
 ⎿ Wrote 135 lines to src/lib/mock-data/index.ts  
 1 // Dashboard stats  
 2 export const dashboardStats = {  
 3 clipsToday: 12,  
 4 clipsChange: "+3 from yesterday",
5 scheduledPosts: 8,  
 6 scheduledChange: "2 publishing today",  
 7 activeViewers: 1247,  
 8 viewersChange: "+18%",  
 9 engagementRate: "4.7%",
10 engagementChange: "+0.3%",
… +125 lines (ctrl+o to expand)

⏺ Now let me create the dashboard layout shell and all the page files. I'll use multiple parallel agents to
speed this up.

⏺ Write(src/app/(dashboard)/layout.tsx)  
 ⎿ Wrote 30 lines to src/app/(dashboard)/layout.tsx
1 "use client";  
 2  
 3 import { useState } from "react";
4 import { Sidebar } from "@/components/layout/sidebar";  
 5 import { Topbar } from "@/components/layout/topbar";  
 6 import { cn } from "@/lib/utils";
7  
 8 export default function DashboardLayout({  
 9 children,
10 }: {
… +20 lines (ctrl+o to expand)

⏺ Now let me create all the pages in parallel using background agents.

⏺ Task(Build dashboard and content pages)  
 ⎿ Backgrounded agent (shift+↑ to manage · ctrl+o to expand)

⏺ Task(Build publish and settings pages)  
 ⎿ Backgrounded agent (shift+↑ to manage · ctrl+o to expand)

⏺ Good, both agents are working. Let me continue building the AI-focused pages in parallel.

⏺ Task(Build agents and AI chat pages)  
 ⎿ Backgrounded agent (shift+↑ to manage · ctrl+o to expand)

⏺ Let me continue building the remaining pages — Skills, MCP, Knowledge, Bots, and Analytics.

⏺ Task(Build skills, MCP, knowledge pages)  
 ⎿ Backgrounded agent (shift+↑ to manage · ctrl+o to expand)

⏺ Let me build the remaining pages — Analytics and Bots — while the other agents work.

⏺ Task(Build analytics and bots pages)  
 ⎿ Backgrounded agent (shift+↑ to manage · ctrl+o to expand)

⏺ Let me also create the auth login page and the (auth) layout while the agents are working.

⏺ Write(src/app/(auth)/layout.tsx)  
 ⎿ Wrote 12 lines to src/app/(auth)/layout.tsx  
 1 export default function AuthLayout({  
 2 children,  
 3 }: {  
 4 children: React.ReactNode;
5 }) {  
 6 return (  
 7 <div className="flex min-h-screen items-center justify-center bg-background">  
 8 <div className="w-full max-w-md px-4">{children}</div>  
 9 </div>
10 );
… +2 lines (ctrl+o to expand)

⏺ Write(src/app/(auth)/login/page.tsx)  
 ⎿ Wrote 66 lines to src/app/(auth)/login/page.tsx
1 "use client";  
 2  
 3 import Link from "next/link";
4 import { Button } from "@/components/ui/button";
5 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";  
 6 import { Input } from "@/components/ui/input";
7 import { Separator } from "@/components/ui/separator";  
 8  
 9 export default function LoginPage() {
10 return (
… +56 lines (ctrl+o to expand)

⏺ Now let me wait for all agents to complete, then do a build check.

⏺ Task Output aebdaa1  
 ⎿ Read output (ctrl+o to expand)

⏺ Agent 1 (dashboard + content pages) is done. Let me wait for the remaining agents and check for a missing
component — the Create Clip page used Label which needs to be added.

⏺ Bash(npx shadcn@latest add label -y 2>&1)  
 ⎿ Running in the background (↓ to manage)  
 ⎿ (timeout 30s)

⏺ Task Output a8ab0ad  
 ⎿ Read output (ctrl+o to expand)  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

✻ Crunched for 23m 33s

⏺ Background command "Create Next.js app with all defaults accepted" completed (exit code 0)  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

⏺ Background command "Initialize shadcn/ui with defaults" completed (exit code 0)  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

⏺ Agent "Build dashboard and content pages" completed  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

⏺ Agent "Build publish and settings pages" completed  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

⏺ Agent "Build skills, MCP, knowledge pages" completed  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

⏺ Agent "Build analytics and bots pages" completed  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

⏺ Agent "Build agents and AI chat pages" completed  
 ⎿ You've hit your limit · resets 5pm (Africa/Lagos)

❯ /rate-limit-options  
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
What do you want to do?

❯ 1. Stop and wait for limit to reset  
 2. Switch to extra usage  
 3. Upgrade your plan
