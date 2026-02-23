"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  Scissors, Send, Eye, TrendingUp, Radio, Plus, Sparkles,
  ArrowRight, Clock, Zap, AlertTriangle, CheckCircle2,
  BarChart3, Users, Activity, ChevronRight, Play,
} from "lucide-react";
import {
  dashboardStats, recentActivity, queueItems,
  agents, weeklyPerformance, pendingApprovals, streamStatus,
} from "@/lib/mock-data";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { cn } from "@/lib/utils";
import { Sensitive } from "@/lib/streamer-mode";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const urgencyIcon: Record<string, React.ReactNode> = {
  high:   <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  medium: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  low:    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />,
};

const activityIcon: Record<string, { icon: React.ElementType; color: string }> = {
  ready:      { icon: CheckCircle2, color: "text-emerald-500" },
  published:  { icon: Send,         color: "text-sky-500"     },
  completed:  { icon: Sparkles,     color: "text-primary"     },
  pending:    { icon: Clock,        color: "text-amber-500"   },
  processing: { icon: Activity,     color: "text-blue-500"    },
};

// ─── Quick actions ────────────────────────────────────────────────────────────

const quickActions = [
  { label: "Go Live",       icon: Radio,    href: "/stream",          variant: "default"  as const, primary: true  },
  { label: "New Clip",      icon: Scissors, href: "/clips/create",    variant: "outline"  as const, primary: false },
  { label: "Schedule Post", icon: Send,     href: "/publish/compose", variant: "outline"  as const, primary: false },
  { label: "Ask Wave",      icon: Sparkles, href: "/agents/chat",     variant: "outline"  as const, primary: false },
];

// ─── Stat config ──────────────────────────────────────────────────────────────

