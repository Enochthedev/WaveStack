"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { queueItems as initialItems } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { Send, Loader, CheckCircle, SendHorizonal, Trash2, Loader2 } from "lucide-react";

type QueueItem = (typeof initialItems)[number] & { status: string };

function formatScheduleDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PublishPage() {
  const [items, setItems] = useState<QueueItem[]>(initialItems as QueueItem[]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<QueueItem | null>(null);

  const queuedCount     = items.filter((i) => i.status === "queued" || i.status === "scheduled").length;
  const processingCount = items.filter((i) => i.status === "processing").length;
  const publishedCount  = items.filter((i) => i.status === "published").length;

  async function handlePublishNow(item: QueueItem) {
    setPublishing(item.id);
    await new Promise((r) => setTimeout(r, 1200));
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "published" } : i))
    );
    setPublishing(null);
    toast.success(`"${item.title}" published successfully`);
  }

  function handleRemove() {
    if (!removeTarget) return;
    setItems((prev) => prev.filter((i) => i.id !== removeTarget.id));
    toast.success(`"${removeTarget.title}" removed from queue`);
    setRemoveTarget(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Publishing"
        description="Manage your content pipeline"
      >
        <Button asChild>
          <Link href="/publish/compose">Compose Post</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Queued"          value={queuedCount}     icon={Send} />
        <StatCard title="Processing"      value={processingCount} icon={Loader} />
        <StatCard title="Published Today" value={publishedCount}  icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-4 gap-4"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.platforms.map((platform) => (
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
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatScheduleDate(item.scheduleAt)}
                </span>
                {(item.status === "queued" || item.status === "scheduled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={publishing === item.id}
                    onClick={() => handlePublishNow(item)}
                  >
                    {publishing === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <SendHorizonal className="h-3.5 w-3.5 mr-1" />
                    )}
                    {publishing === item.id ? "Publishing…" : "Publish Now"}
                  </Button>
                )}
                {item.status !== "published" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoveTarget(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Queue is empty. <Link href="/publish/compose" className="text-primary underline">Compose a post</Link> to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open: boolean) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{removeTarget?.title}&rdquo; will be removed from the publish queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
