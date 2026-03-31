"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Scissors,
  Send,
  Eye,
  Radio,
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  Activity,
  ChevronRight,
  Play,
  DollarSign,
  Bot,
  MonitorPlay,
} from "lucide-react";
import { useApprovals, useActOnApproval, useAgentTasks } from "@/lib/hooks/use-agents";
import { useLiveStream } from "@/lib/hooks/use-stream";
import { useQueueItems } from "@/lib/hooks/use-queue";
import { useAnalyticsOverview, useClipPerformance } from "@/lib/hooks/use-analytics";
import { useRevenueOverview } from "@/lib/hooks/use-revenue";
import { StatCard } from "@/components/shared/stat-card";
import { ApprovalCard, type ApprovalRequest } from "@/components/shared/approval-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { cn } from "@/lib/utils";
import { Sensitive } from "@/lib/streamer-mode";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtViews(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtCompact(n: number | undefined | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const quickActions = [
  { label: "Go Live", icon: Radio, href: "/stream", primary: true },
  { label: "New Clip", icon: Scissors, href: "/clips/create", primary: false },
  { label: "Schedule Post", icon: Send, href: "/publish/compose", primary: false },
  { label: "Ask Wave", icon: Sparkles, href: "/agents/chat", primary: false },
];

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
      <div className="h-7 w-20 rounded bg-muted" />
      <div className="h-3 w-32 rounded bg-muted" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[200px] w-full rounded bg-muted/30 animate-pulse flex items-center justify-center">
      <span className="text-xs text-muted-foreground">Loading chart…</span>
    </div>
  );
}

