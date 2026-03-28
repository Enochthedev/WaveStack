// Platform connection types

export const SUPPORTED_PLATFORMS = [
  "twitch",
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "discord",
  "facebook",
  "linkedin",
  "kick",
  "spotify",
  "patreon",
  "streamlabs",
  "streamelements",
] as const;

export type Platform = typeof SUPPORTED_PLATFORMS[number];

export type PlatformStatus = "active" | "expired" | "revoked" | "disconnected";

export interface PlatformCredential {
  id: string;
  orgId: string;
  platform: Platform;
  accountId: string;
  accountHandle: string | null;
  accountAvatarUrl: string | null;
  scope: string[];
  status: PlatformStatus;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformStatusResponse {
  connected: boolean;
  status: PlatformStatus | "disconnected";
  accountHandle?: string | null;
  tokenExpiresAt?: string | null;
}

export interface PlatformSnapshot {
  id: string;
  orgId: string;
  platform: Platform;
  accountId: string;
  followers: number;
  views: number;
  engagementRate: number;
  revenueCents: number;
  snapshottedAt: string;
}
