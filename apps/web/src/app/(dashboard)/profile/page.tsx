"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useStreamSessions } from "@/lib/hooks/use-stream";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Edit2, Eye, Scissors } from "lucide-react";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="h-24 w-24 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-12 w-full max-w-xl rounded bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: sessionsData, isLoading: sessionsLoading } = useStreamSessions();

  const recentStreams = (sessionsData?.data ?? []).slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Your public creator profile and cross-platform stats"
      />

      {/* ── Profile header card ──────────────────────────────── */}
      {userLoading ? (
        <ProfileSkeleton />
      ) : !user ? (
        <EmptyState preset="offline" subtitle="Could not load profile." />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold ring-4 ring-primary/20">
                  {(user.name ?? user.email ?? "?")[0]?.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{user.name ?? "Unnamed"}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit profile
                    </Button>
                  </Link>
                </div>
                {user.createdAt && (
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Member since {relDate(user.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent streams ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Streams</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {sessionsLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="py-3">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="mt-1 flex gap-4">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentStreams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No streams yet. Go live to start building your profile.
            </p>
          ) : (
            recentStreams.map((s) => (
              <div key={s.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium truncate">{s.title ?? "Untitled stream"}</p>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                  {s.peakViewerCount != null && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {s.peakViewerCount} peak
                    </span>
                  )}
                  {s.durationSeconds != null && (
                    <span>{formatDuration(Math.round(s.durationSeconds / 60))}</span>
                  )}
                  {s.clipsCreated != null && (
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3 w-3" /> {s.clipsCreated} clips
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
