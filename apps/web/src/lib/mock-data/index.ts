// Weekly performance (for dashboard chart)
export const weeklyPerformance = [
  { day: "Mon", views: 3200,  engagement: 142, followers: 8  },
  { day: "Tue", views: 4100,  engagement: 198, followers: 14 },
  { day: "Wed", views: 2800,  engagement: 119, followers: 6  },
  { day: "Thu", views: 6700,  engagement: 312, followers: 31 },
  { day: "Fri", views: 5400,  engagement: 241, followers: 22 },
  { day: "Sat", views: 8900,  engagement: 430, followers: 47 },
  { day: "Sun", views: 7200,  engagement: 364, followers: 38 },
];

// Pending approvals (items needing creator action)
export const pendingApprovals = [
  { id: "1", type: "agent",    title: "Publishing Agent wants to schedule 3 posts",    urgency: "medium", href: "/agents" },
  { id: "2", type: "clip",     title: "Clip Agent: \"Best clutch\" ready to review",   urgency: "low",    href: "/clips"  },
  { id: "3", type: "moderation", title: "6 messages need human review",                urgency: "high",   href: "/moderation" },
  { id: "4", type: "sponsor",  title: "TechGear Pro deliverable due in 6 days",        urgency: "medium", href: "/monetization" },
];

// Dashboard stats
export const dashboardStats = {
  clipsToday: 12,
  clipsChange: "+3 from yesterday",
  scheduledPosts: 8,
  scheduledChange: "2 publishing today",
  activeViewers: 1247,
  viewersChange: "+18%",
  engagementRate: "4.7%",
  engagementChange: "+0.3%",
};

// Recent activity
export const recentActivity = [
  { id: "1", action: "Clip created", detail: "Stream highlight - 30s clip", time: "2 min ago", status: "ready" },
  { id: "2", action: "Post published", detail: "TikTok - \"Best plays of the week\"", time: "15 min ago", status: "published" },
  { id: "3", action: "Agent task completed", detail: "Content Agent generated 5 tweet drafts", time: "32 min ago", status: "completed" },
  { id: "4", action: "Moderation alert", detail: "Spam detected in Discord #general", time: "1 hr ago", status: "pending" },
  { id: "5", action: "Clip processing", detail: "Encoding 1080p - 45s clip", time: "1 hr ago", status: "processing" },
  { id: "6", action: "Skill executed", detail: "Clip & Ship to YouTube Shorts", time: "2 hr ago", status: "completed" },
];

// Content assets
export const contentAssets = [
  { id: "1", filename: "stream-highlight-01.mp4", mimeType: "video/mp4", duration: 30, sizeBytes: 45_000_000, status: "ready", createdAt: "2026-02-22T10:00:00Z", projectId: "proj-1" },
  { id: "2", filename: "best-plays-week7.mp4", mimeType: "video/mp4", duration: 120, sizeBytes: 180_000_000, status: "published", createdAt: "2026-02-21T15:30:00Z", projectId: "proj-1" },
  { id: "3", filename: "tutorial-intro.mp4", mimeType: "video/mp4", duration: 300, sizeBytes: 420_000_000, status: "processing", createdAt: "2026-02-22T09:15:00Z", projectId: "proj-2" },
  { id: "4", filename: "thumbnail-design.png", mimeType: "image/png", duration: 0, sizeBytes: 2_500_000, status: "ready", createdAt: "2026-02-20T12:00:00Z", projectId: "proj-1" },
  { id: "5", filename: "raid-moment.mp4", mimeType: "video/mp4", duration: 15, sizeBytes: 22_000_000, status: "ready", createdAt: "2026-02-22T08:45:00Z", projectId: "proj-3" },
  { id: "6", filename: "collab-clip.mp4", mimeType: "video/mp4", duration: 60, sizeBytes: 90_000_000, status: "failed", createdAt: "2026-02-19T18:00:00Z", projectId: "proj-2" },
];

// Clips
export const clips = [
  { id: "1", title: "Epic clutch moment", sourceUrl: "https://twitch.tv/vod/123", startTime: 3600, duration: 30, format: "mp4", status: "ready", createdAt: "2026-02-22T10:00:00Z" },
  { id: "2", title: "Funny raid reaction", sourceUrl: "https://twitch.tv/vod/124", startTime: 1800, duration: 15, format: "mp4", status: "ready", createdAt: "2026-02-22T08:45:00Z" },
  { id: "3", title: "Tutorial segment", sourceUrl: "https://youtube.com/watch?v=abc", startTime: 600, duration: 120, format: "mp4", status: "processing", createdAt: "2026-02-22T09:15:00Z" },
  { id: "4", title: "Best play of the day", sourceUrl: "https://twitch.tv/vod/125", startTime: 5400, duration: 45, format: "mp4", status: "published", createdAt: "2026-02-21T15:30:00Z" },
  { id: "5", title: "Win streak highlight", sourceUrl: "https://twitch.tv/vod/126", startTime: 7200, duration: 60, format: "mp4", status: "queued", createdAt: "2026-02-21T12:00:00Z" },
];

// Queue items
export const queueItems = [
  { id: "1", title: "Epic clutch moment", caption: "That clutch though! #gaming #clutch", platforms: ["tiktok", "youtube_shorts", "instagram"], status: "queued", scheduleAt: "2026-02-22T18:00:00Z" },
  { id: "2", title: "Tutorial: Advanced movement", caption: "Learn these pro movement tips", platforms: ["youtube"], status: "queued", scheduleAt: "2026-02-23T14:00:00Z" },
  { id: "3", title: "Best plays compilation", caption: "Week 7 best plays", platforms: ["youtube", "tiktok"], status: "processing", scheduleAt: "2026-02-22T16:00:00Z" },
  { id: "4", title: "Raid moment", caption: "Thanks for the raid!", platforms: ["twitter", "instagram"], status: "published", scheduleAt: "2026-02-22T10:00:00Z" },
  { id: "5", title: "Behind the scenes", caption: "Setup tour 2026", platforms: ["youtube", "instagram", "tiktok"], status: "scheduled", scheduleAt: "2026-02-24T12:00:00Z" },
];

