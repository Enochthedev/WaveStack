/**
 * WaveStack — Master type definitions
 * Every domain, every shape, every state used across the frontend.
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
};

export type ApiErrorBody = { error: string; code?: string; details?: unknown };

export type TrendDirection = "up" | "down" | "neutral";

// ─── Auth & Session ───────────────────────────────────────────────────────────

export type LoginResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; orgId: string };
};

export type AuthContext = { token: string; orgId: string };

// ─── User & Org ───────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  orgId: string;
  createdAt: string;
};

export type OrgProfile = {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "business" | "enterprise";
  logoUrl?: string;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  joinedAt: string;
  lastSeenAt?: string;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  expiresAt: string;
  createdAt: string;
};

// ─── Platforms ────────────────────────────────────────────────────────────────

export type PlatformId =
  | "twitch"
  | "youtube"
  | "youtube_shorts"
  | "tiktok"
  | "instagram"
  | "twitter"
  | "discord"
  | "facebook"
  | "kick"
  | "rumble"
  | "linkedin"
  | "patreon"
  | "ko_fi"
  | "streamlabs"
  | "stream_elements"
  | "spotify"
  | "printful"
  | "shopify";

export type PlatformStatus = {
  platform: PlatformId;
  connected: boolean;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  followerCount?: number;
  expiresAt?: string;
  scopes?: string[];
  lastSyncedAt?: string;
  health: "healthy" | "expiring_soon" | "expired" | "disconnected";
};

// ─── Stream ───────────────────────────────────────────────────────────────────

export type StreamStatus = "live" | "ended" | "pending" | "scheduled";

export type StreamSession = {
  id: string;
  title?: string;
  game?: string;
  platform: PlatformId;
  status: StreamStatus;
  viewerCount: number;
  peakViewerCount?: number;
  avgViewerCount?: number;
  bitrate?: number;
  droppedFramesPct?: number;
  durationSeconds?: number;
  startedAt: string;
  endedAt?: string;
  scheduledAt?: string;
  clipsCreated?: number;
  newFollowers?: number;
  revenue?: number;
  chatMessages?: number;
  hypeScore?: number;
};

export type StreamPlatformRelay = {
  platform: PlatformId;
  status: "live" | "connecting" | "offline" | "error";
  viewerCount: number;
  bitrate: number;
  droppedFramesPct: number;
  latencyMs: number;
  rtmpUrl?: string;
  streamKey?: string;
};

export type StreamHealth = {
  bitrate: number;
  droppedFramesPct: number;
  cpuUsage: number;
  gpuUsage?: number;
  memoryUsageMb: number;
  networkUploadKbps: number;
  encoderFps: number;
  uptimeSeconds: number;
};

export type StreamEvent = {
  id: string;
  type:
    | "sub"
    | "gifted_sub"
    | "resub"
    | "raid"
    | "donation"
    | "bits"
    | "superchat"
    | "follow"
    | "hype_train"
    | "channel_point"
    | "milestone";
  platform: PlatformId;
  username?: string;
  message?: string;
  amount?: number;
  tier?: 1 | 2 | 3;
  viewerCount?: number;
  occurredAt: string;
};

export type ChatMessage = {
  id: string;
  platform: PlatformId;
  userId: string;
  username: string;
  displayName: string;
  content: string;
  badges: string[];
  color?: string;
  isQuestion: boolean;
  isDonation: boolean;
  isFirstMessage: boolean;
  isHighlighted: boolean;
  sentAt: string;
};

// ─── Clips & Content ──────────────────────────────────────────────────────────

export type ClipStatus =
  | "detecting"
  | "clipping"
  | "formatting"
  | "captioning"
  | "awaiting_approval"
  | "scheduled"
  | "published"
  | "failed"
  | "rejected";

export type ClipSource =
  | "auto_hype"
  | "manual"
  | "vod_analysis"
  | "keyword_trigger"
  | "manual_upload";

export type Clip = {
  id: string;
  title?: string;
  sourceUrl?: string;
  sourceStreamId?: string;
  thumbnailUrl?: string;
  startTime?: number;
  duration: number;
  format: "mp4" | "webm";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  sizeBytes?: number;
  status: ClipStatus;
  source: ClipSource;
  hypeScore?: number;
  game?: string;
  platforms?: PlatformId[];
  publishedPlatforms?: PlatformId[];
  views?: number;
  likes?: number;
  completionRate?: number;
  clickThroughs?: number;
  createdAt: string;
  publishedAt?: string;
};

export type PipelineClip = Clip & {
  pipelineStep:
    | "detecting"
    | "clipping"
    | "formatting"
    | "captioning"
    | "approval"
    | "scheduled"
    | "published";
  stepProgress?: number; // 0–100
  timeInStep?: number; // seconds
};

export type VodHighlight = {
  id: string;
  streamId: string;
  timestampSeconds: number;
  duration: number;
  hypeScore: number;
  type: "hype" | "raid" | "funny" | "clutch" | "donation" | "milestone";
  approved?: boolean;
};

export type ContentAsset = {
  id: string;
  filename: string;
  mimeType: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  sizeBytes: number;
  status: "uploading" | "processing" | "ready" | "failed" | "published";
  projectId?: string;
  tags?: string[];
  createdAt: string;
};

// ─── Queue & Publishing ───────────────────────────────────────────────────────

export type QueueItemStatus =
  | "draft"
  | "queued"
  | "scheduled"
  | "processing"
  | "published"
  | "failed"
  | "cancelled";

export type QueueItem = {
  id: string;
  clipId?: string;
  title: string;
  caption?: string;
  hashtags?: string[];
  thumbnailUrl?: string;
  platforms: PlatformId[];
  status: QueueItemStatus;
  scheduleAt: string;
  publishedAt?: string;
  failureReason?: string;
  retryCount?: number;
  postUrls?: Partial<Record<PlatformId, string>>;
  views?: number;
  createdAt: string;
};

export type ScheduledPost = QueueItem;

// ─── Agents ───────────────────────────────────────────────────────────────────

export type AgentType =
  | "content"
  | "clip"
  | "publishing"
  | "moderation"
  | "analytics"
  | "growth"
  | "community"
  | "revenue";

export type AutonomyLevel = "manual" | "copilot" | "autopilot";

export type AgentStatus = "active" | "idle" | "running" | "paused" | "error";

export type AgentConfig = {
  agentType: AgentType;
  name: string;
  autonomyLevel: AutonomyLevel;
  isEnabled: boolean;
  status: AgentStatus;
  currentTask?: string;
  lastActionAt?: string;
  lastActionDescription?: string;
  tasksCompleted: number;
  tasksRunning: number;
  platforms?: PlatformId[];
  workingHours?: { start: string; end: string; days: number[] };
  cooldownMinutes?: number;
  maxActionsPerHour?: number;
  description?: string;
};

export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "awaiting_approval"
  | "cancelled";

export type AgentTask = {
  id: string;
  agentType: AgentType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number;
  platform?: PlatformId;
  actionTaken?: string;
  outcome?: string;
  failureReason?: string;
  reasoningTrace?: ReasoningStep[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type ReasoningStep = {
  step: number;
  label: string;
  detail: string;
  at?: string;
};

export type ApprovalRequest = {
  id: string;
  worker: string;
  workerType: AgentType;
  platform: PlatformId[];
  contentType: "tweet" | "caption" | "clip" | "post" | "moderation" | "schedule";
  title: string;
  draft: string;
  reasoning: string;
  reasoningSteps?: ReasoningStep[];
  expiresAt: string;
  urgency: "high" | "medium" | "low";
  taskId?: string;
  createdAt?: string;
};

export type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: AgentType;
  sessionId?: string;
  createdAt: string;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "custom";

export type PlatformMetrics = {
  platform: PlatformId;
  views: number;
  newFollowers: number;
  watchTimeHours: number;
  revenue: number;
  engagementRate: number;
  impressions?: number;
  clicks?: number;
};

export type DailyMetric = {
  date: string;
  views: number;
  engagement: number;
  followers: number;
  revenue?: number;
  watchTimeHours?: number;
};

export type StreamAnalytics = StreamSession & {
  viewerTimeline: { t: number; count: number }[];
  chatTimeline: { t: number; msgsPerMin: number }[];
  dropOffPoints: { pct: number; viewerCount: number }[];
  topMoments: VodHighlight[];
  revenueBreakdown: RevenueBreakdown;
  clips: Clip[];
};

export type AudienceLoyaltyTier = "regular" | "returning" | "new" | "lurker";

export type AudienceStats = {
  loyaltyBreakdown: Record<AudienceLoyaltyTier, { count: number; pct: number }>;
  topViewers: TopViewer[];
  newViewerConversionRate: number;
  churnRate: number;
  geoBreakdown: { country: string; pct: number }[];
  deviceBreakdown: { device: string; pct: number }[];
  discoveryBreakdown: { source: string; pct: number }[];
  avgRetentionPct: number;
};

export type TopViewer = {
  username: string;
  platform: PlatformId;
  streamsWatched: number;
  watchTimeHours: number;
  chatMessages: number;
  totalDonated: number;
  firstSeenAt: string;
  lastSeenAt: string;
  loyaltyTier: AudienceLoyaltyTier;
};

export type BestTimeSlot = {
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  hourOfDay: number; // 0–23
  avgViewers: number;
  competitorCount: number;
  score: number; // composite score
};

// ─── Revenue ──────────────────────────────────────────────────────────────────

export type RevenueSourceId =
  | "twitch_subs"
  | "twitch_bits"
  | "twitch_ads"
  | "youtube_superchat"
  | "youtube_memberships"
  | "tiktok_gifts"
  | "donations"
  | "patreon"
  | "ko_fi"
  | "sponsorships"
  | "merch";

export type RevenueBreakdown = Partial<Record<RevenueSourceId, number>>;

export type RevenueSnapshot = {
  period: string;
  total: number;
  breakdown: RevenueBreakdown;
};

export type PayoutRecord = {
  id: string;
  platform: PlatformId | "stripe" | "paypal";
  amount: number;
  currency: string;
  status: "processing" | "paid" | "held" | "failed";
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
};

export type SponsorStatus = "prospecting" | "negotiating" | "active" | "completed" | "cancelled";

export type SponsorDeliverable = {
  id: string;
  description: string;
  dueAt: string;
  completedAt?: string;
  platform?: PlatformId;
  type: "stream_mention" | "social_post" | "dedicated_video" | "discord_pin" | "other";
};

export type Sponsor = {
  id: string;
  name: string;
  logoUrl?: string;
  status: SponsorStatus;
  dealValue: number;
  currency?: string;
  paidAmount?: number;
  deliverables: SponsorDeliverable[];
  contactEmail?: string;
  contactName?: string;
  contractUrl?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
};

// ─── Moderation ───────────────────────────────────────────────────────────────

export type ModerationReason =
  | "spam"
  | "hate_speech"
  | "harassment"
  | "nsfw"
  | "solicitation"
  | "ban_evasion"
  | "bot"
  | "competitor_promo"
  | "other";

export type ModerationAction =
  | "deleted"
  | "warned"
  | "timeout_1m"
  | "timeout_10m"
  | "timeout_1h"
  | "timeout_24h"
  | "banned"
  | "dismissed";

export type ModerationStatus = "pending" | "actioned" | "dismissed" | "false_positive";

export type FlaggedMessage = {
  id: string;
  platform: PlatformId;
  channel?: string;
  author: string;
  authorId?: string;
  content: string;
  reason: ModerationReason;
  confidence: number; // 0–100
  status: ModerationStatus;
  action?: ModerationAction;
  actionedBy?: "ai" | "creator" | string;
  detectedAt: string;
  actionedAt?: string;
};

export type ModerationRuleType = "keyword" | "pattern" | "ai" | "behavior";

export type ModerationRule = {
  id: string;
  name: string;
  platform: PlatformId | "all";
  type: ModerationRuleType;
  value: string;
  action: ModerationAction;
  isEnabled: boolean;
  triggerCount: number;
  createdAt?: string;
};

export type BannedUser = {
  id: string;
  platform: PlatformId;
  username: string;
  reason: ModerationReason;
  bannedAt: string;
  bannedBy: "ai" | "creator";
  note?: string;
};

// ─── Community ────────────────────────────────────────────────────────────────

export type LoyaltyTier = "gold" | "silver" | "bronze" | "regular";

export type CommunityMember = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  platforms: PlatformId[];
  loyaltyTier: LoyaltyTier;
  streamsWatched: number;
  watchTimeHours: number;
  chatMessages: number;
  totalDonated: number;
  subsGifted?: number;
  joinedAt: string;
  lastSeenAt: string;
  isVip?: boolean;
  isMod?: boolean;
  notes?: string;
};

export type ChatLogEntry = {
  id: string;
  platform: PlatformId;
  channel?: string;
  userId: string;
  username: string;
  content: string;
  isHighlighted?: boolean;
  isFlagged?: boolean;
  streamId?: string;
  sentAt: string;
};

export type Milestone = {
  id: string;
  type: "follower" | "sub" | "watchtime" | "revenue" | "custom";
  label: string;
  current: number;
  target: number;
  unit?: string;
  estimatedDate?: string;
  reachedAt?: string;
};

// ─── SEO ──────────────────────────────────────────────────────────────────────

export type SeoIssue = string;

export type SeoScore = {
  id: string;
  title: string;
  platform: "youtube" | "tiktok";
  score: number; // 0–100
  issues: SeoIssue[];
  keywords: string[];
  publishedAt: string;
};

export type KeywordData = {
  keyword: string;
  volume: number;
  competition: "low" | "medium" | "high";
  trend: "up" | "down" | "stable";
  relevance: number; // 0–100
  currentRank?: number;
};

// ─── Competitors ──────────────────────────────────────────────────────────────

export type Competitor = {
  id: string;
  channelName: string;
  platform: PlatformId;
  profileUrl?: string;
  avatarUrl?: string;
  followers: number;
  avgViewers?: number;
  growthRate?: number;
  streamingHoursPerWeek?: number;
  topGames?: string[];
  peakTimes?: string;
  viewerOverlapPct?: number;
  addedAt: string;
};

export type TrendingGame = {
  id: string;
  name: string;
  platform: "twitch" | "youtube";
  avgViewersPerStream: number;
  channelCount: number;
  competition: "easy" | "medium" | "hard";
  growthTrend: TrendDirection;
  tags?: string[];
};

// ─── Workflows & Automation ───────────────────────────────────────────────────

export type WorkflowStatus = "active" | "paused" | "draft" | "archived";
export type WorkflowRunStatus = "success" | "failed" | "running" | "cancelled";

export type WorkflowTrigger =
  | "stream_end"
  | "clip_ready"
  | "schedule"
  | "twitch_raid"
  | "keyword_detected"
  | "manual"
  | "new_follower_milestone"
  | "post_published";

export type Workflow = {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  triggerLabel: string;
  steps: number;
  status: WorkflowStatus;
  lastRunAt?: string;
  lastRunStatus?: WorkflowRunStatus;
  runsTotal: number;
  createdAt: string;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  status: WorkflowRunStatus;
  stepsCompleted: number;
  stepsTotal: number;
  errorMessage?: string;
};

export type SkillCategory =
  | "content"
  | "growth"
  | "analytics"
  | "community"
  | "moderation"
  | "custom";

export type Skill = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  category: SkillCategory;
  description: string | null;
  isPublic: boolean;
  forkedFromId: string | null;
  installCount: number;
  ratingSum: number;
  ratingCount: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  // Computed / joined fields
  rating: number;
  stepsCount: number;
  versions?: SkillVersion[];
};

export type SkillVersion = {
  id: string;
  skillId: string;
  version: string;
  definition: { steps: SkillStep[] };
  inputSchema: Record<string, any>;
  outputMapping: Record<string, any>;
  isLatest: boolean;
  isPublished: boolean;
  createdAt: string;
};

export type SkillStep = {
  name: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
  description?: string;
};

export type SkillExecution = {
  id: string;
  skillId: string;
  versionId: string;
  orgId: string;
  triggeredBy: string;
  triggerType: "agent" | "user" | "schedule";
  input: Record<string, any>;
  output: Record<string, any> | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  stepResults: Array<{
    stepName: string;
    status: "success" | "error";
    output?: any;
    error?: string;
    durationMs: number;
  }>;
  durationMs: number | null;
  createdAt: string;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "moderation"
  | "agent"
  | "publish"
  | "monetization"
  | "workflow"
  | "stream"
  | "sponsor"
  | "community"
  | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  detail?: string;
  href?: string;
  isRead: boolean;
  priority: "urgent" | "normal" | "low";
  createdAt: string;
};

export type NotificationPref = {
  id: string;
  label: string;
  category: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export type PlanId = "free" | "starter" | "pro" | "business" | "enterprise";

export type UsageMeter = {
  used: number;
  limit: number;
  unit?: string;
};

export type BillingInfo = {
  plan: PlanId;
  price: number;
  billingCycle: "monthly" | "annual";
  nextBillingAt: string;
  cancelledAt?: string;
  usage: {
    agents: UsageMeter;
    clips: UsageMeter;
    storage: UsageMeter;
    teamSeats: UsageMeter;
    apiCalls: UsageMeter;
    aiTokens: UsageMeter;
  };
  paymentMethod?: {
    type: "card" | "paypal" | "bank";
    brand?: string;
    last4?: string;
    expiresAt?: string;
  };
};

export type Invoice = {
  id: string;
  amount: number;
  currency?: string;
  status: "paid" | "pending" | "failed" | "refunded";
  pdfUrl?: string;
  date: string;
};

// ─── SSE / Real-time ──────────────────────────────────────────────────────────

export type SSEConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export type SSEEvent =
  | { type: "viewer_count_update"; platform: PlatformId; count: number }
  | { type: "chat_message"; message: ChatMessage }
  | { type: "stream_event"; event: StreamEvent }
  | {
      type: "agent_action";
      workerType: AgentType;
      action: string;
      platform: PlatformId | "all";
      status: "success" | "pending" | "failed";
    }
  | { type: "approval_request"; request: ApprovalRequest }
  | { type: "approval_expired"; requestId: string }
  | { type: "clip_status_update"; clipId: string; status: ClipStatus; progress?: number }
  | { type: "stream_health"; health: StreamHealth }
  | { type: "post_published"; postId: string; platform: PlatformId; url?: string }
  | { type: "post_failed"; postId: string; platform: PlatformId; reason: string }
  | { type: "model_update"; version: string; confidence: number }
  | { type: "notification"; notification: Notification }
  | { type: "stream_started"; session: StreamSession }
  | { type: "stream_ended"; session: StreamSession }
  | { type: "follower_milestone"; count: number; platform: PlatformId };

// ─── UI State shapes ──────────────────────────────────────────────────────────

export type ModalId =
  | "clip-edit"
  | "post-compose"
  | "sponsor-create"
  | "sponsor-edit"
  | "workflow-create"
  | "moderation-ban"
  | "platform-connect"
  | "stream-start"
  | "stream-end-confirm"
  | "clip-detail"
  | "approval-review"
  | null;

export type ToastType = "success" | "error" | "warning" | "info";

// ─── Query state helpers ──────────────────────────────────────────────────────

/** Standardised loading/error/empty states for every data-fetching UI */
export type QueryStatus = "idle" | "loading" | "success" | "error";

export type DataState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
