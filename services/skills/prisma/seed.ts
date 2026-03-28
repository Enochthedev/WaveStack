/**
 * Built-in WaveStack skills seed.
 * Run with: npx ts-node prisma/seed.ts
 * Or via: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// system org/user are seeded separately; skills owned by "system" are visible to all orgs
const SYSTEM_ORG = "system";

const builtInSkills = [
  // ── Clip & Ship ────────────────────────────────────────────────────────
  {
    slug: "clip-and-ship",
    name: "Clip & Ship",
    description:
      "Auto-clip a stream highlight, generate a thumbnail, write a caption, and publish to TikTok + YouTube Shorts.",
    category: "content",
    config: {
      steps: [
        {
          name: "create_clip",
          serverName: "ffmpeg-tools",
          toolName: "clip_video",
          arguments: {
            source: "{{input.stream_url}}",
            start_sec: "{{input.start_sec}}",
            duration_sec: "{{input.duration_sec}}",
            output_format: "mp4",
          },
        },
        {
          name: "generate_thumbnail",
          serverName: "ffmpeg-tools",
          toolName: "extract_thumbnail",
          arguments: {
            source: "{{create_clip.output_path}}",
            at_sec: 2,
          },
        },
        {
          name: "generate_caption",
          serverName: "wavestack-internal",
          toolName: "generate_caption",
          arguments: {
            clip_path: "{{create_clip.output_path}}",
            platform: "{{input.platform}}",
            tone: "{{input.tone}}",
          },
        },
        {
          name: "publish_clip",
          serverName: "wavestack-internal",
          toolName: "publish_content",
          arguments: {
            video_path: "{{create_clip.output_path}}",
            thumbnail_path: "{{generate_thumbnail.output_path}}",
            caption: "{{generate_caption.caption}}",
            platforms: "{{input.platforms}}",
          },
        },
      ],
      inputSchema: {
        type: "object",
        required: ["stream_url", "start_sec", "duration_sec"],
        properties: {
          stream_url: { type: "string" },
          start_sec: { type: "number" },
          duration_sec: { type: "number", default: 30 },
          platform: { type: "string", default: "general" },
          tone: { type: "string", default: "energetic" },
          platforms: {
            type: "array",
            items: { type: "string" },
            default: ["tiktok", "youtube_shorts"],
          },
        },
      },
      outputMapping: {
        clip_url: "publish_clip.urls",
        caption: "generate_caption.caption",
        thumbnail_url: "generate_thumbnail.output_path",
      },
    },
  },

  // ── Stream Recap ───────────────────────────────────────────────────────
  {
    slug: "stream-recap",
    name: "Stream Recap",
    description:
      "After a stream ends: generate a summary, create a highlight reel, and post a recap thread.",
    category: "content",
    config: {
      steps: [
        {
          name: "get_transcript",
          serverName: "wavestack-internal",
          toolName: "get_stream_transcript",
          arguments: { stream_id: "{{input.stream_id}}" },
        },
        {
          name: "generate_summary",
          serverName: "wavestack-internal",
          toolName: "summarise_text",
          arguments: {
            text: "{{get_transcript.transcript}}",
            max_tokens: 500,
            format: "thread",
          },
        },
        {
          name: "build_highlight_reel",
          serverName: "ffmpeg-tools",
          toolName: "concat_clips",
          arguments: {
            clips: "{{input.highlight_clips}}",
            output_format: "mp4",
            transition: "fade",
          },
        },
        {
          name: "post_recap",
          serverName: "wavestack-internal",
          toolName: "post_thread",
          arguments: {
            content: "{{generate_summary.summary}}",
            media_path: "{{build_highlight_reel.output_path}}",
            platforms: "{{input.platforms}}",
          },
        },
      ],
      inputSchema: {
        type: "object",
        required: ["stream_id"],
        properties: {
          stream_id: { type: "string" },
          highlight_clips: { type: "array", items: { type: "string" }, default: [] },
          platforms: { type: "array", items: { type: "string" }, default: ["discord", "twitter"] },
        },
      },
      outputMapping: {
        summary: "generate_summary.summary",
        reel_url: "build_highlight_reel.output_path",
        post_urls: "post_recap.urls",
      },
    },
  },

  // ── Stream-to-Clips ────────────────────────────────────────────────────
  {
    slug: "stream-to-clips",
    name: "Stream to Clips",
    description:
      "Detect highlights in a stream VOD and slice it into multiple ready-to-share clips.",
    category: "content",
    config: {
      steps: [
        {
          name: "detect_highlights",
          serverName: "wavestack-internal",
          toolName: "detect_stream_highlights",
          arguments: {
            stream_id: "{{input.stream_id}}",
            min_hype_score: "{{input.min_hype_score}}",
            max_clips: "{{input.max_clips}}",
          },
        },
        {
          name: "create_clips",
          serverName: "ffmpeg-tools",
          toolName: "batch_clip",
          arguments: {
            source: "{{input.vod_url}}",
            segments: "{{detect_highlights.segments}}",
            output_format: "mp4",
          },
        },
        {
          name: "queue_clips",
          serverName: "wavestack-internal",
          toolName: "add_to_queue",
          arguments: {
            clip_paths: "{{create_clips.output_paths}}",
            org_id: "{{input.org_id}}",
            status: "ready",
          },
        },
      ],
      inputSchema: {
        type: "object",
        required: ["stream_id", "vod_url"],
        properties: {
          stream_id: { type: "string" },
          vod_url: { type: "string" },
          min_hype_score: { type: "number", default: 0.65 },
          max_clips: { type: "number", default: 10 },
          org_id: { type: "string" },
        },
      },
      outputMapping: {
        clip_count: "queue_clips.count",
        clip_ids: "queue_clips.ids",
      },
    },
  },

  // ── VOD to Shorts ──────────────────────────────────────────────────────
  {
    slug: "vod-to-shorts",
    name: "VOD to Shorts",
    description:
      "Extract the best 60-second segments from a VOD, transcode to vertical 9:16, and queue for YouTube Shorts.",
    category: "content",
    config: {
      steps: [
        {
          name: "extract_segments",
          serverName: "wavestack-internal",
          toolName: "extract_shorts_segments",
          arguments: {
            vod_url: "{{input.vod_url}}",
            max_segments: "{{input.max_segments}}",
            duration_sec: 60,
          },
        },
        {
          name: "transcode_vertical",
          serverName: "ffmpeg-tools",
          toolName: "transcode",
          arguments: {
            sources: "{{extract_segments.clip_paths}}",
            format: "mp4",
            resolution: "1080x1920",
            crop: "center",
          },
        },
        {
          name: "generate_captions",
          serverName: "wavestack-internal",
          toolName: "batch_generate_captions",
          arguments: {
            video_paths: "{{transcode_vertical.output_paths}}",
            platform: "youtube_shorts",
          },
        },
        {
          name: "queue_for_upload",
          serverName: "wavestack-internal",
          toolName: "add_to_queue",
          arguments: {
            clip_paths: "{{transcode_vertical.output_paths}}",
            captions: "{{generate_captions.captions}}",
            platform: "youtube_shorts",
            org_id: "{{input.org_id}}",
            status: "scheduled",
            schedule_at: "{{input.schedule_at}}",
          },
        },
      ],
      inputSchema: {
        type: "object",
        required: ["vod_url"],
        properties: {
          vod_url: { type: "string" },
          max_segments: { type: "number", default: 5 },
          org_id: { type: "string" },
          schedule_at: { type: "string", format: "date-time" },
        },
      },
      outputMapping: {
        shorts_count: "queue_for_upload.count",
        queue_ids: "queue_for_upload.ids",
      },
    },
  },

  // ── Morning Brief ──────────────────────────────────────────────────────
  {
    slug: "morning-brief",
    name: "Morning Brief",
    description:
      "Every morning: check trending topics, generate content ideas, draft a tweet, and queue it for review.",
    category: "growth",
    config: {
      steps: [
        {
          name: "check_trending",
          serverName: "wavestack-internal",
          toolName: "get_trending_topics",
          arguments: { niche: "{{input.niche}}", limit: 5 },
        },
        {
          name: "generate_ideas",
          serverName: "wavestack-internal",
          toolName: "generate_content_ideas",
          arguments: {
            trending: "{{check_trending.topics}}",
            creator_context: "{{input.creator_context}}",
            count: 3,
          },
        },
        {
          name: "draft_post",
          serverName: "wavestack-internal",
          toolName: "draft_post",
          arguments: {
            ideas: "{{generate_ideas.ideas}}",
            platform: "{{input.platform}}",
            tone: "{{input.tone}}",
          },
        },
        {
          name: "queue_draft",
          serverName: "wavestack-internal",
          toolName: "add_draft_to_queue",
          arguments: {
            draft: "{{draft_post.draft}}",
            platform: "{{input.platform}}",
            org_id: "{{input.org_id}}",
            requires_approval: true,
          },
        },
      ],
      inputSchema: {
        type: "object",
        properties: {
          niche: { type: "string", default: "gaming" },
          creator_context: { type: "string" },
          platform: { type: "string", default: "twitter" },
          tone: { type: "string", default: "casual" },
          org_id: { type: "string" },
        },
      },
      outputMapping: {
        draft: "draft_post.draft",
        ideas: "generate_ideas.ideas",
        queue_id: "queue_draft.id",
      },
    },
  },
];

async function main() {
  console.log("Seeding built-in skills...");

  for (const skill of builtInSkills) {
    await db.skill.upsert({
      where: { orgId_slug: { orgId: SYSTEM_ORG, slug: skill.slug } },
      create: {
        orgId: SYSTEM_ORG,
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        category: skill.category,
        isBuiltIn: true,
        isEnabled: true,
        config: skill.config as object,
      },
      update: {
        name: skill.name,
        description: skill.description,
        category: skill.category,
        isBuiltIn: true,
        config: skill.config as object,
      },
    });
    console.log(`  ✓ ${skill.slug}`);
  }

  console.log("✅ Built-in skills seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