const statCardConfig = [
  { title: "Clips Today",     value: "12",    change: "+3",    trend: "up"      as const, icon: Scissors  },
  { title: "Scheduled Posts", value: "8",     change: "2 today", trend: "neutral" as const, icon: Send    },
  { title: "Active Viewers",  value: "1,247", change: "+18%",  trend: "up"      as const, icon: Eye      },
  { title: "Engagement Rate", value: "4.7%",  change: "+0.3%", trend: "up"      as const, icon: TrendingUp },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [chartMetric, setChartMetric] = useState<"views" | "engagement" | "followers">("views");
  const [dismissedApprovals, setDismissedApprovals] = useState<string[]>([]);

  const runningAgents = agents.filter((a) => a.isEnabled && a.tasksRunning > 0);
  const visibleApprovals = pendingApprovals.filter((p) => !dismissedApprovals.includes(p.id));
  const todayPosts = queueItems.filter((q) => {
    const d = new Date(q.scheduleAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  const metricLabel = { views: "Views", engagement: "Engagements", followers: "New Followers" };
  const metricColor = { views: "hsl(var(--primary))", engagement: "#10b981", followers: "#3b82f6" };

  function handleGoLive() {
    toast.info("Stream setup", { description: "Opening stream configuration…" });
  }

  function dismissApproval(id: string) {
    setDismissedApprovals((p) => [...p, id]);
    toast.success("Dismissed");
  }

  return (
    <div className="space-y-6">

      {/* ── Hero row: greeting + quick actions ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, Creator 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening across your platforms today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}>
              <Button
                variant={a.variant}
                size="sm"
                className={cn("gap-1.5", a.primary && "shadow-sm shadow-primary/25")}
                onClick={a.label === "Go Live" ? handleGoLive : undefined}
              >
                <a.icon className="h-3.5 w-3.5" />
                {a.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCardConfig.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* ── Pending approvals banner ─────────────────────────────── */}
      {visibleApprovals.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">
              {visibleApprovals.length} item{visibleApprovals.length > 1 ? "s" : ""} need{visibleApprovals.length === 1 ? "s" : ""} your attention
            </p>
          </div>
          <div className="space-y-2">
            {visibleApprovals.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg bg-background/60 px-3 py-2">
                {urgencyIcon[item.urgency]}
                <p className="text-sm flex-1">{item.title}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={item.href}>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-primary">
                      Review
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-muted-foreground"
                    onClick={() => dismissApproval(item.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyPerformance} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={metricColor[chartMetric]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={metricColor[chartMetric]} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
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

            {/* Summary row below chart */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Total Views",    value: weeklyPerformance.reduce((s, d) => s + d.views, 0).toLocaleString() },
                { label: "Engagements",    value: weeklyPerformance.reduce((s, d) => s + d.engagement, 0).toLocaleString() },
                { label: "New Followers",  value: "+" + weeklyPerformance.reduce((s, d) => s + d.followers, 0) },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 first:pl-0 last:pr-0 text-center">
                  <p className="text-lg font-bold"><Sensitive>{value}</Sensitive></p>
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
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Full schedule <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stream status */}
            <div className={cn(
              "flex items-center gap-3 rounded-lg p-3 mb-3",
              streamStatus.isLive ? "bg-red-500/10 border border-red-500/20" : "bg-muted/50"
            )}>
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                streamStatus.isLive ? "bg-red-500 text-white" : "bg-muted"
              )}>
                {streamStatus.isLive ? <Radio className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                {streamStatus.isLive ? (
                  <>
                    <p className="text-xs font-semibold text-red-500">LIVE NOW</p>
                    <p className="text-xs text-muted-foreground truncate">{streamStatus.nextStreamTitle}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium">Next stream</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(streamStatus.nextStreamAt)} · {fmtTime(streamStatus.nextStreamAt)}</p>
                  </>
                )}
              </div>
              <Link href="/stream">
                <Button size="sm" variant={streamStatus.isLive ? "destructive" : "outline"} className="h-7 text-xs shrink-0">
                  {streamStatus.isLive ? "End" : "Setup"}
                </Button>
              </Link>
            </div>

            {/* Scheduled posts today */}
            {todayPosts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nothing scheduled for today.</p>
                <Link href="/publish/compose">
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayPosts.map((post) => (
                  <div key={post.id} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                    <div className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">
                      {fmtTime(post.scheduleAt)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.title}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {post.platforms.map((p) => (
                          <Badge key={p} variant="outline" className={cn("text-[9px] h-4 py-0 px-1 gap-1", platformBadge[p])}>
                            <PlatformIcon platform={p} size={10} branded />
                            {platformLabel[p] ?? p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/publish/schedule">
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
                    View all {queueItems.length} scheduled posts <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom grid: agents + activity ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Active agents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Agents Running</CardTitle>
              <Link href="/agents">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Manage <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {runningAgents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No agents currently running.</p>
                <Link href="/agents">
                  <Button variant="outline" size="sm" className="mt-2">Start an agent</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {runningAgents.map((agent) => (
                  <div key={agent.agentType} className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.tasksRunning} task{agent.tasksRunning > 1 ? "s" : ""} running · {agent.tasksCompleted} completed</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 py-0 shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-4" />

            {/* Overall agent stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Enabled",    value: agents.filter((a) => a.isEnabled).length },
                { label: "Tasks Today", value: agents.reduce((s, a) => s + a.tasksRunning, 0) },
                { label: "Completed",  value: agents.reduce((s, a) => s + a.tasksCompleted, 0) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <p className="text-base font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  All <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((item) => {
                const meta = activityIcon[item.status] ?? activityIcon.pending;
                const Icon = meta.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40 transition-colors group cursor-default"
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className={cn("h-4 w-4", meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{item.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Platform summary strip ───────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Platform Reach</p>
            <Link href="/community">
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground gap-1 hover:text-foreground">
                Community <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { platform: "youtube",   followers: 45200, change: "+1.1K this week" },
              { platform: "tiktok",    followers: 4200,  change: "+120 this week"  },
              { platform: "instagram", followers: 4200,  change: "+85 this week"   },
              { platform: "twitch",    followers: 312,   change: "+12 this week"   },
            ].map((p) => (
              <div key={p.platform} className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", platformBadge[p.platform])}>
                  <PlatformIcon platform={p.platform} size={16} branded />
                </div>
                <div>
                  <p className="text-sm font-semibold"><Sensitive>{p.followers.toLocaleString()}</Sensitive></p>
                  <p className="text-[10px] text-muted-foreground"><Sensitive>{p.change}</Sensitive></p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