// Bots
export const bots = [
  { id: "discord", name: "Discord Bot", platform: "discord", status: "online", servers: 3, commands: 14, messagesHandled: 4521 },
  { id: "twitch", name: "Twitch Bot", platform: "twitch", status: "online", servers: 2, commands: 10, messagesHandled: 8932 },
  { id: "telegram", name: "Telegram Bot", platform: "telegram", status: "offline", servers: 1, commands: 6, messagesHandled: 312 },
  { id: "whatsapp", name: "WhatsApp Bot", platform: "whatsapp", status: "offline", servers: 0, commands: 4, messagesHandled: 0 },
];

// Agents
export const agents = [
  { agentType: "content", name: "Content Agent", autonomyLevel: "copilot", isEnabled: true, tasksCompleted: 142, tasksRunning: 2, description: "Generate captions, titles, descriptions" },
  { agentType: "clip", name: "Clip Agent", autonomyLevel: "copilot", isEnabled: true, tasksCompleted: 89, tasksRunning: 1, description: "Detect highlights, create clips" },
  { agentType: "publishing", name: "Publishing Agent", autonomyLevel: "copilot", isEnabled: true, tasksCompleted: 67, tasksRunning: 0, description: "Schedule and publish content" },
  { agentType: "moderation", name: "Moderation Agent", autonomyLevel: "autopilot", isEnabled: true, tasksCompleted: 1205, tasksRunning: 3, description: "Review flagged content, take action" },
  { agentType: "analytics", name: "Analytics Agent", autonomyLevel: "autopilot", isEnabled: true, tasksCompleted: 52, tasksRunning: 1, description: "Generate insights, weekly reports" },
  { agentType: "growth", name: "Growth Agent", autonomyLevel: "copilot", isEnabled: false, tasksCompleted: 23, tasksRunning: 0, description: "SEO optimization, trend surfing" },
  { agentType: "community", name: "Community Agent", autonomyLevel: "manual", isEnabled: false, tasksCompleted: 0, tasksRunning: 0, description: "Respond to DMs, comments, mentions" },
  { agentType: "revenue", name: "Revenue Agent", autonomyLevel: "manual", isEnabled: false, tasksCompleted: 5, tasksRunning: 0, description: "Track sponsorships, optimize monetization" },
];

// Agent tasks
export const agentTasks = [
  { id: "1", agentType: "content", title: "Generate tweet drafts for this week", status: "completed", priority: 5, createdAt: "2026-02-22T08:00:00Z" },
  { id: "2", agentType: "moderation", title: "Review flagged messages in Discord", status: "running", priority: 8, createdAt: "2026-02-22T10:30:00Z" },
  { id: "3", agentType: "clip", title: "Create highlight clip from last stream", status: "awaiting_approval", priority: 6, createdAt: "2026-02-22T09:00:00Z" },
  { id: "4", agentType: "analytics", title: "Generate weekly performance report", status: "queued", priority: 4, createdAt: "2026-02-22T07:00:00Z" },
  { id: "5", agentType: "publishing", title: "Schedule posts for next 3 days", status: "completed", priority: 7, createdAt: "2026-02-21T18:00:00Z" },
];

// Skills
export const skills = [
  { id: "1", name: "Clip & Ship", slug: "clip-and-ship", category: "content", description: "Auto-clip highlight, generate thumbnail, write caption, publish to TikTok + YouTube Shorts", installCount: 234, rating: 4.8, isPublic: true, stepsCount: 4 },
  { id: "2", name: "Stream Recap", slug: "stream-recap", category: "content", description: "After stream ends, generate summary, create highlight reel, post recap thread", installCount: 189, rating: 4.6, isPublic: true, stepsCount: 5 },
  { id: "3", name: "Trend Surfer", slug: "trend-surfer", category: "growth", description: "Monitor trending topics, generate relevant content ideas, draft posts", installCount: 156, rating: 4.3, isPublic: true, stepsCount: 3 },
  { id: "4", name: "Sponsor Report", slug: "sponsor-report", category: "analytics", description: "Pull analytics, generate branded performance report, email to sponsor", installCount: 92, rating: 4.5, isPublic: true, stepsCount: 4 },
  { id: "5", name: "Wake Up Post", slug: "wake-up-post", category: "content", description: "Every morning, check trending, draft tweet, queue for review", installCount: 310, rating: 4.7, isPublic: true, stepsCount: 3 },
  { id: "6", name: "Raid Thank You", slug: "raid-thank-you", category: "custom", description: "On Twitch raid, auto-shoutout, clip raid moment, post to Discord", installCount: 78, rating: 4.2, isPublic: true, stepsCount: 3 },
];

// MCP Servers
export const mcpServers = [
  { id: "1", name: "YouTube API", slug: "youtube-api", transport: "http", status: "connected", toolCount: 8, lastPingAt: "2026-02-22T10:30:00Z" },
  { id: "2", name: "FFmpeg Tools", slug: "ffmpeg-tools", transport: "stdio", status: "connected", toolCount: 12, lastPingAt: "2026-02-22T10:29:00Z" },
  { id: "3", name: "PostgreSQL", slug: "postgresql", transport: "stdio", status: "connected", toolCount: 5, lastPingAt: "2026-02-22T10:30:00Z" },
  { id: "4", name: "WaveStack Internal", slug: "wavestack-internal", transport: "http", status: "connected", toolCount: 15, lastPingAt: "2026-02-22T10:30:00Z" },
  { id: "5", name: "Notion", slug: "notion", transport: "sse", status: "disconnected", toolCount: 6, lastPingAt: "2026-02-20T14:00:00Z" },
];

