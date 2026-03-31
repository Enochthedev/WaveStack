"use client";

import { toast } from "sonner";
import { useCommunityMembers } from "@/lib/hooks/use-community";
import { useAnalyticsOverview } from "@/lib/hooks/use-analytics";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Heart, Trophy, Clock, Gift, Download } from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformLabel } from "@/lib/colors";

// ── Tier styles ───────────────────────────────────────────────────────────────

const tierStyles: Record<string, string> = {
  gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  silver: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  bronze: "bg-amber-600/20 text-amber-500 border-amber-600/30",
};

const rankStyles: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-400",
  2: "bg-gray-400/20 text-gray-400",
  3: "bg-amber-600/20 text-amber-500",
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-x-4 px-6 py-3">
      <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex flex-1 items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-16 rounded bg-muted animate-pulse" />
      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useCommunityMembers({ limit: 20 });

  const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsOverview("30d");

  const members = membersData?.data ?? [];
  const platforms = analyticsData?.platforms ?? [];
  const totalFollowers = platforms.reduce((s, p) => s + (p.newFollowers ?? 0), 0);
  const avgEngagement = platforms.length
    ? platforms.reduce((s, p) => s + (p.engagementRate ?? 0), 0) / platforms.length
    : null;

  function handleExport() {
    toast.success("Community data exported as CSV");
  }

  function handleMessage(username: string) {
    toast.info(`Opening DM to ${username}…`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Community" description="Your fans and follower growth">
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-2 animate-pulse">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-7 w-16 rounded bg-muted" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="New Followers (30d)"
              value={
                totalFollowers > 0
                  ? totalFollowers >= 1000
                    ? `+${(totalFollowers / 1000).toFixed(1)}K`
                    : `+${totalFollowers}`
                  : "—"
              }
              trend="up"
              icon={Users}
            />
            <StatCard
              title="Avg Engagement"
              value={avgEngagement != null ? `${avgEngagement.toFixed(1)}%` : "—"}
              icon={Heart}
            />
            <StatCard
              title="Platforms"
              value={platforms.length > 0 ? String(platforms.length) : "—"}
              icon={Trophy}
            />
            <StatCard
              title="Members"
              value={
                membersData?.meta.total != null ? membersData.meta.total.toLocaleString() : "—"
              }
              icon={MessageSquare}
            />
          </>
        )}
      </div>

      {/* Top supporters */}
      <Card>
        <CardHeader>
          <CardTitle>Top Supporters</CardTitle>
          <CardDescription>Your most engaged community members</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {membersError ? (
            <EmptyState preset="offline" subtitle="Could not load community data." size="sm" />
          ) : membersLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <MemberRowSkeleton key={i} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              preset="no-community"
              size="lg"
              subtitle="Stream and engage with viewers to start building your fanbase."
            />
          ) : (
            <div className="divide-y divide-border">
              {members.map((m, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 text-sm"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        rankStyles[rank] ?? "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {rank}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {m.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">{m.username}</span>
                      {m.platforms.length > 0 && (
                        <Badge variant="outline" className="shrink-0 text-xs gap-1">
                          <PlatformIcon platform={m.platforms[0]} size={11} branded />
                          {platformLabel[m.platforms[0]] ?? m.platforms[0]}
                        </Badge>
                      )}
                    </div>
                    {m.watchTimeHours != null && (
                      <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {m.watchTimeHours}h
                      </span>
                    )}
                    {m.chatMessages != null && (
                      <span className="shrink-0 text-muted-foreground">
                        {m.chatMessages.toLocaleString()} msgs
                      </span>
                    )}
                    {m.subsGifted != null && m.subsGifted > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                        <Gift className="h-3.5 w-3.5" />
                        {m.subsGifted}
                      </span>
                    )}
                    {m.loyaltyTier && (
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs capitalize ${tierStyles[m.loyaltyTier] ?? ""}`}
                      >
                        {m.loyaltyTier}
                      </Badge>
                    )}
                    {m.joinedAt && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Since {new Date(m.joinedAt).getFullYear()}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
                      onClick={() => handleMessage(m.username)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
