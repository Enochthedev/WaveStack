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
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
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

// ── Mock data sets per range ────────────────────────────────────────────────

const viewerDataMap: Record<string, { date: string; youtube: number; twitch: number; tiktok: number }[]> = {
  "7d": [
    { date: "Feb 15", youtube: 4200, twitch: 1800, tiktok: 900 },
    { date: "Feb 16", youtube: 3800, twitch: 2100, tiktok: 1200 },
    { date: "Feb 17", youtube: 5100, twitch: 1600, tiktok: 800 },
    { date: "Feb 18", youtube: 6200, twitch: 2400, tiktok: 1500 },
    { date: "Feb 19", youtube: 4900, twitch: 2200, tiktok: 1100 },
    { date: "Feb 20", youtube: 7100, twitch: 3100, tiktok: 2000 },
    { date: "Feb 21", youtube: 6800, twitch: 2900, tiktok: 1800 },
  ],
  "30d": [
    { date: "Jan 24", youtube: 3100, twitch: 1200, tiktok: 600 },
    { date: "Jan 29", youtube: 4400, twitch: 1700, tiktok: 900 },
    { date: "Feb 03", youtube: 5200, twitch: 2000, tiktok: 1100 },
    { date: "Feb 08", youtube: 4800, twitch: 1900, tiktok: 1000 },
    { date: "Feb 13", youtube: 6100, twitch: 2600, tiktok: 1400 },
    { date: "Feb 18", youtube: 6200, twitch: 2400, tiktok: 1500 },
    { date: "Feb 21", youtube: 8200, twitch: 3400, tiktok: 2300 },
  ],
  "90d": [
    { date: "Nov", youtube: 2100, twitch: 900, tiktok: 400 },
    { date: "Dec", youtube: 3400, twitch: 1400, tiktok: 700 },
    { date: "Jan", youtube: 5200, twitch: 2100, tiktok: 1100 },
    { date: "Feb", youtube: 8200, twitch: 3400, tiktok: 2300 },
  ],
};

const engagementDataMap: Record<string, { date: string; rate: number }[]> = {
  "7d": [
    { date: "Feb 15", rate: 4.1 }, { date: "Feb 16", rate: 3.8 },
    { date: "Feb 17", rate: 5.2 }, { date: "Feb 18", rate: 4.7 },
    { date: "Feb 19", rate: 4.4 }, { date: "Feb 20", rate: 5.8 },
    { date: "Feb 21", rate: 5.5 },
  ],
  "30d": [
    { date: "Jan 24", rate: 3.6 }, { date: "Jan 29", rate: 4.0 },
    { date: "Feb 03", rate: 4.5 }, { date: "Feb 08", rate: 4.2 },
    { date: "Feb 13", rate: 5.1 }, { date: "Feb 18", rate: 4.7 },
    { date: "Feb 21", rate: 6.1 },
  ],
  "90d": [
    { date: "Nov", rate: 3.1 }, { date: "Dec", rate: 3.9 },
    { date: "Jan", rate: 4.7 }, { date: "Feb", rate: 6.1 },
  ],
};

const platformData = [
  { platform: "YouTube", views: 62000, followers: 1200 },
  { platform: "Twitch",  views: 28000, followers: 450 },
  { platform: "TikTok",  views: 22000, followers: 890 },
  { platform: "Instagram", views: 9000, followers: 210 },
  { platform: "X / Twitter", views: 7000, followers: 310 },
];

const topContent = [
  { rank: 1, title: "Building a Discord Bot from Scratch",  views: "24.5K", engagement: "8.2%" },
  { rank: 2, title: "Live Coding: Full Stack App",          views: "18.3K", engagement: "7.1%" },
  { rank: 3, title: "Top 10 VS Code Extensions 2026",       views: "15.7K", engagement: "6.8%" },
  { rank: 4, title: "React Server Components Deep Dive",    views: "12.1K", engagement: "5.9%" },
  { rank: 5, title: "My Studio Setup Tour",                 views: "9.8K",  engagement: "5.4%" },
];

// ── Chart configs ──────────────────────────────────────────────────────────

const viewerConfig = {
  youtube: { label: "YouTube", color: "hsl(var(--chart-1))" },
  twitch:  { label: "Twitch",  color: "hsl(var(--chart-2))" },
  tiktok:  { label: "TikTok",  color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const engagementConfig = {
  rate: { label: "Engagement %", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const platformConfig = {
  views:     { label: "Views",        color: "hsl(var(--chart-1))" },
  followers: { label: "New Followers", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

// ── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");

  const viewerData = viewerDataMap[range];
  const engagementData = engagementDataMap[range];

  function handleExport() {
    toast.success("Analytics report exported as CSV");
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
        <StatCard title="Total Views"  value="128K"      change="+22%"          trend="up" icon={Eye} />
        <StatCard title="Followers"    value="45.2K"     change="+1.2K this week" trend="up" icon={Users} />
        <StatCard title="Watch Time"   value="2,340 hrs" change="+15%"          trend="up" icon={Clock} />
        <StatCard title="Revenue"      value="$3,420"    change="+8%"           trend="up" icon={DollarSign} />
      </div>

      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Showing data for</h2>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
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

      {/* Viewer trend — stacked area */}
      <Card>
        <CardHeader>
          <CardTitle>Viewers by Platform</CardTitle>
          <CardDescription>Across YouTube, Twitch, and TikTok</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={viewerConfig} className="h-64 w-full">
            <AreaChart data={viewerData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="youtube" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.4} />
              <Area type="monotone" dataKey="twitch"  stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.4} />
              <Area type="monotone" dataKey="tiktok"  stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.4} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement line chart */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Rate</CardTitle>
            <CardDescription>Avg. engagement % across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={engagementConfig} className="h-52 w-full">
              <LineChart data={engagementData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  domain={[3, 7]}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => [`${v}%`, "Engagement"]} />}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Platform bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Comparison</CardTitle>
            <CardDescription>Views and new followers this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={platformConfig} className="h-52 w-full">
              <BarChart data={platformData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="platform" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="views"     fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="followers" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top content table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Content This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topContent.map((item) => (
              <div
                key={item.rank}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-bold">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                </div>
                <span className="text-sm text-muted-foreground shrink-0"><Sensitive>{item.views}</Sensitive> views</span>
                <span className="text-sm font-medium text-green-600 shrink-0"><Sensitive>{item.engagement}</Sensitive></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
