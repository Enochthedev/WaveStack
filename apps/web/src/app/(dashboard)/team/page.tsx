"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Link2,
  Copy,
  CheckCircle2,
  Clock,
  Trash2,
  Shield,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog as PermDialog,
  DialogContent as PermDialogContent,
  DialogHeader as PermDialogHeader,
  DialogTitle as PermDialogTitle,
  DialogFooter as PermDialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ROUTE_ACCESS, canAccess } from "@/lib/role";
import { teamMembers, teamAuditLog } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Types & constants ───────────────────────────────────────────────────────

type Member = (typeof teamMembers)[0];

const ROLES = ["admin", "editor", "moderator", "analyst"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<Role, { label: string; color: string; description: string }> = {
  admin:     { label: "Admin",     color: "bg-violet-500/10 text-violet-600 border-violet-500/20",  description: "Full access: publish, manage team, billing. Cannot delete account." },
  editor:    { label: "Editor",    color: "bg-sky-500/10 text-sky-600 border-sky-500/20",           description: "Create, edit, and schedule content. Cannot manage team or billing." },
  moderator: { label: "Moderator", color: "bg-amber-500/10 text-amber-600 border-amber-500/20",    description: "Review flagged content, apply moderation rules. Read-only analytics." },
  analyst:   { label: "Analyst",   color: "bg-teal-500/10 text-teal-600 border-teal-500/20",       description: "View analytics and reports. No publishing or moderation access." },
};

// Permissions matrix for the reference table
const PERMISSIONS = [
  { action: "View Dashboard & Analytics", admin: true,  editor: false, moderator: false, analyst: true  },
  { action: "Create / Edit Content",      admin: true,  editor: true,  moderator: false, analyst: false },
  { action: "Publish & Schedule Posts",   admin: true,  editor: true,  moderator: false, analyst: false },
  { action: "Manage Clips",               admin: true,  editor: true,  moderator: false, analyst: false },
  { action: "Review Moderation Flags",    admin: true,  editor: false, moderator: true,  analyst: false },
  { action: "Apply Moderation Rules",     admin: true,  editor: false, moderator: true,  analyst: false },
  { action: "Configure Agents",           admin: true,  editor: false, moderator: false, analyst: false },
  { action: "Run Workflows",              admin: true,  editor: true,  moderator: false, analyst: false },
  { action: "View Billing",               admin: true,  editor: false, moderator: false, analyst: false },
  { action: "Manage Team",                admin: true,  editor: false, moderator: false, analyst: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string | null) {
  if (!iso) return "Never";
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role as Role];
  if (!meta) return <Badge variant="outline">{role}</Badge>;
  return (
    <Badge variant="outline" className={cn("text-xs", meta.color)}>
      {meta.label}
    </Badge>
  );
}

function PermCheck({ yes }: { yes: boolean }) {
  return yes
    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
    : <span className="block w-4 h-px bg-border mx-auto" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [members,  setMembers]  = useState<Member[]>(teamMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState<Role>("editor");
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [showMatrix,  setShowMatrix]  = useState(false);

  // Per-user route overrides: memberId → { route: boolean }
  // true = explicitly granted (even if role wouldn't allow)
  // false = explicitly denied (even if role would allow)
  const [grants, setGrants] = useState<Record<string, Record<string, boolean>>>({});
  const [permTarget, setPermTarget] = useState<Member | null>(null);

  function openPerms(member: Member) {
    // Seed dialog with current effective access (role defaults + any existing grants)
    const existing = grants[member.id] ?? {};
    const role = member.role as Role;
    const seeded: Record<string, boolean> = {};
    for (const route of Object.keys(ROUTE_ACCESS)) {
      seeded[route] = route in existing ? existing[route] : canAccess(role, route);
    }
    setGrants((prev) => ({ ...prev, [member.id]: seeded }));
    setPermTarget(member);
  }

  function toggleGrant(memberId: string, route: string) {
    setGrants((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [route]: !prev[memberId]?.[route],
      },
    }));
  }

  function savePerms() {
    setPermTarget(null);
  }

  const active  = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");

  function sendInvite() {
    if (!inviteEmail.trim()) return;
    const newMember: Member = {
      id:         String(Date.now()),
      name:       inviteEmail.split("@")[0],
      email:      inviteEmail,
      role:       inviteRole,
      avatar:     inviteEmail.slice(0, 2).toUpperCase(),
      status:     "pending",
      joinedAt:   new Date().toISOString(),
      lastActive: null,
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteEmail("");
    setDialogOpen(false);
  }

  function remove(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function changeRole(id: string, role: Role) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  }

  function copyInviteLink() {
    navigator.clipboard.writeText("https://app.wavestack.io/join/abc123xyz").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Manage who has access to your WaveStack workspace"
      />

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Team Members",  value: active.length,  sub: "active" },
          { label: "Pending",       value: pending.length, sub: "invitations" },
          { label: "Seats Used",    value: `${members.length} / 5`, sub: "Pro plan" },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Members list + invite ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>People who have access to your workspace.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy invite link"}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Invite member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite a team member</DialogTitle>
                    <DialogDescription>
                      They&apos;ll receive an email to join your WaveStack workspace.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email address</label>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              <div>
                                <p className="font-medium capitalize">{r}</p>
                                <p className="text-xs text-muted-foreground">{ROLE_META[r].description}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={sendInvite} disabled={!inviteEmail.trim()}>Send invite</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {/* Creator (owner) row — always first */}
          <div className="flex items-center gap-3 py-3 first:pt-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              WS
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">WaveStack Creator</p>
                <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Owner
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">creator@wavestack.io</p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">You</p>
          </div>

          {active.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Active {relTime(m.lastActive)}
                </p>
                <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                  <SelectTrigger className="h-7 text-xs w-32 gap-1">
                    <SelectValue>
                      <RoleBadge role={m.role} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        <span className="capitalize">{r}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Manage permissions"
                  onClick={() => openPerms(m)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(m.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Pending invites ────────────────────────────────────── */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
                  ?
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited {relDate(m.joinedAt)} · <RoleBadge role={m.role} />
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-xs">Resend</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Role permissions matrix ────────────────────────────── */}
      <Card>
        <CardHeader>
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setShowMatrix((v) => !v)}
          >
            <div className="flex items-center gap-2 text-left">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Role Permissions</CardTitle>
                <CardDescription className="text-xs">
                  What each role can and cannot do
                </CardDescription>
              </div>
            </div>
            {showMatrix ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showMatrix && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium pr-6 w-64">Permission</th>
                    {ROLES.map((r) => (
                      <th key={r} className="pb-2 text-center font-medium px-4">
                        <Badge variant="outline" className={cn("text-xs", ROLE_META[r].color)}>
                          {ROLE_META[r].label}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PERMISSIONS.map((p) => (
                    <tr key={p.action} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-6 text-sm">{p.action}</td>
                      <td className="py-2.5 px-4"><PermCheck yes={p.admin}     /></td>
                      <td className="py-2.5 px-4"><PermCheck yes={p.editor}    /></td>
                      <td className="py-2.5 px-4"><PermCheck yes={p.moderator} /></td>
                      <td className="py-2.5 px-4"><PermCheck yes={p.analyst}   /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground flex gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                The <strong>Owner</strong> account has unrestricted access to all features, including billing and account deletion. Roles can be changed at any time.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Per-user permission overrides dialog ──────────────── */}
      <PermDialog open={!!permTarget} onOpenChange={(o) => !o && setPermTarget(null)}>
        <PermDialogContent className="max-w-lg">
          <PermDialogHeader>
            <PermDialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              Permissions — {permTarget?.name}
            </PermDialogTitle>
          </PermDialogHeader>

          <div className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 mb-1">
            Base role: <RoleBadge role={permTarget?.role ?? "editor"} />
            <span className="ml-1">— toggles below override the role&apos;s defaults for this person only.</span>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {Object.keys(ROUTE_ACCESS).map((route) => {
              const memberId  = permTarget?.id ?? "";
              const roleDefault = permTarget
                ? canAccess(permTarget.role as Role, route)
                : false;
              const current   = grants[memberId]?.[route] ?? roleDefault;
              const isOverride = current !== roleDefault;

              return (
                <div
                  key={route}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs text-muted-foreground font-mono truncate">{route}</code>
                    {isOverride && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-primary/10 text-primary font-medium shrink-0">
                        overridden
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={current}
                    onCheckedChange={() => toggleGrant(memberId, route)}
                    className="scale-90 shrink-0"
                  />
                </div>
              );
            })}
          </div>

          <PermDialogFooter>
            <Button variant="outline" onClick={() => setPermTarget(null)}>Cancel</Button>
            <Button onClick={savePerms}>Save permissions</Button>
          </PermDialogFooter>
        </PermDialogContent>
      </PermDialog>

      {/* ── Activity log ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Actions taken by your team members.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {teamAuditLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold mt-0.5">
                {entry.actor.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{entry.actor}</span>
                  {" "}
                  <span className="text-muted-foreground">{entry.action}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">{entry.resource}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">{relTime(entry.at)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