// MCP Tools
export const mcpTools = [
  { id: "1", serverId: "1", serverName: "YouTube API", name: "upload_video", description: "Upload a video to YouTube", isEnabled: true },
  { id: "2", serverId: "1", serverName: "YouTube API", name: "get_analytics", description: "Get video analytics from YouTube", isEnabled: true },
  { id: "3", serverId: "2", serverName: "FFmpeg Tools", name: "clip_video", description: "Clip a segment from a video file", isEnabled: true },
  { id: "4", serverId: "2", serverName: "FFmpeg Tools", name: "transcode", description: "Transcode video to different format", isEnabled: true },
  { id: "5", serverId: "4", serverName: "WaveStack Internal", name: "create_post", description: "Create a post in the content queue", isEnabled: true },
  { id: "6", serverId: "4", serverName: "WaveStack Internal", name: "get_stream_status", description: "Check if stream is currently live", isEnabled: true },
];

// Knowledge documents
export const knowledgeDocuments = [
  { id: "1", title: "Stream VOD Transcripts - February 2026", sourceType: "platform_history", status: "indexed", chunkCount: 245, tags: ["streams", "transcripts"], createdAt: "2026-02-20T00:00:00Z" },
  { id: "2", title: "Discord Chat History", sourceType: "platform_history", status: "indexed", chunkCount: 1200, tags: ["discord", "chat"], createdAt: "2026-02-15T00:00:00Z" },
  { id: "3", title: "Brand Guidelines", sourceType: "file", status: "indexed", chunkCount: 18, tags: ["brand", "guidelines"], createdAt: "2026-01-10T00:00:00Z" },
  { id: "4", title: "FAQ Document", sourceType: "file", status: "indexed", chunkCount: 32, tags: ["faq", "community"], createdAt: "2026-01-05T00:00:00Z" },
  { id: "5", title: "Twitter Post Archive", sourceType: "platform_history", status: "processing", chunkCount: 0, tags: ["twitter", "posts"], createdAt: "2026-02-22T08:00:00Z" },
];

// Chat messages (for AI chat)
export const chatMessages = [
  { id: "1", role: "user" as const, content: "What were my top performing clips this week?", agentType: null, createdAt: "2026-02-22T10:00:00Z" },
  { id: "2", role: "assistant" as const, content: "Your top 3 clips this week by engagement:\n\n1. **Epic clutch moment** - 45K views, 12% engagement\n2. **Funny raid reaction** - 32K views, 8% engagement\n3. **Win streak highlight** - 28K views, 6% engagement\n\nWould you like me to create a compilation or schedule any of these for cross-platform publishing?", agentType: "analytics", createdAt: "2026-02-22T10:00:05Z" },
  { id: "3", role: "user" as const, content: "Yes, create a compilation of the top 2 and schedule it for tomorrow", agentType: null, createdAt: "2026-02-22T10:01:00Z" },
  { id: "4", role: "assistant" as const, content: "I'll set that up for you. Here's my plan:\n\n1. Merge \"Epic clutch moment\" and \"Funny raid reaction\" into a single clip\n2. Generate a thumbnail and caption\n3. Schedule for tomorrow at 2 PM (your peak engagement time)\n\n**Platforms:** YouTube Shorts, TikTok, Instagram Reels\n\nShall I proceed?", agentType: "content", createdAt: "2026-02-22T10:01:10Z" },
];

// ─── Moderation ────────────────────────────────────────────────────────────

export const moderationStats = {
  flaggedToday: 24,
  flaggedChange: "+6 from yesterday",
  autoActioned: 18,
  autoActionedPct: "75%",
  pendingReview: 6,
  falsePositiveRate: "3.2%",
};

