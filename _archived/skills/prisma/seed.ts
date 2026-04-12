/**
 * Built-in WaveStack skill library seed.
 * Run with: npx prisma db seed
 *
 * Creates system-owned public skills in the marketplace.
 * Each skill gets a 1.0.0 version with its full step definition.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SYSTEM_ORG = "system";
const SYSTEM_USER = "system";

const builtInSkills = [
  // ── Clip & Ship ────────────────────────────────────────────────────────────
  {
    slug: "clip-and-ship",
    name: "Clip & Ship",
    description:
      "Auto-clip a stream highlight, generate a thumbnail, write a caption, and publish to TikTok + YouTube Shorts.",
    category: "content",
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

  // ── Stream Recap ───────────────────────────────────────────────────────────
  {
    slug: "stream-recap",
    name: "Stream Recap",
    description:
      "After a stream ends: generate a summary, create a highlight reel, and post a recap thread.",
    category: "content",
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
        platforms: {
          type: "array",
          items: { type: "string" },
          default: ["discord", "twitter"],
        },
      },
    },
    outputMapping: {
      summary: "generate_summary.summary",
      reel_url: "build_highlight_reel.output_path",
      post_urls: "post_recap.urls",
    },
  },

  // ── Stream to Clips ────────────────────────────────────────────────────────
  {
    slug: "stream-to-clips",
    name: "Stream to Clips",
    description:
      "Detect highlights in a stream VOD and slice it into multiple ready-to-share clips.",
    category: "content",
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

  // ── VOD to Shorts ──────────────────────────────────────────────────────────
  {
    slug: "vod-to-shorts",
    name: "VOD to Shorts",
    description:
      "Extract the best 60-second segments from a VOD, transcode to vertical 9:16, and queue for YouTube Shorts.",
    category: "content",
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

  // ── Morning Brief ──────────────────────────────────────────────────────────
  {
    slug: "morning-brief",
    name: "Morning Brief",
    description:
      "Every morning: check trending topics, generate content ideas, draft a post, and queue it for review.",
    category: "growth",
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

  // ── Sponsor Report ─────────────────────────────────────────────────────────
  {
    slug: "sponsor-report",
    name: "Sponsor Report",
    description:
      "Pull your latest analytics, generate a branded performance report, and email it to your sponsor.",
    category: "analytics",
    steps: [
      {
        name: "fetch_analytics",
        serverName: "wavestack-internal",
        toolName: "get_stream_analytics",
        arguments: {
          org_id: "{{input.org_id}}",
          date_range: "{{input.date_range}}",
        },
      },
      {
        name: "generate_report",
        serverName: "wavestack-internal",
        toolName: "generate_sponsor_report",
        arguments: {
          analytics: "{{fetch_analytics.data}}",
          sponsor_name: "{{input.sponsor_name}}",
          deal_id: "{{input.deal_id}}",
        },
      },
      {
        name: "send_report",
        serverName: "wavestack-internal",
        toolName: "send_email",
        arguments: {
          to: "{{input.sponsor_email}}",
          subject: "Performance Report — {{input.sponsor_name}}",
          attachment: "{{generate_report.pdf_path}}",
          body: "{{generate_report.summary}}",
        },
      },
    ],
    inputSchema: {
      type: "object",
      required: ["sponsor_name", "sponsor_email"],
      properties: {
        sponsor_name: { type: "string" },
        sponsor_email: { type: "string", format: "email" },
        deal_id: { type: "string" },
        date_range: { type: "string", default: "last_30_days" },
        org_id: { type: "string" },
      },
    },
    outputMapping: {
      report_url: "generate_report.pdf_path",
      summary: "generate_report.summary",
    },
  },

  // ── Raid Thank You ─────────────────────────────────────────────────────────
  {
    slug: "raid-thank-you",
    name: "Raid Thank You",
    description:
      "On a Twitch raid: auto-shoutout the raider, clip the moment, and post to Discord.",
    category: "community",
    steps: [
      {
        name: "shoutout",
        serverName: "wavestack-internal",
        toolName: "send_twitch_shoutout",
        arguments: {
          channel: "{{input.raider_channel}}",
          message: "{{input.thank_you_message}}",
        },
      },
      {
        name: "clip_moment",
        serverName: "ffmpeg-tools",
        toolName: "clip_video",
        arguments: {
          source: "{{input.stream_url}}",
          start_sec: "{{input.raid_timestamp}}",
          duration_sec: 30,
          output_format: "mp4",
        },
      },
      {
        name: "post_to_discord",
        serverName: "wavestack-internal",
        toolName: "post_discord_message",
        arguments: {
          channel_id: "{{input.discord_channel_id}}",
          content: "Just got raided by {{input.raider_channel}}!",
          attachment: "{{clip_moment.output_path}}",
        },
      },
    ],
    inputSchema: {
      type: "object",
      required: ["raider_channel", "stream_url"],
      properties: {
        raider_channel: { type: "string" },
        stream_url: { type: "string" },
        raid_timestamp: { type: "number", default: 0 },
        thank_you_message: {
          type: "string",
          default: "Thanks for the raid! Go check them out!",
        },
        discord_channel_id: { type: "string" },
      },
    },
    outputMapping: {
      clip_url: "clip_moment.output_path",
      discord_post_id: "post_to_discord.message_id",
    },
  },
];

async function main() {
  console.log("Seeding WaveStack skill library...");

  for (const s of builtInSkills) {
    const skill = await db.skill.upsert({
      where: { orgId_slug: { orgId: SYSTEM_ORG, slug: s.slug } },
      create: {
        orgId: SYSTEM_ORG,
        authorId: SYSTEM_USER,
        name: s.name,
        slug: s.slug,
        description: s.description,
        category: s.category,
        isPublic: true,
      },
      update: {
        name: s.name,
        description: s.description,
        category: s.category,
        isPublic: true,
      },
    });

    // Upsert the 1.0.0 version — update definition if it already exists
    const existingVersion = await db.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version: "1.0.0" } },
    });

    if (existingVersion) {
      await db.skillVersion.update({
        where: { id: existingVersion.id },
        data: {
          definition: { steps: s.steps },
          inputSchema: s.inputSchema,
          outputMapping: s.outputMapping,
          isLatest: true,
          isPublished: true,
        },
      });
    } else {
      // Unmark any previous latest
      await db.skillVersion.updateMany({
        where: { skillId: skill.id, isLatest: true },
        data: { isLatest: false },
      });
      await db.skillVersion.create({
        data: {
          skillId: skill.id,
          version: "1.0.0",
          definition: { steps: s.steps },
          inputSchema: s.inputSchema,
          outputMapping: s.outputMapping,
          isLatest: true,
          isPublished: true,
        },
      });
    }

    console.log(`  ✓ ${s.slug}`);
  }

  console.log(`✅ Seeded ${builtInSkills.length} skills.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
