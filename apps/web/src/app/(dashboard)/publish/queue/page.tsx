"use client";

import { toast } from "sonner";
import { useQueueItems } from "@/lib/hooks/use-queue";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const platformColors: Record<string, string> = {
  youtube: "bg-red-500/10 text-red-500 border-red-500/20",
  youtube_shorts: "bg-red-500/10 text-red-500 border-red-500/20",
  tiktok: "bg-gray-900/10 text-gray-900 dark:text-gray-100 border-gray-900/20",
  instagram: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  twitter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

function formatScheduleDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b px-6 py-4 last:border-b-0 animate-pulse">
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="h-5 w-20 rounded bg-muted w-48" />
      <div className="h-5 w-16 rounded bg-muted w-24" />
      <div className="h-4 w-24 rounded bg-muted w-32" />
      <div className="h-8 w-8 rounded bg-muted w-20" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const { data: queueData, isLoading, isError } = useQueueItems({ limit: 100 });
  const items = queueData?.data ?? [];

  function handleRemove(item: any) {
    // TODO: wire to real remove mutation when available
    toast.info(`Remove API not yet implemented for "${item.title}"`);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Content Queue" description="Manage scheduled content" />

      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b px-6 py-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Title
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-48">
              Platforms
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
              Status
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
              Scheduled
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
              Actions
            </span>
          </div>

          {isError ? (
            <div className="px-6 py-6">
              <EmptyState preset="offline" subtitle="Could not load queue." size="sm" />
            </div>
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
          ) : items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Queue is empty
            </div>
          ) : (
            items.map((item: any) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b px-6 py-4 last:border-b-0"
              >
                <p className="text-sm font-medium truncate">{item.title}</p>

                <div className="flex items-center gap-1.5 w-48 flex-wrap">
                  {(item.platforms ?? []).map((platform: string) => (
                    <Badge
                      key={platform}
                      variant="outline"
                      className={platformColors[platform] || "bg-muted text-muted-foreground"}
                    >
                      {platform.replace("_", " ")}
                    </Badge>
                  ))}
                </div>

                <div className="w-24">
                  <StatusBadge status={item.status} />
                </div>

                {item.scheduleAt && (
                  <span className="text-xs text-muted-foreground w-32 whitespace-nowrap">
                    {formatScheduleDate(item.scheduleAt)}
                  </span>
                )}

                <div className="flex items-center gap-1 w-20">
                  {item.status !== "published" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(item)}
                    >
                      <Trash2 className="h-4 w-4" />
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