export const flaggedItems = [
  { id: "1", platform: "discord", channel: "#general", author: "user#4821", content: "Buy cheap follows at fakesite.com — best deal!!!", reason: "spam", confidence: 98, detectedAt: "2026-02-22T10:45:00Z", status: "actioned", action: "deleted" },
  { id: "2", platform: "twitch", channel: "chat", author: "troll99", content: "kys loser you're trash at this game", reason: "hate_speech", confidence: 94, detectedAt: "2026-02-22T10:32:00Z", status: "actioned", action: "timeout_10m" },
  { id: "3", platform: "discord", channel: "#clips", author: "unknown_user", content: "🔞 check my profile for exclusive content", reason: "nsfw", confidence: 87, detectedAt: "2026-02-22T10:10:00Z", status: "pending", action: null },
  { id: "4", platform: "twitch", channel: "chat", author: "fasttyper", content: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", reason: "spam", confidence: 99, detectedAt: "2026-02-22T09:58:00Z", status: "actioned", action: "deleted" },
  { id: "5", platform: "discord", channel: "#general", author: "new_member", content: "Can someone send me robux please? I really need it", reason: "solicitation", confidence: 72, detectedAt: "2026-02-22T09:40:00Z", status: "pending", action: null },
  { id: "6", platform: "twitch", channel: "chat", author: "hater_anon", content: "this stream is so bad compared to [other streamer]", reason: "harassment", confidence: 61, detectedAt: "2026-02-22T09:15:00Z", status: "dismissed", action: null },
];

export const moderationRules = [
  { id: "1", name: "Spam Links", platform: "all", type: "pattern", value: "(http|https|www).*\\.(com|net|io)", action: "delete", isEnabled: true, triggerCount: 312 },
  { id: "2", name: "Hate Speech", platform: "all", type: "ai", value: "toxicity > 0.85", action: "timeout_10m", isEnabled: true, triggerCount: 87 },
  { id: "3", name: "NSFW Content", platform: "discord", type: "ai", value: "nsfw_score > 0.75", action: "delete_warn", isEnabled: true, triggerCount: 23 },
  { id: "4", name: "All-Caps Spam", platform: "twitch", type: "pattern", value: "CAPS_RATIO > 0.8 AND LENGTH > 20", action: "delete", isEnabled: true, triggerCount: 451 },
  { id: "5", name: "Bot Detection", platform: "discord", type: "behavior", value: "messages_per_min > 10", action: "ban", isEnabled: true, triggerCount: 14 },
  { id: "6", name: "Competitor Promotion", platform: "all", type: "keyword", value: "watch [competitor] instead", action: "delete", isEnabled: false, triggerCount: 0 },
];

export const moderationLog = [
  { id: "1", platform: "discord", action: "deleted", reason: "spam", author: "user#4821", moderator: "AI Auto-mod", at: "2026-02-22T10:45:00Z" },
  { id: "2", platform: "twitch", action: "timeout_10m", reason: "hate_speech", author: "troll99", moderator: "AI Auto-mod", at: "2026-02-22T10:32:00Z" },
  { id: "3", platform: "twitch", action: "deleted", reason: "spam", author: "fasttyper", moderator: "AI Auto-mod", at: "2026-02-22T09:58:00Z" },
  { id: "4", platform: "discord", action: "warned", reason: "solicitation", author: "new_member", moderator: "Creator", at: "2026-02-22T09:50:00Z" },
  { id: "5", platform: "discord", action: "banned", reason: "ban_evasion", author: "evader007", moderator: "Creator", at: "2026-02-22T08:20:00Z" },
];

// ─── SEO ───────────────────────────────────────────────────────────────────

export const seoScores = [
  { id: "1", title: "Building a Discord Bot from Scratch", platform: "youtube", score: 87, issues: ["Title too long (62 chars)", "Missing chapters"], keywords: ["discord bot", "discord tutorial", "node.js bot"], publishedAt: "2026-02-20T12:00:00Z" },
  { id: "2", title: "Live Coding: Full Stack App", platform: "youtube", score: 71, issues: ["No end screen cards", "Description < 200 words", "Only 3 tags"], keywords: ["full stack", "live coding", "react tutorial"], publishedAt: "2026-02-18T16:00:00Z" },
  { id: "3", title: "Top 10 VS Code Extensions 2026", platform: "youtube", score: 94, issues: [], keywords: ["vscode extensions", "vs code tips", "coding tools 2026"], publishedAt: "2026-02-15T10:00:00Z" },
  { id: "4", title: "React Server Components Deep Dive", platform: "youtube", score: 62, issues: ["Keyword density low", "No pinned comment", "Thumbnail text unreadable on mobile"], keywords: ["react server components", "nextjs rsc", "react 19"], publishedAt: "2026-02-10T14:00:00Z" },
  { id: "5", title: "My Studio Setup Tour", platform: "youtube", score: 78, issues: ["Missing hashtags in description"], keywords: ["streaming setup", "studio tour", "content creator setup"], publishedAt: "2026-02-05T11:00:00Z" },
];

export const trendingKeywords = [
  { keyword: "discord bot tutorial 2026", volume: 18400, competition: "medium", trend: "up", relevance: 95 },
  { keyword: "twitch streaming tips", volume: 24100, competition: "high", trend: "up", relevance: 88 },
  { keyword: "react server components", volume: 12300, competition: "low", trend: "up", relevance: 82 },
  { keyword: "best streaming setup 2026", volume: 9800, competition: "medium", trend: "stable", relevance: 79 },
  { keyword: "how to grow on twitch", volume: 33200, competition: "high", trend: "up", relevance: 91 },
  { keyword: "youtube shorts algorithm", volume: 41000, competition: "high", trend: "up", relevance: 86 },
  { keyword: "content creator tools", volume: 7600, competition: "low", trend: "stable", relevance: 74 },
  { keyword: "clip editing tutorial", volume: 5400, competition: "low", trend: "up", relevance: 77 },
];

// ─── Monetization ──────────────────────────────────────────────────────────

export const revenueStats = {
  totalMonthly: 4820,
  monthlyChange: "+12%",
  adRevenue: 1240,
  subscriptions: 980,
  donations: 620,
  sponsorships: 1500,
  merchandise: 480,
};

export const revenueHistory = [
  { month: "Sep", total: 2100, ads: 600, subs: 480, donations: 320, sponsors: 500, merch: 200 },
  { month: "Oct", total: 2600, ads: 720, subs: 540, donations: 390, sponsors: 700, merch: 250 },
  { month: "Nov", total: 3100, ads: 850, subs: 650, donations: 400, sponsors: 900, merch: 300 },
  { month: "Dec", total: 3900, ads: 980, subs: 780, donations: 540, sponsors: 1200, merch: 400 },
  { month: "Jan", total: 4300, ads: 1100, subs: 850, donations: 580, sponsors: 1400, merch: 370 },
  { month: "Feb", total: 4820, ads: 1240, subs: 980, donations: 620, sponsors: 1500, merch: 480 },
];

export const partnerEligibility = [
  {
    platform: "YouTube",
    program: "YouTube Partner Program",
    icon: "youtube",
    unlocked: false,
    requirements: [
      { label: "Subscribers", current: 820, target: 1000, unit: "", met: false },
      { label: "Watch Hours (12 mo)", current: 3240, target: 4000, unit: "hrs", met: false },
      { label: "AdSense Linked", current: 1, target: 1, unit: "", met: true },
      { label: "No policy strikes", current: 1, target: 1, unit: "", met: true },
    ],
  },
  {
    platform: "Twitch",
    program: "Twitch Affiliate",
    icon: "twitch",
    unlocked: true,
    requirements: [
      { label: "Followers", current: 312, target: 50, unit: "", met: true },
      { label: "Avg Concurrent Viewers", current: 18, target: 3, unit: "", met: true },
      { label: "Stream Hours (30 days)", current: 24, target: 8, unit: "hrs", met: true },
      { label: "Unique Broadcast Days", current: 14, target: 7, unit: "days", met: true },
    ],
  },
  {
    platform: "Twitch",
    program: "Twitch Partner",
    icon: "twitch",
    unlocked: false,
    requirements: [
      { label: "Avg Concurrent Viewers", current: 18, target: 75, unit: "", met: false },
      { label: "Stream Hours (30 days)", current: 24, target: 25, unit: "hrs", met: false },
      { label: "Unique Broadcast Days", current: 14, target: 12, unit: "days", met: true },
    ],
  },
  {
    platform: "TikTok",
    program: "TikTok Creator Fund",
    icon: "tiktok",
    unlocked: false,
    requirements: [
      { label: "Followers", current: 4200, target: 10000, unit: "", met: false },
      { label: "Views (30 days)", current: 61000, target: 100000, unit: "", met: false },
      { label: "Account in good standing", current: 1, target: 1, unit: "", met: true },
    ],
  },
  {
    platform: "Instagram",
    program: "Instagram Monetization",
    icon: "instagram",
    unlocked: false,
    requirements: [
      { label: "Followers", current: 4200, target: 10000, unit: "", met: false },
      { label: "Professional Account", current: 1, target: 1, unit: "", met: true },
      { label: "Content policy compliance", current: 1, target: 1, unit: "", met: true },
    ],
  },
];

export const sponsors = [
  { id: "1", name: "TechGear Pro", logo: "TG", status: "active", dealValue: 1500, deliverables: "2 mentions/stream, 1 dedicated video/mo", nextDeadline: "2026-02-28T00:00:00Z", contactEmail: "partners@techgearpro.com" },
  { id: "2", name: "CloudHost Inc", logo: "CH", status: "active", dealValue: 500, deliverables: "Discord pinned link, monthly shoutout", nextDeadline: "2026-03-15T00:00:00Z", contactEmail: "marketing@cloudhost.io" },
  { id: "3", name: "GamerFuel Drinks", logo: "GF", status: "negotiating", dealValue: 2000, deliverables: "TBD — in discussion", nextDeadline: null, contactEmail: "collab@gamerfuel.com" },
];

// ─── Workflows ─────────────────────────────────────────────────────────────

export const workflows = [
  { id: "1", name: "Stream End → Recap", trigger: "stream_end", triggerLabel: "Stream ends", steps: 5, status: "active", lastRunAt: "2026-02-21T23:45:00Z", lastRunStatus: "success", runsTotal: 42 },
  { id: "2", name: "New Clip → Multi-Post", trigger: "clip_ready", triggerLabel: "Clip is ready", steps: 4, status: "active", lastRunAt: "2026-02-22T10:00:00Z", lastRunStatus: "success", runsTotal: 89 },
  { id: "3", name: "Monday Morning Post", trigger: "schedule", triggerLabel: "Every Monday 9am", steps: 3, status: "active", lastRunAt: "2026-02-17T09:00:00Z", lastRunStatus: "success", runsTotal: 12 },
  { id: "4", name: "Raid → Discord Alert", trigger: "twitch_raid", triggerLabel: "Incoming Twitch raid", steps: 2, status: "active", lastRunAt: "2026-02-22T08:30:00Z", lastRunStatus: "success", runsTotal: 7 },
  { id: "5", name: "Keyword Clip Trigger", trigger: "keyword_detected", triggerLabel: "Keyword detected in chat", steps: 3, status: "paused", lastRunAt: "2026-02-19T14:20:00Z", lastRunStatus: "failed", runsTotal: 31 },
  { id: "6", name: "Weekly Sponsor Report", trigger: "schedule", triggerLabel: "Every Sunday 8pm", steps: 4, status: "draft", lastRunAt: null, lastRunStatus: null, runsTotal: 0 },
];

export const workflowRuns = [
  { id: "1", workflowId: "2", workflowName: "New Clip → Multi-Post", startedAt: "2026-02-22T10:00:00Z", duration: 14, status: "success", stepsCompleted: 4 },
  { id: "2", workflowId: "4", workflowName: "Raid → Discord Alert", startedAt: "2026-02-22T08:30:00Z", duration: 3, status: "success", stepsCompleted: 2 },
  { id: "3", workflowId: "1", workflowName: "Stream End → Recap", startedAt: "2026-02-21T23:45:00Z", duration: 62, status: "success", stepsCompleted: 5 },
  { id: "4", workflowId: "3", workflowName: "Monday Morning Post", startedAt: "2026-02-17T09:00:00Z", duration: 8, status: "success", stepsCompleted: 3 },
  { id: "5", workflowId: "5", workflowName: "Keyword Clip Trigger", startedAt: "2026-02-19T14:20:00Z", duration: 5, status: "failed", stepsCompleted: 2 },
];

export const workflowTemplates = [
  { id: "t1", name: "Clip & Ship", description: "Auto-clip highlight → thumbnail → caption → post to TikTok + Shorts", trigger: "clip_ready", steps: 4, installs: 234 },
  { id: "t2", name: "Stream Recap", description: "Stream ends → summary → highlight reel → recap thread", trigger: "stream_end", steps: 5, installs: 189 },
  { id: "t3", name: "Trend Surfer", description: "Every morning → check trending → draft tweet → queue", trigger: "schedule", steps: 3, installs: 310 },
  { id: "t4", name: "Raid Thank You", description: "Incoming raid → Discord alert → clip moment → shoutout post", trigger: "twitch_raid", steps: 3, installs: 78 },
];

// ─── Auto-Clip Rules ────────────────────────────────────────────────────────

export const autoClipRules = {
  isEnabled: true,
  clipLength: 30,
  format: "mp4",
  minConfidence: 75,
  keywordTriggers: [
    { id: "1", keyword: "lets go", isEnabled: true, triggerCount: 34 },
    { id: "2", keyword: "clip that", isEnabled: true, triggerCount: 128 },
    { id: "3", keyword: "no way", isEnabled: true, triggerCount: 56 },
    { id: "4", keyword: "pog", isEnabled: false, triggerCount: 211 },
    { id: "5", keyword: "clutch", isEnabled: true, triggerCount: 42 },
  ],
  highlightDetection: [
    { id: "1", type: "viewer_spike", label: "Viewer count spike (>20%)", isEnabled: true },
    { id: "2", type: "chat_velocity", label: "Chat moving fast (>5 msg/sec)", isEnabled: true },
    { id: "3", type: "emote_burst", label: "Emote burst (>50 emotes in 5s)", isEnabled: true },
    { id: "4", type: "audio_peak", label: "Audio volume peak", isEnabled: false },
    { id: "5", type: "raid", label: "Incoming raid", isEnabled: true },
  ],
};

// ─── Stream ─────────────────────────────────────────────────────────────────

export const streamStatus = {
  isLive: false,
  nextStreamTitle: "Ranked Grind + Viewer Games",
  nextStreamAt: "2026-02-23T20:00:00Z",
  platform: "twitch",
  currentViewers: 0,
  peakViewers: 0,
};

export const streamHealth = {
  bitrate: 6000,
  droppedFrames: 0.2,
  cpuUsage: 34,
  encoderFps: 60,
  uptime: "0:00:00",
};

export const streamHistory = [
  { id: "1", title: "Ranked Grind — Road to Diamond", platform: "twitch", startedAt: "2026-02-21T20:00:00Z", duration: 218, peakViewers: 47, avgViewers: 31, chatMessages: 1842, newFollowers: 12, clipsCreated: 5 },
  { id: "2", title: "Collab with @streammate", platform: "twitch", startedAt: "2026-02-19T19:00:00Z", duration: 183, peakViewers: 89, avgViewers: 62, chatMessages: 4201, newFollowers: 34, clipsCreated: 8 },
  { id: "3", title: "Tutorial: Building a Bot Live", platform: "twitch", startedAt: "2026-02-17T18:00:00Z", duration: 142, peakViewers: 38, avgViewers: 24, chatMessages: 920, newFollowers: 8, clipsCreated: 2 },
  { id: "4", title: "Chill Stream — Just Chatting", platform: "twitch", startedAt: "2026-02-15T21:00:00Z", duration: 97, peakViewers: 22, avgViewers: 16, chatMessages: 430, newFollowers: 3, clipsCreated: 1 },
  { id: "5", title: "Tournament Qualifier", platform: "twitch", startedAt: "2026-02-13T17:00:00Z", duration: 264, peakViewers: 124, avgViewers: 78, chatMessages: 6230, newFollowers: 61, clipsCreated: 14 },
];

// ─── Community ──────────────────────────────────────────────────────────────

export const communityStats = {
  totalFollowers: 45200,
  followersChange: "+1.2K this week",
  discordMembers: 1840,
  discordChange: "+42 this week",
  avgEngagement: "4.7%",
  engagementChange: "+0.3%",
  topPlatform: "YouTube",
};

export const topSupporters = [
  { rank: 1, username: "ProGamer42", platform: "twitch", totalGifted: 48, watchHours: 312, messagesTotal: 4821, joinedAt: "2024-08-12T00:00:00Z", tier: "gold" },
  { rank: 2, username: "StreamFan99", platform: "twitch", totalGifted: 32, watchHours: 241, messagesTotal: 2930, joinedAt: "2024-11-03T00:00:00Z", tier: "gold" },
  { rank: 3, username: "DiscordMod_Kay", platform: "discord", totalGifted: 0, watchHours: 198, messagesTotal: 8412, joinedAt: "2025-01-20T00:00:00Z", tier: "silver" },
  { rank: 4, username: "ClipCollector", platform: "youtube", totalGifted: 0, watchHours: 156, messagesTotal: 421, joinedAt: "2025-03-14T00:00:00Z", tier: "silver" },
  { rank: 5, username: "ViewerAnon", platform: "twitch", totalGifted: 20, watchHours: 134, messagesTotal: 1203, joinedAt: "2025-05-07T00:00:00Z", tier: "bronze" },
  { rank: 6, username: "RegularViewer", platform: "twitch", totalGifted: 10, watchHours: 112, messagesTotal: 876, joinedAt: "2025-06-22T00:00:00Z", tier: "bronze" },
];

export const followerGrowth = [
  { date: "Sep", youtube: 38200, twitch: 240, discord: 1420, tiktok: 3100 },
  { date: "Oct", youtube: 39800, twitch: 264, discord: 1530, tiktok: 3600 },
  { date: "Nov", youtube: 41200, twitch: 280, discord: 1650, tiktok: 3900 },
  { date: "Dec", youtube: 42100, twitch: 290, discord: 1720, tiktok: 4050 },
  { date: "Jan", youtube: 43500, twitch: 302, discord: 1790, tiktok: 4150 },
  { date: "Feb", youtube: 45200, twitch: 312, discord: 1840, tiktok: 4200 },
];

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = [
  { id: "1", type: "moderation", title: "Spam detected in Discord #general", detail: "Auto-deleted 1 message from user#4821", isRead: false, createdAt: "2026-02-22T10:45:00Z" },
  { id: "2", type: "agent", title: "Clip Agent completed task", detail: "\"Epic clutch moment\" clip is ready to publish", isRead: false, createdAt: "2026-02-22T10:00:00Z" },
  { id: "3", type: "publish", title: "Post published successfully", detail: "TikTok — \"Best plays of the week\" is live", isRead: false, createdAt: "2026-02-22T09:45:00Z" },
  { id: "4", type: "monetization", title: "YouTube milestone approaching", detail: "You're at 820/1,000 subscribers — 180 away from YPP!", isRead: true, createdAt: "2026-02-22T08:00:00Z" },
  { id: "5", type: "workflow", title: "Workflow failed: Keyword Clip Trigger", detail: "Step 2 failed — MCP Gateway timeout. Check logs.", isRead: true, createdAt: "2026-02-21T14:25:00Z" },
  { id: "6", type: "stream", title: "Stream ended", detail: "Session lasted 3h 38m — 47 peak viewers, 5 clips created", isRead: true, createdAt: "2026-02-21T23:38:00Z" },
  { id: "7", type: "agent", title: "Approval required", detail: "Publishing Agent wants to schedule 3 posts — tap to review", isRead: true, createdAt: "2026-02-21T18:00:00Z" },
  { id: "8", type: "sponsor", title: "Sponsor deadline in 6 days", detail: "TechGear Pro — 2 stream mentions due by Feb 28", isRead: true, createdAt: "2026-02-22T07:00:00Z" },
  { id: "9", type: "community", title: "New milestone: 45K followers!", detail: "You hit 45,000 total followers across all platforms", isRead: true, createdAt: "2026-02-20T12:00:00Z" },
  { id: "10", type: "moderation", title: "6 items pending review", detail: "AI flagged 6 messages with <80% confidence — needs human review", isRead: true, createdAt: "2026-02-22T10:10:00Z" },
];

// ─── Publish Schedule (calendar) ────────────────────────────────────────────

export const scheduledPosts = [
  { id: "1", title: "Epic clutch moment", platforms: ["tiktok", "youtube_shorts"], scheduleAt: "2026-02-22T18:00:00Z", status: "scheduled" },
  { id: "2", title: "Tutorial: Advanced movement", platforms: ["youtube"], scheduleAt: "2026-02-23T14:00:00Z", status: "scheduled" },
  { id: "3", title: "Behind the scenes", platforms: ["youtube", "instagram", "tiktok"], scheduleAt: "2026-02-24T12:00:00Z", status: "scheduled" },
  { id: "4", title: "Weekly Q&A thread", platforms: ["twitter"], scheduleAt: "2026-02-25T10:00:00Z", status: "scheduled" },
  { id: "5", title: "Collab highlights", platforms: ["youtube", "tiktok"], scheduleAt: "2026-02-26T16:00:00Z", status: "scheduled" },
  { id: "6", title: "Monday motivational clip", platforms: ["instagram", "twitter"], scheduleAt: "2026-02-23T09:00:00Z", status: "scheduled" },
  { id: "7", title: "Setup tour video", platforms: ["youtube"], scheduleAt: "2026-02-27T15:00:00Z", status: "scheduled" },
  { id: "8", title: "Raid highlights compilation", platforms: ["tiktok", "youtube_shorts", "instagram"], scheduleAt: "2026-02-28T18:00:00Z", status: "scheduled" },
];

// ─── Settings ──────────────────────────────────────────────────────────────

export const integrations = [
  { id: "discord", name: "Discord", connected: true, username: "WaveBot#1234" },
  { id: "twitch", name: "Twitch", connected: true, username: "wavestack_bot" },
  { id: "youtube", name: "YouTube", connected: true, username: "WaveStack Channel" },
  { id: "twitter", name: "Twitter / X", connected: false, username: null },
  { id: "tiktok", name: "TikTok", connected: false, username: null },
  { id: "instagram", name: "Instagram", connected: true, username: "@wavestack" },
];

export const billingInfo = {
  plan: "Pro",
  price: 49,
  billingCycle: "monthly",
  nextBillingAt: "2026-03-22T00:00:00Z",
  usage: {
    agents:    { used: 6,    limit: 10  },
    clips:     { used: 248,  limit: 500 },
    storage:   { used: 18.4, limit: 50, unit: "GB" },
    teamSeats: { used: 4,    limit: 5   },
  },
  paymentMethod: { type: "card", brand: "Visa", last4: "4242", expiresAt: "2027-09" },
  invoices: [
    { id: "inv-001", amount: 49, status: "paid", date: "2026-02-22T00:00:00Z" },
    { id: "inv-002", amount: 49, status: "paid", date: "2026-01-22T00:00:00Z" },
    { id: "inv-003", amount: 49, status: "paid", date: "2025-12-22T00:00:00Z" },
  ],
};

export const notificationPrefs = [
  { id: "stream_live",     label: "Stream goes live",                   category: "Stream",       email: true,  inApp: true,  push: true  },
  { id: "stream_end",      label: "Stream ends (summary)",              category: "Stream",       email: false, inApp: true,  push: false },
  { id: "clip_ready",      label: "Clip is ready",                      category: "Content",      email: false, inApp: true,  push: true  },
  { id: "post_published",  label: "Post published",                     category: "Content",      email: false, inApp: true,  push: false },
  { id: "post_failed",     label: "Post failed to publish",             category: "Content",      email: true,  inApp: true,  push: true  },
  { id: "agent_approval",  label: "Agent needs approval",               category: "Agents",       email: true,  inApp: true,  push: true  },
  { id: "agent_done",      label: "Agent task completed",               category: "Agents",       email: false, inApp: true,  push: false },
  { id: "workflow_failed", label: "Workflow run failed",                category: "Agents",       email: true,  inApp: true,  push: false },
  { id: "mod_flag",        label: "Moderation flag (low confidence)",   category: "Moderation",   email: false, inApp: true,  push: false },
  { id: "sponsor_due",     label: "Sponsor deadline reminder",          category: "Monetization", email: true,  inApp: true,  push: true  },
  { id: "revenue_mile",    label: "Revenue milestone reached",          category: "Monetization", email: true,  inApp: true,  push: true  },
  { id: "team_joined",     label: "Team member joined / accepted",      category: "Team",         email: true,  inApp: true,  push: false },
];

export const apiKeys = [
  { id: "1", name: "Production Key",        maskedKey: "ws_live_••••••••3f9a", scopes: ["read", "write", "publish"], createdAt: "2025-09-01T00:00:00Z", lastUsedAt: "2026-02-22T10:28:00Z" },
  { id: "2", name: "Analytics Dashboard",   maskedKey: "ws_live_••••••••8c12", scopes: ["read"],                    createdAt: "2025-11-15T00:00:00Z", lastUsedAt: "2026-02-21T18:00:00Z" },
  { id: "3", name: "Dev / Testing",         maskedKey: "ws_test_••••••••1d7e", scopes: ["read", "write"],           createdAt: "2026-01-10T00:00:00Z", lastUsedAt: "2026-02-18T11:00:00Z" },
];

export const activeSessions = [
  { id: "1", device: "MacBook Pro",    browser: "Chrome 122",     location: "New York, US",  isCurrent: true,  lastActiveAt: "2026-02-22T10:30:00Z" },
  { id: "2", device: "iPhone 16 Pro",  browser: "Safari iOS 17",  location: "New York, US",  isCurrent: false, lastActiveAt: "2026-02-22T08:00:00Z" },
  { id: "3", device: "Windows PC",     browser: "Firefox 123",    location: "Chicago, US",   isCurrent: false, lastActiveAt: "2026-02-20T14:00:00Z" },
];

// ─── Team ──────────────────────────────────────────────────────────────────

export const teamMembers = [
  { id: "1", name: "Jordan Park",  email: "jordan@example.com",  role: "admin",     avatar: "JP", status: "active",  joinedAt: "2025-06-01T00:00:00Z",  lastActive: "2026-02-22T09:30:00Z" },
  { id: "2", name: "Sam Rivera",   email: "sam@example.com",     role: "editor",    avatar: "SR", status: "active",  joinedAt: "2025-09-15T00:00:00Z",  lastActive: "2026-02-21T18:15:00Z" },
  { id: "3", name: "Taylor Kim",   email: "taylor@example.com",  role: "moderator", avatar: "TK", status: "active",  joinedAt: "2025-11-08T00:00:00Z",  lastActive: "2026-02-22T10:00:00Z" },
  { id: "4", name: "Alex Chen",    email: "alex@example.com",    role: "analyst",   avatar: "AC", status: "pending", joinedAt: "2026-02-21T00:00:00Z",  lastActive: null },
];

export const teamAuditLog = [
  { id: "1", actor: "Jordan Park",      action: "Published post",   resource: "\"Epic clutch moment\" to TikTok",          at: "2026-02-22T09:30:00Z" },
  { id: "2", actor: "Sam Rivera",       action: "Edited clip",      resource: "\"Best plays compilation\" — trimmed 15s",  at: "2026-02-22T08:45:00Z" },
  { id: "3", actor: "Taylor Kim",       action: "Banned user",      resource: "evader007 from Discord",                    at: "2026-02-22T08:20:00Z" },
  { id: "4", actor: "Jordan Park",      action: "Scheduled post",   resource: "\"Tutorial: Advanced movement\" for Feb 23", at: "2026-02-21T18:15:00Z" },
  { id: "5", actor: "Creator (You)",    action: "Invited member",   resource: "alex@example.com as Analyst",               at: "2026-02-21T12:00:00Z" },
];

// ─── Competitors ────────────────────────────────────────────────────────────

export const competitors = [
  { id: "1", name: "StreamKing",       handle: "@streamking",      platform: "twitch",  followers: 128400, followersChange: +1240, avgViewers: 312, uploadsPerWeek: 5, grade: "A"  },
  { id: "2", name: "ProCodeCast",      handle: "@procodecast",     platform: "youtube", followers: 84200,  followersChange: +620,  avgViewers: 0,   uploadsPerWeek: 3, grade: "B+" },
  { id: "3", name: "NightShiftGaming", handle: "@nightshiftgg",    platform: "twitch",  followers: 41800,  followersChange: +380,  avgViewers: 94,  uploadsPerWeek: 7, grade: "B"  },
  { id: "4", name: "TechStreamDaily",  handle: "@techstreamdaily", platform: "youtube", followers: 22100,  followersChange: -80,   avgViewers: 0,   uploadsPerWeek: 2, grade: "C+" },
];

export const competitorGrowth = [
  { month: "Sep", you: 38200, StreamKing: 112000, ProCodeCast: 76000, NightShiftGaming: 37200, TechStreamDaily: 23100 },
  { month: "Oct", you: 39800, StreamKing: 116000, ProCodeCast: 78500, NightShiftGaming: 38200, TechStreamDaily: 23000 },
  { month: "Nov", you: 41200, StreamKing: 120000, ProCodeCast: 80100, NightShiftGaming: 39000, TechStreamDaily: 22800 },
  { month: "Dec", you: 42100, StreamKing: 122800, ProCodeCast: 81200, NightShiftGaming: 39800, TechStreamDaily: 22600 },
  { month: "Jan", you: 43500, StreamKing: 125600, ProCodeCast: 83000, NightShiftGaming: 40900, TechStreamDaily: 22200 },
  { month: "Feb", you: 45200, StreamKing: 128400, ProCodeCast: 84200, NightShiftGaming: 41800, TechStreamDaily: 22100 },
];

// ─── Creator Profile ─────────────────────────────────────────────────────────

export const creatorProfile = {
  name:           "WaveStack Creator",
  username:       "wavestack",
  email:          "creator@wavestack.io",
  bio:            "Full-time content creator. Streaming, coding, and building tools for creators. Founder of WaveStack.",
  avatarInitials: "WS",
  location:       "New York, USA",
  website:        "https://wavestack.io",
  joinedAt:       "2024-08-01T00:00:00Z",
  platforms: [
    { id: "youtube",   label: "YouTube",      handle: "WaveStack Channel", followers: 45200, url: "#" },
    { id: "twitch",    label: "Twitch",        handle: "wavestack",         followers: 312,   url: "#" },
    { id: "tiktok",    label: "TikTok",        handle: "@wavestack",        followers: 4200,  url: "#" },
    { id: "instagram", label: "Instagram",     handle: "@wavestack",        followers: 4200,  url: "#" },
    { id: "twitter",   label: "Twitter / X",   handle: "@wavestack",        followers: 2100,  url: "#" },
  ],
  stats: {
    totalFollowers: 56012,
    totalContent:   284,
    totalStreams:    94,
    avgEngagement:  "4.7%",
  },
  achievements: [
    { id: "1", label: "First 1K Followers",   description: "Reached 1,000 followers on any platform",   icon: "🏆", unlockedAt: "2024-10-15T00:00:00Z" },
    { id: "2", label: "Twitch Affiliate",      description: "Joined Twitch Affiliate program",            icon: "🎮", unlockedAt: "2024-11-02T00:00:00Z" },
    { id: "3", label: "Consistent Creator",    description: "Published content 30 days in a row",        icon: "🔥", unlockedAt: "2025-02-28T00:00:00Z" },
    { id: "4", label: "First Sponsor",         description: "Closed first brand deal",                   icon: "💼", unlockedAt: "2025-05-10T00:00:00Z" },
    { id: "5", label: "45K Milestone",         description: "Reached 45,000 total followers",            icon: "⭐", unlockedAt: "2026-02-20T00:00:00Z" },
  ],
};