function FeedItemSkeleton() {
  return (
    <div className="flex items-start gap-3 px-2 py-2.5">
      <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-3 w-12 rounded bg-muted animate-pulse shrink-0" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [chartMetric, setChartMetric] = useState<"views" | "engagement" | "followers">("views");

  // Real API data
  const { data: approvalsData, isLoading: approvalsLoading } = useApprovals();
  const actOnApproval = useActOnApproval();
  const { data: liveStream } = useLiveStream();
  const { data: queueData, isLoading: queueLoading } = useQueueItems({ limit: 20 });
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsOverview("7d");
  const { data: revenueData, isLoading: revenueLoading } = useRevenueOverview();
  const { data: tasksData, isLoading: tasksLoading } = useAgentTasks({ limit: 10 });
  const { data: clipPerfData, isLoading: clipPerfLoading } = useClipPerformance({ limit: 6 });

  const approvals: ApprovalRequest[] = (approvalsData?.data as ApprovalRequest[] | undefined) ?? [];

  const queueList = queueData?.data ?? [];
  const tasks = tasksData?.data ?? [];
  const recentClips = clipPerfData?.data ?? [];

  const todayPosts = queueList.filter((q) => {
    const d = new Date(q.scheduleAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  // Live stream
  const isLive = liveStream != null;
  const currentViewers = liveStream?.viewerCount ?? 0;
  const streamTitle = liveStream?.title ?? "Stream";

  // Chart data from analytics overview
  const chartData = analyticsData?.daily ?? [];
  const platforms = analyticsData?.platforms ?? [];
  const totalViews = platforms.reduce((sum, p) => sum + p.views, 0);
  const totalEngagements = platforms.reduce(
    (sum, p) => sum + Math.round(p.views * p.engagementRate),
    0,
  );
  const totalNewFollowers = platforms.reduce((sum, p) => sum + p.newFollowers, 0);

  const metricLabel = { views: "Views", engagement: "Engagements", followers: "New Followers" };
  const metricColor = { views: "hsl(var(--primary))", engagement: "#10b981", followers: "#3b82f6" };

  const isStatsLoading = analyticsLoading || revenueLoading || tasksLoading;

  function handleApprove(id: string) {
    actOnApproval.mutate({ id, action: "approve" });
  }

  function handleReject(id: string, feedback?: string) {
    actOnApproval.mutate({ id, action: "reject", feedback });
    if (feedback) toast.success("Feedback sent to agent");
  }

  return (
    <div className="space-y-6">
      {/* ── Live Banner (conditional) ─────────────────────────────── */}
      {isLive && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-bold text-red-400 tracking-wide">LIVE</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-border/50" />
            <span className="text-sm font-medium">{streamTitle}</span>
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
              {currentViewers.toLocaleString()} viewers
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
              <Scissors className="h-3.5 w-3.5" /> Clip 30s
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
              <Scissors className="h-3.5 w-3.5" /> Clip 60s
            </Button>
            <Link href="/stream">
              <Button size="sm" variant="destructive" className="h-7 text-xs">
                End Stream
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero row: greeting + quick actions ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting()}, Creator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening across your platforms today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}>
              <Button
                variant={a.primary ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5", a.primary && "shadow-sm shadow-primary/25")}
              >
                <a.icon className="h-3.5 w-3.5" />
                {a.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── At-a-Glance Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Today's Reach"
              value={fmtCompact(totalViews)}
              change={undefined}
              trend="neutral"
              icon={Eye}
              description="Combined impressions across all platforms"
            />
            <StatCard
              title="Content Output"
              value="—"
              change={queueList.length > 0 ? `${queueList.length} scheduled` : undefined}
              trend="neutral"
              icon={Scissors}
              description="Auto + manual clips created today"
            />
            <StatCard
              title="Revenue Today"
              value={revenueData?.today != null ? `$${revenueData.today.toLocaleString()}` : "—"}
              change="—"
              trend="neutral"
              icon={DollarSign}
              description="Subs · bits · donations · ads"
            />
            <StatCard
              title="Agent Activity"
              value={`${tasks.length} actions`}
              change={approvals.length > 0 ? `${approvals.length} need approval` : "All caught up"}
              trend={approvals.length > 0 ? "down" : "up"}
              icon={Bot}
              description={
                approvals.length > 0 ? "Tap to review approvals" : "Agents are running smoothly"
              }
            />
          </>
        )}
      </div>

      {/* ── Pending Approvals ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">
              {approvalsLoading
                ? "Approval Queue"
                : approvals.length > 0
                  ? `${approvals.length} item${approvals.length > 1 ? "s" : ""} need your approval`
                  : "Approval Queue"}
            </h2>
            {approvals.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 py-0 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20"
              >
                {approvals.filter((a) => a.urgency === "high").length} urgent
              </Badge>
            )}
          </div>
          <Link href="/agents">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              All tasks <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {approvalsLoading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3 animate-pulse">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-64 rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded bg-muted" />
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : approvals.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-muted/20 py-8 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Your agent has nothing waiting — all caught up</p>
            <p className="text-xs text-muted-foreground mt-0.5">New approvals will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {approvals.map((req) => (
              <ApprovalCard
                key={req.id}
                request={req}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Main grid: chart + today's schedule ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Performance This Week</CardTitle>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {(["views", "engagement", "followers"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                      chartMetric === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <ChartSkeleton />
            ) : chartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No performance data yet. Connect a platform to start tracking.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricColor[chartMetric]} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={metricColor[chartMetric]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [v.toLocaleString(), metricLabel[chartMetric]]}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke={metricColor[chartMetric]}
                    strokeWidth={2}
                    fill="url(#metricGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            <div className="mt-4 grid grid-cols-3 divide-x divide-border">
              {[
                {
                  label: "Total Views",
                  value: totalViews > 0 ? totalViews.toLocaleString() : "—",
                },
                {
                  label: "Engagements",
                  value: totalEngagements > 0 ? totalEngagements.toLocaleString() : "—",
                },
                {
                  label: "New Followers",
                  value: totalNewFollowers > 0 ? `+${totalNewFollowers.toLocaleString()}` : "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 first:pl-0 last:pr-0 text-center">
                  <p className="text-lg font-bold">
                    <Sensitive>{value}</Sensitive>
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today</CardTitle>
              <Link href="/publish/schedule">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  Full schedule <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stream status */}
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 mb-3",
                isLive ? "bg-red-500/10 border border-red-500/20" : "bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isLive ? "bg-red-500 text-white" : "bg-muted",
                )}
              >
                {isLive ? (
                  <Radio className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isLive ? (
                  <>
                    <p className="text-xs font-semibold text-red-500">LIVE NOW</p>
                    <p className="text-xs text-muted-foreground truncate">{streamTitle}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium">No active stream</p>
                    <p className="text-xs text-muted-foreground">Start streaming to go live</p>
                  </>
                )}
              </div>
              <Link href="/stream">
                <Button
                  size="sm"
                  variant={isLive ? "destructive" : "outline"}
                  className="h-7 text-xs shrink-0"
                >
                  {isLive ? "End" : "Setup"}
                </Button>
              </Link>
            </div>

            {queueLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-2.5 animate-pulse space-y-1.5">
                    <div className="h-3 w-16 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : todayPosts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nothing scheduled for today.</p>
                <Link href="/publish/compose">
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Add post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border p-2.5"
                  >
                    <div className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">
                      {fmtTime(post.scheduleAt)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.title}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {post.platforms.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className={cn("text-[9px] h-4 py-0 px-1 gap-1", platformBadge[p])}
                          >
                            <PlatformIcon platform={p} size={10} branded />
                            {platformLabel[p] ?? p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/publish/schedule">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    View all {queueData?.meta.total ?? queueList.length} scheduled posts{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom grid: agent feed + clip performance ──────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Agent Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agent Activity</CardTitle>
              <Link href="/agents">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  Manage <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <FeedItemSkeleton key={i} />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent agent activity</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable agents to start automating tasks
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <Activity
                      className={cn(
                        "h-3.5 w-3.5 mt-0.5 shrink-0",
                        task.status === "completed"
                          ? "text-emerald-400"
                          : task.status === "running"
                            ? "text-cyan-400"
                            : task.status === "awaiting_approval"
                              ? "text-amber-400"
                              : "text-muted-foreground",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 capitalize">
                          {task.agentType}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {fmtRelative(task.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clip Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Clip Performance</CardTitle>
              <Link href="/clips">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  Library <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {clipPerfLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                    <div className="h-9 w-14 shrink-0 rounded bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-muted" />
                      <div className="h-2.5 w-20 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-12 rounded bg-muted shrink-0" />
                  </div>
                ))}
              </div>
            ) : recentClips.length === 0 ? (
              <div className="text-center py-8">
                <MonitorPlay className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No clips yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create clips from your streams to track performance
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="h-9 w-14 shrink-0 rounded bg-muted/60 flex items-center justify-center overflow-hidden">
                      <MonitorPlay className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{clip.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {clip.platforms?.slice(0, 2).map((p: string) => (
                          <PlatformIcon key={p} platform={p} size={10} branded />
                        ))}
                        {(clip.platforms?.length ?? 0) > 2 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{(clip.platforms?.length ?? 0) - 2}
                          </span>
                        )}
                        {clip.publishedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {fmtRelative(clip.publishedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">
                        <Sensitive>{fmtViews(clip.views ?? 0)}</Sensitive>
                      </p>
                      {clip.hypeScore != null && (
                        <div className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                          {clip.hypeScore}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Platform Reach strip ─────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Platform Reach</p>
            <Link href="/analytics">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground gap-1 hover:text-foreground"
              >
                Analytics <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {analyticsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-12 rounded bg-muted" />
                    <div className="h-2.5 w-20 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : platforms.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {platforms.slice(0, 4).map((p) => (
                <div key={p.platform} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      platformBadge[p.platform],
                    )}
                  >
                    <PlatformIcon platform={p.platform} size={16} branded />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      <Sensitive>{fmtCompact(p.newFollowers)}</Sensitive>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <Sensitive>{fmtCompact(p.views)} views</Sensitive>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Connect your platforms to see reach metrics
              </p>
              <Link href="/settings/integrations">
                <Button variant="outline" size="sm" className="mt-2 text-xs">
                  Connect Platforms
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
