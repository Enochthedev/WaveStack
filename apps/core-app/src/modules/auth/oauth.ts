/**
 * OAuth connection flows for platform integrations.
 *
 * Flow:
 *   1. GET  /oauth/:platform/connect  → redirect user to platform auth page
 *   2. GET  /oauth/:platform/callback → exchange code, store credential, redirect to dashboard
 *
 * Supported:
 *   Twitch    — OAuth 2.0
 *   Twitter/X — OAuth 1.0a (request token → authorize → access token)
 *   YouTube   — OAuth 2.0 (Google)
 *   Discord   — OAuth 2.0
 *   Streamlabs— OAuth 2.0
 *
 * All tokens are stored encrypted via the existing platforms/connect endpoint.
 */
import type { FastifyInstance } from "fastify";
import { sendError } from "@shared/errors";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ENCRYPTION_KEY = Buffer.from(
  process.env.TOKEN_ENCRYPTION_KEY ||
    "0000000000000000000000000000000000000000000000000000000000000000",
  "hex",
);

// Encrypt a short string (for state tokens)
function encryptState(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

function decryptState(s: string): string {
  const [ivH, tagH, dataH] = s.split(":");
  const dec = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, Buffer.from(ivH, "hex"));
  dec.setAuthTag(Buffer.from(tagH, "hex"));
  return dec.update(Buffer.from(dataH, "hex")) + dec.final("utf8");
}

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";

// ── Config per platform ──────────────────────────────────────────────────────

const PLATFORM_OAUTH: Record<
  string,
  {
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    redirectPath: string;
  }
