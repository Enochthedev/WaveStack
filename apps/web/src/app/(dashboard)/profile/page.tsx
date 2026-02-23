"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Globe,
  Calendar,
  Edit2,
  ExternalLink,
  Users,
  Play,
  BarChart3,
  Zap,
  TrendingUp,
} from "lucide-react";
import { creatorProfile, revenueStats, streamHistory } from "@/lib/mock-data";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { cn } from "@/lib/utils";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}



export default function ProfilePage() {
  const [profile] = useState(creatorProfile);

  const totalFollowers = profile.platforms.reduce((sum, p) => sum + p.followers, 0);

  // Recent streams (last 3)
  const recentStreams = streamHistory.slice(0, 3);

  // YPP progress (from revenueStats context)
  const yppProgress = { current: 820, target: 1000, label: "YouTube subscribers toward YPP" };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Your public creator profile and cross-platform stats"
      />

      {/* ── Profile header card ──────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold ring-4 ring-primary/20">
                {profile.avatarInitials}
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-background" title="Online" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div>
                  <h2 className="text-xl font-bold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit profile
                  </Button>
                </Link>
              </div>

              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl">{profile.bio}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                  {profile.website.replace("https://", "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Creator since {relDate(profile.joinedAt)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users,    label: "Total Followers",  value: totalFollowers.toLocaleString() },
          { icon: Play,     label: "Total Streams",    value: profile.stats.totalStreams.toLocaleString() },
          { icon: BarChart3, label: "Total Content",   value: profile.stats.totalContent.toLocaleString() },
          { icon: Zap,      label: "Avg Engagement",   value: profile.stats.avgEngagement },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Connected platforms ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Presence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profile.platforms.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <PlatformIcon platform={p.id} size={18} branded />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{platformLabel[p.id] ?? p.label}</p>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] h-4 py-0 px-1.5", platformBadge[p.id])}
                    >
                      {p.handle}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Progress
                      value={(p.followers / (profile.platforms[0]?.followers || 1)) * 100}
                      className="h-1 flex-1 max-w-[160px]"
                    />
                    <span className="text-xs text-muted-foreground">{p.followers.toLocaleString()} followers</span>
                  </div>
                </div>
                <a href={p.url} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Two-column lower section ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.achievements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg p-3 bg-muted/40">
                  <span className="text-2xl leading-none mt-0.5">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(a.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent streams + milestone */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Streams</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {recentStreams.map((s) => (
                <div key={s.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>{s.peakViewers} peak viewers</span>
                    <span>{Math.round(s.duration / 60)}h {s.duration % 60}m</span>
                    <span>{s.clipsCreated} clips</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Next Milestone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{yppProgress.label}</span>
                  <span className="font-medium">{yppProgress.current.toLocaleString()} / {yppProgress.target.toLocaleString()}</span>
                </div>
                <Progress value={(yppProgress.current / yppProgress.target) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {yppProgress.target - yppProgress.current} more subscribers needed to unlock YouTube Partner Program
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
