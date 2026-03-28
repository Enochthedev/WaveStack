// Core entity types

export type OrgRole = "owner" | "admin" | "editor" | "viewer";
export type OrgPlan = "free" | "pro" | "enterprise";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  billingCustomerId: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
  user?: Pick<User, "id" | "email" | "name" | "avatarUrl">;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}