> = {
  twitch: {
    authUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    scope:
      "user:read:email channel:read:subscriptions moderator:manage:banned_users chat:read chat:edit",
    redirectPath: "/oauth/twitch/callback",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: process.env.YOUTUBE_CLIENT_ID || "",
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
    scope: "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload",
    redirectPath: "/oauth/youtube/callback",
  },
  discord: {
    authUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    scope: "identify guilds bot",
    redirectPath: "/oauth/discord/callback",
  },
  streamlabs: {
    authUrl: "https://www.streamlabs.com/api/v1.0/authorize",
    tokenUrl: "https://www.streamlabs.com/api/v1.0/token",
    clientId: process.env.STREAMLABS_CLIENT_ID || "",
    clientSecret: process.env.STREAMLABS_CLIENT_SECRET || "",
    scope: "donations.read alerts.create",
    redirectPath: "/oauth/streamlabs/callback",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRedirectUri(req: any, platform: string): string {
  const host = process.env.CORE_PUBLIC_URL || `http://localhost:${process.env.CORE_PORT || 3000}`;
  return `${host}/api/oauth/${platform}/callback`;
}

async function exchangeCode(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<any> {
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Token exchange failed ${resp.status}: ${body}`);
  }
  return resp.json();
}

async function fetchPlatformProfile(
  platform: string,
  accessToken: string,
): Promise<{ id: string; handle: string; avatarUrl?: string }> {
  switch (platform) {
    case "twitch": {
      const r = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": process.env.TWITCH_CLIENT_ID || "",
        },
      });
      const { data } = await r.json();
      const u = data?.[0];
      return { id: u?.id, handle: u?.login, avatarUrl: u?.profile_image_url };
    }
    case "youtube": {
      const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const u = await r.json();
      return { id: u.id, handle: u.name || u.email, avatarUrl: u.picture };
    }
    case "discord": {
      const r = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const u = await r.json();
      return {
        id: u.id,
        handle: u.username,
        avatarUrl: u.avatar
          ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`
          : undefined,
      };
    }
    case "streamlabs": {
      const r = await fetch(`https://www.streamlabs.com/api/v1.0/user?access_token=${accessToken}`);
      const u = await r.json();
      return {
        id: String(u.twitch?.id || u.youtube?.id || u.id),
        handle: u.displayName || u.twitch?.name,
        avatarUrl: u.streamlabs?.thumbnail,
      };
    }
    default:
      return { id: "unknown", handle: "unknown" };
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

export default async function oauthRoutes(app: FastifyInstance) {
  // GET /oauth/:platform/connect — redirect to platform auth page
  app.get<{ Params: { platform: string }; Querystring: { orgId: string; userId: string } }>(
    "/oauth/:platform/connect",
    async (req, reply) => {
      const { platform } = req.params;
      const { orgId, userId } = req.query;

      if (!orgId || !userId) return sendError(reply, "BAD_REQUEST", "orgId and userId required");

      const cfg = PLATFORM_OAUTH[platform];
      if (!cfg)
        return sendError(reply, "NOT_FOUND", `OAuth not configured for platform: ${platform}`);
      if (!cfg.clientId)
        return sendError(reply, "BAD_REQUEST", `${platform} client ID not configured`);

      // Twitter uses OAuth 1.0a — different flow
      if (platform === "twitter") {
        return reply.redirect(`/oauth/twitter/connect?orgId=${orgId}&userId=${userId}`);
      }

      const state = encryptState(JSON.stringify({ orgId, userId, platform, ts: Date.now() }));
      const redirectUri = getRedirectUri(req, platform);

      const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: cfg.scope,
        state,
      });

      // Discord needs extra flags
      if (platform === "discord") params.set("permissions", "8");

      reply.redirect(`${cfg.authUrl}?${params}`);
    },
  );

  // GET /oauth/:platform/callback — handle OAuth 2.0 callback
  app.get<{
    Params: { platform: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>("/oauth/:platform/callback", async (req, reply) => {
    const { platform } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return reply.redirect(
        `${DASHBOARD_URL}/settings/connections?error=${encodeURIComponent(error)}`,
      );
    }
    if (!code || !state) return sendError(reply, "BAD_REQUEST", "code and state required");

    const cfg = PLATFORM_OAUTH[platform];
    if (!cfg)
      return sendError(reply, "NOT_FOUND", `OAuth not configured for platform: ${platform}`);

    // Validate state
    let stateData: { orgId: string; userId: string; platform: string; ts: number };
    try {
      stateData = JSON.parse(decryptState(state));
    } catch {
      return sendError(reply, "BAD_REQUEST", "Invalid state");
    }
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return sendError(reply, "BAD_REQUEST", "OAuth state expired");
    }

    try {
      const redirectUri = getRedirectUri(req, platform);
      const tokens = await exchangeCode(
        cfg.tokenUrl,
        cfg.clientId,
        cfg.clientSecret,
        code,
        redirectUri,
      );
      const profile = await fetchPlatformProfile(platform, tokens.access_token);

      // Store credential via the existing platforms/connect endpoint (handles encryption)
      await fetch(
        `${process.env.CORE_API_URL || "http://core-app:3000/api"}/v1/platforms/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-org-id": stateData.orgId,
            "x-internal-service": process.env.INTERNAL_SERVICE_SECRET || "",
          },
          body: JSON.stringify({
            platform,
            accountId: profile.id,
            accountHandle: profile.handle,
            accountAvatarUrl: profile.avatarUrl,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : undefined,
            scope: (tokens.scope || cfg.scope).split(/[\s,]+/),
          }),
        },
      );

      reply.redirect(`${DASHBOARD_URL}/settings/connections?connected=${platform}`);
    } catch (err: any) {
      app.log.error({ err }, `OAuth callback failed for ${platform}`);
      reply.redirect(`${DASHBOARD_URL}/settings/connections?error=callback_failed`);
    }
  });

  // ── Twitter OAuth 1.0a (separate flow) ──────────────────────────────────────
  // Twitter still requires OAuth 1.0a for write access (tweepy v2 posting)

  app.get<{ Querystring: { orgId: string; userId: string } }>(
    "/oauth/twitter/connect",
    async (req, reply) => {
      const { orgId, userId } = req.query;
      if (!orgId || !userId) return sendError(reply, "BAD_REQUEST", "orgId and userId required");
      if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
        return sendError(reply, "BAD_REQUEST", "Twitter API credentials not configured");
      }

      // Request token step
      const callbackUrl = encodeURIComponent(
        `${getRedirectUri(req, "twitter")}?orgId=${orgId}&userId=${userId}`,
      );
      const resp = await fetch(
        `https://api.twitter.com/oauth/request_token?oauth_callback=${callbackUrl}`,
        {
          method: "POST",
          headers: buildOAuth1Header(
            "POST",
            "https://api.twitter.com/oauth/request_token",
            {},
            process.env.TWITTER_API_KEY!,
            process.env.TWITTER_API_SECRET!,
          ),
        },
      );
      const body = await resp.text();
      const params = Object.fromEntries(new URLSearchParams(body));
      if (params.oauth_callback_confirmed !== "true") {
        return sendError(reply, "BAD_GATEWAY", "Twitter request token failed");
      }
      reply.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${params.oauth_token}`);
    },
  );

  app.get<{
    Querystring: { oauth_token?: string; oauth_verifier?: string; orgId?: string; userId?: string };
  }>("/oauth/twitter/callback", async (req, reply) => {
    const { oauth_token, oauth_verifier, orgId, userId } = req.query;
    if (!oauth_token || !oauth_verifier || !orgId || !userId) {
      return sendError(reply, "BAD_REQUEST", "Missing OAuth params");
    }

    // Exchange for access token
    const resp = await fetch("https://api.twitter.com/oauth/access_token", {
      method: "POST",
      headers: buildOAuth1Header(
        "POST",
        "https://api.twitter.com/oauth/access_token",
        { oauth_token, oauth_verifier },
        process.env.TWITTER_API_KEY!,
        process.env.TWITTER_API_SECRET!,
      ),
    });
    const body = await resp.text();
    const p = Object.fromEntries(new URLSearchParams(body));

    if (!p.oauth_token || !p.oauth_token_secret) {
      return sendError(reply, "BAD_GATEWAY", "Twitter access token exchange failed");
    }

    // Store: accessToken = oauth_token, refreshToken = oauth_token_secret (Twitter 1.0a has no expiry)
    await fetch(`${process.env.CORE_API_URL || "http://core-app:3000/api"}/v1/platforms/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-org-id": orgId,
        "x-internal-service": process.env.INTERNAL_SERVICE_SECRET || "",
      },
      body: JSON.stringify({
        platform: "twitter",
        accountId: p.user_id,
        accountHandle: p.screen_name,
        accessToken: p.oauth_token,
        refreshToken: p.oauth_token_secret, // stored as refreshToken, used as access_secret
        scope: ["tweet.read", "tweet.write", "users.read"],
      }),
    });

    reply.redirect(`${DASHBOARD_URL}/settings/connections?connected=twitter`);
  });
}

// Minimal OAuth 1.0a header builder (no external dep required for these endpoints)
function buildOAuth1Header(
  method: string,
  url: string,
  extra: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  token?: string,
  tokenSecret?: string,
): Record<string, string> {
  const nonce = randomBytes(16).toString("hex");
  const ts = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: ts,
    oauth_version: "1.0",
    ...extra,
  };
  if (token) params.oauth_token = token;

  const base = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${encodeURIComponent(params[k])}`)
        .join("&"),
    ),
  ].join("&");
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || "")}`;
  params.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64");

  return {
    Authorization:
      "OAuth " +
      Object.keys(params)
        .sort()
        .map((k) => `${k}="${encodeURIComponent(params[k])}"`)
        .join(", "),
  };
}
