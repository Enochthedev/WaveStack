/**
 * Curated marketplace catalog of MCP integrations.
 *
 * Each entry represents an integration WaveStack has vetted.
 * Creators browse this catalog and click "Connect" — they never
 * manually enter MCP server URLs or transport configs.
 */

export interface CatalogIntegration {
  slug: string;
  name: string;
  description: string;
  icon: string; // URL or icon key for the frontend
  category: "dev-tools" | "productivity" | "social" | "analytics" | "design" | "cms" | "automation";
  authType: "oauth" | "api-key" | "none";
  transport: "stdio" | "sse" | "http";

  /** Pre-filled transport config — tokens like {{API_KEY}} are substituted at connect time. */
  configTemplate: Record<string, unknown>;

  /** OAuth details (only when authType === "oauth"). */
  oauth?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientIdEnvVar: string;
    clientSecretEnvVar: string;
  };

  /** Fields the creator must provide for api-key auth (e.g. ["apiKey", "workspaceId"]). */
  requiredCredentials?: string[];

  tags: string[];
  enabled: boolean;
}

export const INTEGRATIONS: CatalogIntegration[] = [
  // ── Dev Tools ──────────────────────────────────────────────
  {
    slug: "github",
    name: "GitHub",
    description: "Manage repos, issues, PRs, and code search from your agents.",
    icon: "github",
    category: "dev-tools",
    authType: "oauth",
    transport: "stdio",
    configTemplate: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: "{{ACCESS_TOKEN}}" },
    },
    oauth: {
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scopes: ["repo", "read:org"],
      clientIdEnvVar: "GITHUB_CLIENT_ID",
      clientSecretEnvVar: "GITHUB_CLIENT_SECRET",
    },
    tags: ["git", "code", "repos", "issues"],
    enabled: true,
  },
  {
    slug: "sentry",
    name: "Sentry",
    description: "Monitor errors and performance across your apps.",
    icon: "sentry",
    category: "dev-tools",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://sentry.io/api/mcp",
      headers: { Authorization: "Bearer {{API_KEY}}" },
    },
    requiredCredentials: ["apiKey"],
    tags: ["monitoring", "errors", "observability"],
    enabled: true,
  },
  {
    slug: "vercel",
    name: "Vercel",
    description: "Deploy, manage projects, and check build status.",
    icon: "vercel",
    category: "dev-tools",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://api.vercel.com/mcp",
      headers: { Authorization: "Bearer {{API_KEY}}" },
    },
    requiredCredentials: ["apiKey"],
    tags: ["deploy", "hosting", "builds"],
    enabled: true,
  },
  {
    slug: "supabase",
    name: "Supabase",
    description: "Query databases, manage storage, and invoke edge functions.",
    icon: "supabase",
    category: "dev-tools",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "{{PROJECT_URL}}/mcp",
      headers: { apikey: "{{API_KEY}}", Authorization: "Bearer {{API_KEY}}" },
    },
    requiredCredentials: ["apiKey", "projectUrl"],
    tags: ["database", "storage", "auth"],
    enabled: true,
  },

  // ── Productivity ───────────────────────────────────────────
  {
    slug: "notion",
    name: "Notion",
    description: "Search, read, and update Notion pages and databases.",
    icon: "notion",
    category: "productivity",
    authType: "oauth",
    transport: "http",
    configTemplate: {
      url: "https://api.notion.com/mcp",
      headers: { Authorization: "Bearer {{ACCESS_TOKEN}}", "Notion-Version": "2022-06-28" },
    },
    oauth: {
      authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
      tokenUrl: "https://api.notion.com/v1/oauth/token",
      scopes: [],
      clientIdEnvVar: "NOTION_CLIENT_ID",
      clientSecretEnvVar: "NOTION_CLIENT_SECRET",
    },
    tags: ["docs", "wiki", "notes", "database"],
    enabled: true,
  },
  {
    slug: "linear",
    name: "Linear",
    description: "Create and manage issues, projects, and cycles.",
    icon: "linear",
    category: "productivity",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://api.linear.app/mcp",
      headers: { Authorization: "{{API_KEY}}" },
    },
    requiredCredentials: ["apiKey"],
    tags: ["issues", "project-management", "sprints"],
    enabled: true,
  },
  {
    slug: "google-calendar",
    name: "Google Calendar",
    description: "View and manage calendar events, schedule streams.",
    icon: "google-calendar",
    category: "productivity",
    authType: "oauth",
    transport: "http",
    configTemplate: {
      url: "https://www.googleapis.com/calendar/mcp",
      headers: { Authorization: "Bearer {{ACCESS_TOKEN}}" },
    },
    oauth: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/calendar"],
      clientIdEnvVar: "GOOGLE_CLIENT_ID",
      clientSecretEnvVar: "GOOGLE_CLIENT_SECRET",
    },
    tags: ["calendar", "scheduling", "events"],
    enabled: true,
  },
  {
    slug: "google-drive",
    name: "Google Drive",
    description: "Search, read, and organize files in Google Drive.",
    icon: "google-drive",
    category: "productivity",
    authType: "oauth",
    transport: "http",
    configTemplate: {
      url: "https://www.googleapis.com/drive/mcp",
      headers: { Authorization: "Bearer {{ACCESS_TOKEN}}" },
    },
    oauth: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      clientIdEnvVar: "GOOGLE_CLIENT_ID",
      clientSecretEnvVar: "GOOGLE_CLIENT_SECRET",
    },
    tags: ["files", "documents", "storage"],
    enabled: true,
  },

  // ── Social ─────────────────────────────────────────────────
  {
    slug: "slack",
    name: "Slack",
    description: "Send messages, read channels, and manage Slack workspaces.",
    icon: "slack",
    category: "social",
    authType: "oauth",
    transport: "http",
    configTemplate: {
      url: "https://slack.com/api/mcp",
      headers: { Authorization: "Bearer {{ACCESS_TOKEN}}" },
    },
    oauth: {
      authorizationUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      scopes: ["channels:read", "chat:write", "users:read"],
      clientIdEnvVar: "SLACK_CLIENT_ID",
      clientSecretEnvVar: "SLACK_CLIENT_SECRET",
    },
    tags: ["messaging", "chat", "communication"],
    enabled: true,
  },
  {
    slug: "discord",
    name: "Discord",
    description: "Manage servers, channels, and messages in Discord.",
    icon: "discord",
    category: "social",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://discord.com/api/mcp",
      headers: { Authorization: "Bot {{API_KEY}}" },
    },
    requiredCredentials: ["apiKey"],
    tags: ["messaging", "communities", "gaming"],
    enabled: true,
  },

  // ── Analytics ──────────────────────────────────────────────
  {
    slug: "google-analytics",
    name: "Google Analytics",
    description: "Pull audience data, traffic sources, and engagement metrics.",
    icon: "google-analytics",
    category: "analytics",
    authType: "oauth",
    transport: "http",
    configTemplate: {
      url: "https://analyticsdata.googleapis.com/mcp",
      headers: { Authorization: "Bearer {{ACCESS_TOKEN}}" },
    },
    oauth: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      clientIdEnvVar: "GOOGLE_CLIENT_ID",
      clientSecretEnvVar: "GOOGLE_CLIENT_SECRET",
    },
    tags: ["traffic", "audience", "metrics"],
    enabled: true,
  },

  // ── Design ─────────────────────────────────────────────────
  {
    slug: "figma",
    name: "Figma",
    description: "Access design files, components, and styles.",
    icon: "figma",
    category: "design",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://api.figma.com/mcp",
      headers: { "X-Figma-Token": "{{API_KEY}}" },
    },
    requiredCredentials: ["apiKey"],
    tags: ["design", "ui", "components"],
    enabled: true,
  },
  {
    slug: "canva",
    name: "Canva",
    description: "Create thumbnails, banners, and social graphics from templates.",
    icon: "canva",
    category: "design",
    authType: "oauth",
    transport: "http",
    configTemplate: {
      url: "https://api.canva.com/mcp",
      headers: { Authorization: "Bearer {{ACCESS_TOKEN}}" },
    },
    oauth: {
      authorizationUrl: "https://www.canva.com/api/oauth/authorize",
      tokenUrl: "https://www.canva.com/api/oauth/token",
      scopes: ["design:content:read", "design:content:write"],
      clientIdEnvVar: "CANVA_CLIENT_ID",
      clientSecretEnvVar: "CANVA_CLIENT_SECRET",
    },
    tags: ["graphics", "thumbnails", "templates"],
    enabled: true,
  },

  // ── CMS ────────────────────────────────────────────────────
  {
    slug: "sanity",
    name: "Sanity",
    description: "Query and manage structured content in Sanity CMS.",
    icon: "sanity",
    category: "cms",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://{{PROJECT_ID}}.api.sanity.io/mcp",
      headers: { Authorization: "Bearer {{API_KEY}}" },
    },
    requiredCredentials: ["apiKey", "projectId"],
    tags: ["content", "cms", "structured-content"],
    enabled: true,
  },
  {
    slug: "wordpress",
    name: "WordPress",
    description: "Create and manage posts, pages, and media.",
    icon: "wordpress",
    category: "cms",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "{{SITE_URL}}/wp-json/mcp/v1",
      headers: { Authorization: "Bearer {{API_KEY}}" },
    },
    requiredCredentials: ["apiKey", "siteUrl"],
    tags: ["blog", "posts", "content"],
    enabled: true,
  },

  // ── Automation ─────────────────────────────────────────────
  {
    slug: "zapier",
    name: "Zapier",
    description: "Trigger Zaps and connect to 5000+ apps.",
    icon: "zapier",
    category: "automation",
    authType: "api-key",
    transport: "http",
    configTemplate: {
      url: "https://actions.zapier.com/mcp",
      headers: { "X-API-Key": "{{API_KEY}}" },
    },
    requiredCredentials: ["apiKey"],
    tags: ["automation", "workflows", "integrations"],
    enabled: true,
  },
];
