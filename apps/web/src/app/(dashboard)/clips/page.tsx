"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useClipLibrary,
  useUpdateClip,
  useDeleteClip,
  usePublishClip,
} from "@/lib/hooks/use-clips";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Download, ListPlus, Trash2, Loader2 } from "lucide-react";

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatRelativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "just now";
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ClipSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            <div className="h-3 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-12 rounded bg-muted animate-pulse shrink-0" />
          <div className="h-5 w-16 rounded bg-muted animate-pulse shrink-0" />
          <div className="h-3 w-14 rounded bg-muted animate-pulse shrink-0" />
        </div>
        <div className="h-8 w-8 rounded bg-muted animate-pulse shrink-0" />
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClipsPage() {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useClipLibrary({ pageSize: 24 });
  const updateClip = useUpdateClip();
  const deleteClip = useDeleteClip();
  const publishClip = usePublishClip();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  const [editClipId, setEditClipId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  function openEdit(clip: { id: string; title?: string }) {
    setEditClipId(clip.id);
    setEditTitle(clip.title ?? "");
  }

  function saveEdit() {
    if (!editClipId || !editTitle.trim()) return;
    updateClip.mutate(
      { id: editClipId, title: editTitle },
      { onSuccess: () => setEditClipId(null) },
    );
  }

  function handleQueueAdd(clip: { id: string; title?: string; platforms?: string[] }) {
    const platforms = clip.platforms?.length ? clip.platforms : ["youtube"];
    publishClip.mutate({ id: clip.id, platforms });
  }

  function handleDownload(clip: { title?: string }) {
    toast.info(`Preparing download for "${clip.title ?? "clip"}"…`);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteClip.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Clips" description="Create and manage your clips">
          <Button asChild>
            <Link href="/clips/create">Create Clip</Link>
          </Button>
        </PageHeader>
        <EmptyState preset="offline" subtitle="Could not load clips. Check your connection." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Clips" description="Create and manage your clips">
        <Button asChild>
          <Link href="/clips/create">Create Clip</Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ClipSkeleton key={i} />
          ))}
        </div>
      ) : clips.length === 0 ? (
        <EmptyState
          preset="generic"
          title="No clips yet"
          subtitle="Create your first clip from a stream or upload a video."
          size="lg"
        />
      ) : (
        <div className="space-y-3">
          {clips.map((clip) => (
            <Card key={clip.id}>
              <CardContent className="flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{clip.title}</p>
                    {clip.sourceUrl && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {clip.sourceUrl}
                      </p>
                    )}
                  </div>
                  {clip.duration != null && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDuration(clip.duration)}
                    </span>
                  )}
                  <StatusBadge status={clip.status} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeTime(clip.createdAt)}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      {publishClip.isPending && publishClip.variables?.id === clip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(clip)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Title
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleQueueAdd(clip)}
                      disabled={clip.status !== "awaiting_approval"}
                    >
                      <ListPlus className="h-4 w-4 mr-2" />
                      Add to Queue
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(clip)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        setDeleteTarget({ id: clip.id, title: clip.title ?? "Untitled clip" })
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editClipId} onOpenChange={(open: boolean) => !open && setEditClipId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Clip Title</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="clip-title">Title</Label>
              <Input
                id="clip-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClipId(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={updateClip.isPending || !editTitle.trim()}>
              {updateClip.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete clip?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted and cannot be
              recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClip.isPending}
            >
              {deleteClip.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
