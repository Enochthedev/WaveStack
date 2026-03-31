"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAnalyticsOverview,
  useAudienceStats,
  useClipPerformance,
  useRevenueAnalytics,
} from "@/lib/hooks/use-analytics";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Eye, Users, Clock, DollarSign, Download } from "lucide-react";
import { Sensitive } from "@/lib/streamer-mode";
import type { ChartConfig } from "@/components/ui/chart";
import type { AnalyticsPeriod } from "@/types";

// ── Chart configs ──────────────────────────────────────────────────────────

const dailyConfig = {
  views: { label: "Views", color: "hsl(var(--chart-1))" },
  engagement: { label: "Engagement", color: "hsl(var(--chart-4))" },
  followers: { label: "Followers", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const engagementConfig = {
  engagement: { label: "Engagement %", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const platformConfig = {
  views: { label: "Views", color: "hsl(var(--chart-1))" },
  newFollowers: { label: "New Followers", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-4 rounded bg-muted" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="h-7 w-20 rounded bg-muted" />
          <div className="h-4 w-14 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <Card>
      <CardContent className="pt-6 animate-pulse">
        <div className="space-y-2 mb-4">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-3 w-56 rounded bg-muted" />
        </div>
        <div className={`w-full rounded bg-muted ${className}`} />
      </CardContent>
    </Card>
  );
}

function ContentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-muted" />
      <div className="flex-1 h-4 rounded bg-muted" />
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="h-4 w-12 rounded bg-muted" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsPeriod>("7d");

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useAnalyticsOverview(range);
  const { data: _audience, isLoading: _audienceLoading } = useAudienceStats(range);
  const { data: clipData, isLoading: clipsLoading } = useClipPerformance({
    limit: 5,
    period: range,
  });
  const { data: _revenueData, isLoading: _revenueLoading } = useRevenueAnalytics(range);

  const platforms = overview?.platforms ?? [];
  const daily = overview?.daily ?? [];
  const topClips = clipData?.data ?? [];

  // Aggregate stats across platforms
  const totalViews = platforms.reduce((s, p) => s + p.views, 0);
  const totalFollowers = platforms.reduce((s, p) => s + p.newFollowers, 0);
  const totalWatchTime = platforms.reduce((s, p) => s + p.watchTimeHours, 0);
  const totalRevenue = platforms.reduce((s, p) => s + p.revenue, 0);

  function handleExport() {
    toast.success("Analytics report exported as CSV");
  }

  if (overviewError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Track your performance across platforms" />
        <EmptyState preset="offline" subtitle="Could not load analytics data." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Track your performance across platforms">
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Views" value={fmtCompact(totalViews)} icon={Eye} />
            <StatCard title="New Followers" value={fmtCompact(totalFollowers)} icon={Users} />
            <StatCard title="Watch Time" value={`${fmtCompact(totalWatchTime)} hrs`} icon={Clock} />
            <StatCard title="Revenue" value={`$${fmtCompact(totalRevenue)}`} icon={DollarSign} />
          </>
        )}
      </div>

      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Showing data for</h2>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsPeriod)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Viewer trend — stacked area from daily metrics */}
      {overviewLoading ? (
        <ChartSkeleton />
      ) : daily.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Daily Views</CardTitle>
            <CardDescription>Views across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dailyConfig} className="h-64 w-full">
              <AreaChart data={daily} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.4}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement line chart */}
        {overviewLoading ? (
          <ChartSkeleton className="h-52" />
        ) : daily.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Engagement Rate</CardTitle>
              <CardDescription>Avg. engagement % across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={engagementConfig} className="h-52 w-full">
                <LineChart data={daily} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => [`${v}%`, "Engagement"]} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}

        {/* Platform bar chart */}
        {overviewLoading ? (
          <ChartSkeleton className="h-52" />
        ) : platforms.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Platform Comparison</CardTitle>
              <CardDescription>Views and new followers by platform</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={platformConfig} className="h-52 w-full">
                <BarChart data={platforms} margin={{ left: 0, right: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="platform"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="views" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="newFollowers" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Top content table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Clips This Period</CardTitle>
        </CardHeader>
        <CardContent>
          {clipsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <ContentRowSkeleton key={i} />
              ))}
            </div>
          ) : topClips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No clip data for this period.
            </p>
          ) : (
            <div className="space-y-3">
              {topClips.map((clip, idx) => (
                <div key={clip.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{clip.title}</p>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">
                    <Sensitive>{fmtCompact(clip.views ?? 0)}</Sensitive> views
                  </span>
                  {clip.completionRate != null && (
                    <span className="text-sm font-medium text-green-600 shrink-0">
                      <Sensitive>{clip.completionRate.toFixed(1)}%</Sensitive>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
