"use client";

import { createContext, useContext, useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "owner" | "admin" | "editor" | "moderator" | "analyst";

export const ROLES: Role[] = ["owner", "admin", "editor", "moderator", "analyst"];

export const ROLE_META: Record<Role, { label: string; description: string; color: string }> = {
  owner:     { label: "Owner",     description: "Full unrestricted access + billing",           color: "bg-amber-500/15 text-amber-600 border-amber-500/30"  },
  admin:     { label: "Admin",     description: "Full access except account deletion",           color: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  editor:    { label: "Editor",    description: "Create, edit, schedule content",                color: "bg-sky-500/15 text-sky-600 border-sky-500/30"         },
  moderator: { label: "Moderator", description: "Review flags, apply moderation rules",          color: "bg-amber-500/15 text-amber-700 border-amber-500/30"   },
  analyst:   { label: "Analyst",   description: "View analytics and reports, read-only",        color: "bg-teal-500/15 text-teal-600 border-teal-500/30"      },
};

// ─── Route access map ─────────────────────────────────────────────────────────
// Maps each base route to the roles that may access it.
// The canAccess() helper matches on the longest prefix, so sub-routes inherit
// their parent's permissions automatically.

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard":         ["owner", "admin", "editor", "moderator", "analyst"],
  "/analytics":         ["owner", "admin", "analyst"],
  "/stream":            ["owner", "admin", "editor"],
  "/clips":             ["owner", "admin", "editor"],
  "/content":           ["owner", "admin", "editor"],
  "/uploads":           ["owner", "admin", "editor"],
  "/publish":           ["owner", "admin", "editor"],
  "/community":         ["owner", "admin", "editor", "analyst"],
  "/seo":               ["owner", "admin", "analyst"],
  "/monetization":      ["owner", "admin", "analyst"],
  "/competitors":       ["owner", "admin", "analyst"],
  "/moderation":        ["owner", "admin", "moderator"],
  "/agents":            ["owner", "admin"],
  "/workflows":         ["owner", "admin", "editor"],
  "/skills":            ["owner", "admin", "editor"],
  "/knowledge":         ["owner", "admin", "editor"],
  "/mcp":               ["owner", "admin"],
  "/sandbox":           ["owner", "admin", "editor"],
  "/bots":              ["owner", "admin"],
  "/team":              ["owner", "admin"],
  "/settings":          ["owner", "admin"],
  "/notifications":     ["owner", "admin", "editor", "moderator", "analyst"],
  "/profile":           ["owner", "admin", "editor", "moderator", "analyst"],
};

/** Returns true if `role` is allowed to visit `pathname`. */
export function canAccess(role: Role, pathname: string): boolean {
  const match = Object.keys(ROUTE_ACCESS)
    .filter((r) => pathname === r || pathname.startsWith(r + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true; // unknown / unlisted routes: allow through
  return ROUTE_ACCESS[match].includes(role);
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
  can: (pathname: string) => boolean;
}

const RoleContext = createContext<RoleCtx>({
  role:    "owner",
  setRole: () => {},
  can:     () => true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("owner");

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    const saved = localStorage.getItem("ws_demo_role") as Role | null;
    if (saved && ROLES.includes(saved)) setRoleState(saved);
  }, []);

  function setRole(r: Role) {
    setRoleState(r);
    localStorage.setItem("ws_demo_role", r);
  }

  return (
    <RoleContext.Provider value={{ role, setRole, can: (p) => canAccess(role, p) }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
