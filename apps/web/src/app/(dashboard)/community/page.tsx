"use client";

import { toast } from "sonner";
import { communityStats, topSupporters, followerGrowth } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { Users, MessageSquare, Heart, Trophy, Clock, Gift, Download } from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformLabel } from "@/lib/colors";

const chartConfig: ChartConfig = {
  youtube: { label: "YouTube", color: "hsl(var(--chart-1))" },
  twitch:  { label: "Twitch",  color: "hsl(var(--chart-2))" },
  discord: { label: "Discord", color: "hsl(var(--chart-3))" },
  tiktok:  { label: "TikTok",  color: "hsl(var(--chart-4))" },
};

const tierStyles: Record<string, string> = {
  gold:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  silver: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  bronze: "bg-amber-600/20 text-amber-500 border-amber-600/30",
};

const rankStyles: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-400",
  2: "bg-gray-400/20 text-gray-400",
  3: "bg-amber-600/20 text-amber-500",
};

function fmtFollowers(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
}

export default function CommunityPage() {
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
        <StatCard title="Total Followers"  value={fmtFollowers(communityStats.totalFollowers)} change={communityStats.followersChange} trend="up" icon={Users} />
        <StatCard title="Discord Members"  value={communityStats.discordMembers.toLocaleString()} change={communityStats.discordChange} trend="up" icon={MessageSquare} />
        <StatCard title="Avg Engagement"   value={communityStats.avgEngagement} change={communityStats.engagementChange} trend="up" icon={Heart} />
        <StatCard title="Top Platform"     value={communityStats.topPlatform} icon={Trophy} />
      </div>

      {/* Follower growth chart */}
      <Card>
        <CardHeader>
          <CardTitle>Follower Growth by Platform</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={followerGrowth} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="youtube" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="twitch"  stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="discord" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tiktok"  stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top supporters */}
      <Card>
        <CardHeader><CardTitle>Top Supporters</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="divide-y divide-border">
            {topSupporters.map((s) => (
              <div key={s.rank} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 text-sm">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankStyles[s.rank] ?? "bg-muted/40 text-muted-foreground"}`}>
                  {s.rank}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{s.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium">{s.username}</span>
                  <Badge variant="outline" className="shrink-0 text-xs gap-1">
                    <PlatformIcon platform={s.platform} size={11} branded />
                    {platformLabel[s.platform] ?? s.platform}
                  </Badge>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />{s.watchHours}h
                </span>
                <span className="shrink-0 text-muted-foreground">{s.messagesTotal.toLocaleString()} msgs</span>
                {s.totalGifted > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                    <Gift className="h-3.5 w-3.5" />{s.totalGifted}
                  </span>
                )}
                <Badge variant="outline" className={`shrink-0 text-xs capitalize ${tierStyles[s.tier] ?? ""}`}>
                  {s.tier}
                </Badge>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Since {new Date(s.joinedAt).getFullYear()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => handleMessage(s.username)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Message
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
