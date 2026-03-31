"use client";

import { useState } from "react";
import {
  useTeamMembers,
  useTeamInvites,
  useInviteTeamMember,
  useRevokeInvite,
  useUpdateTeamRole,
  useRemoveTeamMember,
} from "@/lib/hooks/use-team";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CheckCircle2,
  Clock,
  Trash2,
  Shield,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
  Loader2,
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
import { cn } from "@/lib/utils";

// ─── Types & constants ───────────────────────────────────────────────────────

const ROLES = ["admin", "editor", "moderator", "analyst"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<Role, { label: string; color: string; description: string }> = {
  admin: {
    label: "Admin",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    description: "Full access: publish, manage team, billing. Cannot delete account.",
  },
  editor: {
    label: "Editor",
    color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    description: "Create, edit, and schedule content. Cannot manage team or billing.",
  },
  moderator: {
    label: "Moderator",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    description: "Review flagged content, apply moderation rules. Read-only analytics.",
  },
  analyst: {
    label: "Analyst",
    color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    description: "View analytics and reports. No publishing or moderation access.",
  },
};

const PERMISSIONS = [
  {
    action: "View Dashboard & Analytics",
    admin: true,
    editor: false,
    moderator: false,
    analyst: true,
  },
  { action: "Create / Edit Content", admin: true, editor: true, moderator: false, analyst: false },
  {
    action: "Publish & Schedule Posts",
    admin: true,
    editor: true,
    moderator: false,
    analyst: false,
  },
  { action: "Manage Clips", admin: true, editor: true, moderator: false, analyst: false },
  {
    action: "Review Moderation Flags",
    admin: true,
    editor: false,
    moderator: true,
    analyst: false,
  },
  { action: "Apply Moderation Rules", admin: true, editor: false, moderator: true, analyst: false },
  { action: "Configure Agents", admin: true, editor: false, moderator: false, analyst: false },
  { action: "Run Workflows", admin: true, editor: true, moderator: false, analyst: false },
  { action: "View Billing", admin: true, editor: false, moderator: false, analyst: false },
  { action: "Manage Team", admin: true, editor: false, moderator: false, analyst: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  return yes ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
  ) : (
    <span className="block w-4 h-px bg-border mx-auto" />
  );
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function MemberSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-48 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-7 w-24 rounded bg-muted animate-pulse shrink-0" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: membersData, isLoading: membersLoading, isError: membersError } = useTeamMembers();
  const { data: invitesData, isLoading: invitesLoading } = useTeamInvites();
  const inviteMember = useInviteTeamMember();
  const revokeInvite = useRevokeInvite();
  const updateRole = useUpdateTeamRole();
  const removeMember = useRemoveTeamMember();

  const members = membersData ?? [];
  const invites = invitesData ?? [];

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [grants, setGrants] = useState<Record<string, Record<string, boolean>>>({});
  const [permTarget, setPermTarget] = useState<{ id: string; name: string; role: string } | null>(
    null,
  );

  const active = members;

  function openPerms(member: { id: string; name: string; role: string }) {
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
      [memberId]: { ...prev[memberId], [route]: !prev[memberId]?.[route] },
    }));
  }

  function savePerms() {
    setPermTarget(null);
  }

  function sendInvite() {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail("");
          setDialogOpen(false);
        },
      },
    );
  }

  function handleRemove(id: string) {
    removeMember.mutate(id);
  }

  function changeRole(id: string, role: Role) {
    updateRole.mutate({ memberId: id, role });
  }

  function handleRevoke(inviteId: string) {
    revokeInvite.mutate(inviteId);
  }

  function copyInviteLink() {
    navigator.clipboard.writeText("https://app.wavestack.io/join/abc123xyz").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (membersError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Team" description="Manage who has access to your WaveStack workspace" />
        <EmptyState preset="offline" subtitle="Could not load team data." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Team" description="Manage who has access to your WaveStack workspace" />

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {membersLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4 space-y-2 animate-pulse">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-7 w-10 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {[
              { label: "Team Members", value: active.length, sub: "active" },
              { label: "Pending", value: invites.length, sub: "invitations" },
              { label: "Total", value: active.length + invites.length, sub: "members + invites" },
            ].map(({ label, value, sub }) => (
              <Card key={label}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}
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
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
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
                                <p className="text-xs text-muted-foreground">
                                  {ROLE_META[r].description}
                                </p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={sendInvite}
                      disabled={!inviteEmail.trim() || inviteMember.isPending}
                    >
                      {inviteMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Send invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {membersLoading ? (
            Array.from({ length: 3 }).map((_, i) => <MemberSkeleton key={i} />)
          ) : active.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No team members yet. Invite someone to get started.
            </div>
          ) : (
            active.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {(m.name ?? m.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name ?? m.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.lastSeenAt && (
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      Active {relTime(m.lastSeenAt)}
                    </p>
                  )}
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
                    onClick={() => handleRemove(m.id)}
                    disabled={removeMember.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Pending invites ────────────────────────────────────── */}
      {(invitesLoading || invites.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {invitesLoading
              ? Array.from({ length: 2 }).map((_, i) => <MemberSkeleton key={i} />)
              : invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
                      ?
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {relDate(inv.createdAt)} · <RoleBadge role={inv.role} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokeInvite.isPending}
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
            {showMatrix ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
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
                      <td className="py-2.5 px-4">
                        <PermCheck yes={p.admin} />
                      </td>
                      <td className="py-2.5 px-4">
                        <PermCheck yes={p.editor} />
                      </td>
                      <td className="py-2.5 px-4">
                        <PermCheck yes={p.moderator} />
                      </td>
                      <td className="py-2.5 px-4">
                        <PermCheck yes={p.analyst} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground flex gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                The <strong>Owner</strong> account has unrestricted access to all features,
                including billing and account deletion. Roles can be changed at any time.
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
            <span className="ml-1">
              — toggles below override the role&apos;s defaults for this person only.
            </span>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {Object.keys(ROUTE_ACCESS).map((route) => {
              const memberId = permTarget?.id ?? "";
              const roleDefault = permTarget ? canAccess(permTarget.role as Role, route) : false;
              const current = grants[memberId]?.[route] ?? roleDefault;
              const isOverride = current !== roleDefault;
              return (
                <div
                  key={route}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs text-muted-foreground font-mono truncate">
                      {route}
                    </code>
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
            <Button variant="outline" onClick={() => setPermTarget(null)}>
              Cancel
            </Button>
            <Button onClick={savePerms}>Save permissions</Button>
          </PermDialogFooter>
        </PermDialogContent>
      </PermDialog>
    </div>
  );
}
