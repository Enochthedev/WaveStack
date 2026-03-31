"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useQueueItems } from "@/lib/hooks/use-queue";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { Send, Loader, CheckCircle, SendHorizonal } from "lucide-react";

function formatScheduleDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function QueueItemSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4 gap-4 animate-pulse">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-5 w-20 rounded bg-muted" />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PublishPage() {
  const { data: queueData, isLoading, isError } = useQueueItems({ limit: 100 });
  const items = queueData?.data ?? [];

  const queuedCount = items.filter(
    (i: any) => i.status === "queued" || i.status === "scheduled",
  ).length;
  const processingCount = items.filter((i: any) => i.status === "processing").length;
  const publishedCount = items.filter((i: any) => i.status === "published").length;

  function handlePublishNow(item: any) {
    // TODO: wire to real publish-now mutation when available
    toast.info(`Publish-now API not yet implemented for "${item.title}"`);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Publishing" description="Manage your content pipeline">
        <Button asChild>
          <Link href="/publish/compose">Compose Post</Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center animate-pulse">
                <div className="h-8 w-12 rounded bg-muted mx-auto" />
                <div className="h-3 w-20 rounded bg-muted mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Queued" value={queuedCount} icon={Send} />
          <StatCard title="Processing" value={processingCount} icon={Loader} />
          <StatCard title="Published Today" value={publishedCount} icon={CheckCircle} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Content Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isError ? (
            <EmptyState preset="offline" subtitle="Could not load publish queue." size="sm" />
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <QueueItemSkeleton key={i} />)
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Queue is empty.{" "}
              <Link href="/publish/compose" className="text-primary underline">
                Compose a post
              </Link>{" "}
              to get started.
            </p>
          ) : (
            items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-4 gap-4"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(item.platforms ?? []).map((platform: string) => (
                      <Badge
                        key={platform}
                        variant="outline"
                        className={`gap-1 ${platformBadge[platform] ?? "bg-muted text-muted-foreground"}`}
                      >
                        <PlatformIcon platform={platform} size={12} branded />
                        {platformLabel[platform] ?? platform}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={item.status} />
                  {item.scheduleAt && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatScheduleDate(item.scheduleAt)}
                    </span>
                  )}
                  {(item.status === "queued" || item.status === "scheduled") && (
                    <Button size="sm" variant="outline" onClick={() => handlePublishNow(item)}>
                      <SendHorizonal className="h-3.5 w-3.5 mr-1" />
                      Publish Now
                    </Button>
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
