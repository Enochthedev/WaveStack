-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "data_consent" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "billing_customer_id" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_credentials" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_handle" TEXT,
    "account_avatar_url" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_configs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "autonomy_level" TEXT NOT NULL DEFAULT 'copilot',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "system_prompt" TEXT,
    "allowed_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "config" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "reasoning_trace" JSONB,
    "skill_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "proposed_action" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "feedback" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_crews" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "agent_types" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'idle',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "agent_type" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_sessions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "stream_key" TEXT,
    "title" TEXT,
    "game" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "peak_viewers" INTEGER,
    "platforms_relayed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vod_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stream_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_events" (
    "id" TEXT NOT NULL,
    "stream_session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "stream_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "mime_type" TEXT,
    "duration" INTEGER,
    "size_bytes" BIGINT,
    "storage_path" TEXT,
    "cdn_url" TEXT,
    "source_stream_id" TEXT,
    "source_start_sec" DOUBLE PRECISION,
    "source_end_sec" DOUBLE PRECISION,
    "transcript" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_items" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "title" VARCHAR(120) NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[],
    "schedule_at" TIMESTAMP(3),
    "timezone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "idempotency_key" TEXT NOT NULL,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "outbox" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "queue_item_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_models" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "base_model" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "training_examples_count" INTEGER NOT NULL DEFAULT 0,
    "confidence_score" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "endpoint_url" TEXT,
    "deployed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_examples" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "example_type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "feedback" TEXT,
    "platform" TEXT,
    "source" TEXT NOT NULL DEFAULT 'auto',
    "model_used" TEXT,
    "quality_score" DECIMAL(5,4),
    "consent_given" BOOLEAN NOT NULL DEFAULT true,
    "used_in_training" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_snapshots" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "followers" BIGINT NOT NULL DEFAULT 0,
    "views" BIGINT NOT NULL DEFAULT 0,
    "engagement_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "revenue_cents" BIGINT NOT NULL DEFAULT 0,
    "snapshotted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_performance" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "views" BIGINT NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "watch_time_minutes" BIGINT NOT NULL DEFAULT 0,
    "ctr" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_executions" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "step_results" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'follower',
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "bits_given" INTEGER NOT NULL DEFAULT 0,
    "months_subscribed" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_log_entries" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "member_id" TEXT,
    "stream_session_id" TEXT,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" TEXT,
    "target_value" INTEGER NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "metric_type" TEXT NOT NULL,
    "reached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flagged_messages" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "stream_session_id" TEXT,
    "platform_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "action_taken" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flagged_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_rules" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pattern" TEXT,
    "action" TEXT NOT NULL,
    "timeout_duration" INTEGER,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "reason" TEXT,
    "banned_by" TEXT,
    "banned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "banned_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "contact_email" TEXT,
    "deal_value" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_deliverables" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "sponsor_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_scores" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content_id" TEXT,
    "title" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "profile_url" TEXT,
    "followers" BIGINT NOT NULL DEFAULT 0,
    "avg_views" BIGINT NOT NULL DEFAULT 0,
    "last_checked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "runs_total" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggered_by" TEXT NOT NULL DEFAULT 'manual',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invited_by" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "canceled_at" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "billing_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "description" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "stripe_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memories" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'auto',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_deleted_at_idx" ON "organizations"("deleted_at");

-- CreateIndex
CREATE INDEX "org_members_user_id_idx" ON "org_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_org_id_user_id_key" ON "org_members"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "platform_credentials_org_id_idx" ON "platform_credentials"("org_id");

-- CreateIndex
CREATE INDEX "platform_credentials_platform_idx" ON "platform_credentials"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "platform_credentials_org_id_platform_account_id_key" ON "platform_credentials"("org_id", "platform", "account_id");

-- CreateIndex
CREATE INDEX "agent_configs_org_id_idx" ON "agent_configs"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_configs_org_id_agent_type_key" ON "agent_configs"("org_id", "agent_type");

-- CreateIndex
CREATE INDEX "agent_tasks_org_id_idx" ON "agent_tasks"("org_id");

-- CreateIndex
CREATE INDEX "agent_tasks_agent_type_idx" ON "agent_tasks"("agent_type");

-- CreateIndex
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks"("status");

-- CreateIndex
CREATE INDEX "agent_tasks_org_id_status_idx" ON "agent_tasks"("org_id", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_org_id_agent_type_status_idx" ON "agent_tasks"("org_id", "agent_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_task_id_key" ON "approval_requests"("task_id");

-- CreateIndex
CREATE INDEX "approval_requests_org_id_idx" ON "approval_requests"("org_id");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_expires_at_idx" ON "approval_requests"("expires_at");

-- CreateIndex
CREATE INDEX "agent_crews_org_id_idx" ON "agent_crews"("org_id");

-- CreateIndex
CREATE INDEX "chat_sessions_org_id_idx" ON "chat_sessions"("org_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "stream_sessions_org_id_idx" ON "stream_sessions"("org_id");

-- CreateIndex
CREATE INDEX "stream_sessions_status_idx" ON "stream_sessions"("status");

-- CreateIndex
CREATE INDEX "stream_events_stream_session_id_idx" ON "stream_events"("stream_session_id");

-- CreateIndex
CREATE INDEX "stream_events_event_type_idx" ON "stream_events"("event_type");

-- CreateIndex
CREATE INDEX "assets_org_id_idx" ON "assets"("org_id");

-- CreateIndex
CREATE INDEX "assets_project_id_idx" ON "assets"("project_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "queue_items_idempotency_key_key" ON "queue_items"("idempotency_key");

-- CreateIndex
CREATE INDEX "queue_items_org_id_idx" ON "queue_items"("org_id");

-- CreateIndex
CREATE INDEX "queue_items_status_idx" ON "queue_items"("status");

-- CreateIndex
CREATE INDEX "queue_items_schedule_at_idx" ON "queue_items"("schedule_at");

-- CreateIndex
CREATE INDEX "queue_items_org_id_status_idx" ON "queue_items"("org_id", "status");

-- CreateIndex
CREATE INDEX "queue_items_org_id_schedule_at_idx" ON "queue_items"("org_id", "schedule_at");

-- CreateIndex
CREATE INDEX "posts_org_id_idx" ON "posts"("org_id");

-- CreateIndex
CREATE INDEX "posts_platform_idx" ON "posts"("platform");

-- CreateIndex
CREATE INDEX "posts_published_at_idx" ON "posts"("published_at");

-- CreateIndex
CREATE INDEX "posts_queue_item_id_idx" ON "posts"("queue_item_id");

-- CreateIndex
CREATE INDEX "posts_org_id_platform_idx" ON "posts"("org_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "posts_queue_item_id_platform_key" ON "posts"("queue_item_id", "platform");

-- CreateIndex
CREATE INDEX "projects_org_id_idx" ON "projects"("org_id");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE INDEX "creator_models_org_id_idx" ON "creator_models"("org_id");

-- CreateIndex
CREATE INDEX "creator_models_status_idx" ON "creator_models"("status");

-- CreateIndex
CREATE INDEX "training_examples_org_id_idx" ON "training_examples"("org_id");

-- CreateIndex
CREATE INDEX "training_examples_user_id_idx" ON "training_examples"("user_id");

-- CreateIndex
CREATE INDEX "training_examples_example_type_idx" ON "training_examples"("example_type");

-- CreateIndex
CREATE INDEX "training_examples_used_in_training_idx" ON "training_examples"("used_in_training");

-- CreateIndex
CREATE INDEX "training_examples_consent_given_idx" ON "training_examples"("consent_given");

-- CreateIndex
CREATE INDEX "platform_snapshots_org_id_idx" ON "platform_snapshots"("org_id");

-- CreateIndex
CREATE INDEX "platform_snapshots_platform_idx" ON "platform_snapshots"("platform");

-- CreateIndex
CREATE INDEX "platform_snapshots_snapshotted_at_idx" ON "platform_snapshots"("snapshotted_at");

-- CreateIndex
CREATE INDEX "platform_snapshots_org_id_platform_snapshotted_at_idx" ON "platform_snapshots"("org_id", "platform", "snapshotted_at");

-- CreateIndex
CREATE INDEX "content_performance_org_id_idx" ON "content_performance"("org_id");

-- CreateIndex
CREATE INDEX "content_performance_platform_idx" ON "content_performance"("platform");

-- CreateIndex
CREATE INDEX "content_performance_fetched_at_idx" ON "content_performance"("fetched_at");

-- CreateIndex
CREATE INDEX "content_performance_org_id_platform_fetched_at_idx" ON "content_performance"("org_id", "platform", "fetched_at");

-- CreateIndex
CREATE INDEX "content_performance_asset_id_idx" ON "content_performance"("asset_id");

-- CreateIndex
CREATE INDEX "skills_org_id_idx" ON "skills"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_org_id_slug_key" ON "skills"("org_id", "slug");

-- CreateIndex
CREATE INDEX "skill_executions_skill_id_idx" ON "skill_executions"("skill_id");

-- CreateIndex
CREATE INDEX "skill_executions_org_id_idx" ON "skill_executions"("org_id");

-- CreateIndex
CREATE INDEX "skill_executions_status_idx" ON "skill_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_org_id_idx" ON "api_keys"("org_id");

-- CreateIndex
CREATE INDEX "revoked_tokens_expires_at_idx" ON "revoked_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "community_members_org_id_idx" ON "community_members"("org_id");

-- CreateIndex
CREATE INDEX "community_members_platform_idx" ON "community_members"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_org_id_platform_platform_user_id_key" ON "community_members"("org_id", "platform", "platform_user_id");

-- CreateIndex
CREATE INDEX "chat_log_entries_org_id_idx" ON "chat_log_entries"("org_id");

-- CreateIndex
CREATE INDEX "chat_log_entries_platform_idx" ON "chat_log_entries"("platform");

-- CreateIndex
CREATE INDEX "chat_log_entries_timestamp_idx" ON "chat_log_entries"("timestamp");

-- CreateIndex
CREATE INDEX "chat_log_entries_flagged_idx" ON "chat_log_entries"("flagged");

-- CreateIndex
CREATE INDEX "chat_log_entries_member_id_idx" ON "chat_log_entries"("member_id");

-- CreateIndex
CREATE INDEX "chat_log_entries_stream_session_id_idx" ON "chat_log_entries"("stream_session_id");

-- CreateIndex
CREATE INDEX "chat_log_entries_org_id_platform_timestamp_idx" ON "chat_log_entries"("org_id", "platform", "timestamp");

-- CreateIndex
CREATE INDEX "milestones_org_id_idx" ON "milestones"("org_id");

-- CreateIndex
CREATE INDEX "flagged_messages_org_id_idx" ON "flagged_messages"("org_id");

-- CreateIndex
CREATE INDEX "flagged_messages_status_idx" ON "flagged_messages"("status");

-- CreateIndex
CREATE INDEX "flagged_messages_platform_idx" ON "flagged_messages"("platform");

-- CreateIndex
CREATE INDEX "flagged_messages_org_id_status_idx" ON "flagged_messages"("org_id", "status");

-- CreateIndex
CREATE INDEX "moderation_rules_org_id_idx" ON "moderation_rules"("org_id");

-- CreateIndex
CREATE INDEX "banned_users_org_id_idx" ON "banned_users"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "banned_users_org_id_platform_platform_user_id_key" ON "banned_users"("org_id", "platform", "platform_user_id");

-- CreateIndex
CREATE INDEX "sponsors_org_id_idx" ON "sponsors"("org_id");

-- CreateIndex
CREATE INDEX "sponsors_status_idx" ON "sponsors"("status");

-- CreateIndex
CREATE INDEX "sponsor_deliverables_sponsor_id_idx" ON "sponsor_deliverables"("sponsor_id");

-- CreateIndex
CREATE INDEX "notifications_org_id_idx" ON "notifications"("org_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_org_id_is_read_idx" ON "notifications"("org_id", "is_read");

-- CreateIndex
CREATE INDEX "notification_prefs_org_id_user_id_idx" ON "notification_prefs"("org_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_prefs_org_id_user_id_type_key" ON "notification_prefs"("org_id", "user_id", "type");

-- CreateIndex
CREATE INDEX "seo_scores_org_id_idx" ON "seo_scores"("org_id");

-- CreateIndex
CREATE INDEX "seo_scores_platform_idx" ON "seo_scores"("platform");

-- CreateIndex
CREATE INDEX "seo_scores_org_id_platform_idx" ON "seo_scores"("org_id", "platform");

-- CreateIndex
CREATE INDEX "competitors_org_id_idx" ON "competitors"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_org_id_platform_channel_name_key" ON "competitors"("org_id", "platform", "channel_name");

-- CreateIndex
CREATE INDEX "workflows_org_id_idx" ON "workflows"("org_id");

-- CreateIndex
CREATE INDEX "workflow_runs_workflow_id_idx" ON "workflow_runs"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_runs_org_id_idx" ON "workflow_runs"("org_id");

-- CreateIndex
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_org_id_idx" ON "team_invites"("org_id");

-- CreateIndex
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");

-- CreateIndex
CREATE INDEX "team_invites_token_idx" ON "team_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_org_id_email_key" ON "team_invites"("org_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "billing_org_id_key" ON "billing"("org_id");

-- CreateIndex
CREATE INDEX "invoices_org_id_idx" ON "invoices"("org_id");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "user_memories_org_id_idx" ON "user_memories"("org_id");

-- CreateIndex
CREATE INDEX "user_memories_user_id_idx" ON "user_memories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_memories_org_id_user_id_key_key" ON "user_memories"("org_id", "user_id", "key");

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_credentials" ADD CONSTRAINT "platform_credentials_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "agent_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_crews" ADD CONSTRAINT "agent_crews_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_stream_session_id_fkey" FOREIGN KEY ("stream_session_id") REFERENCES "stream_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_queue_item_id_fkey" FOREIGN KEY ("queue_item_id") REFERENCES "queue_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_models" ADD CONSTRAINT "creator_models_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_examples" ADD CONSTRAINT "training_examples_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_snapshots" ADD CONSTRAINT "platform_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_performance" ADD CONSTRAINT "content_performance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_performance" ADD CONSTRAINT "content_performance_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_executions" ADD CONSTRAINT "skill_executions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_executions" ADD CONSTRAINT "skill_executions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_log_entries" ADD CONSTRAINT "chat_log_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_log_entries" ADD CONSTRAINT "chat_log_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "community_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_messages" ADD CONSTRAINT "flagged_messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_rules" ADD CONSTRAINT "moderation_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banned_users" ADD CONSTRAINT "banned_users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_deliverables" ADD CONSTRAINT "sponsor_deliverables_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_scores" ADD CONSTRAINT "seo_scores_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing" ADD CONSTRAINT "billing_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
