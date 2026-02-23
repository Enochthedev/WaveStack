"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { clips as initialClips } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
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

type Clip = (typeof initialClips)[number];

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

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>(initialClips);
  const [editClip, setEditClip] = useState<Clip | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Clip | null>(null);
  const [queueing, setQueueing] = useState<string | null>(null);

  function openEdit(clip: Clip) {
    setEditClip(clip);
    setEditTitle(clip.title);
  }

  async function saveEdit() {
    if (!editClip || !editTitle.trim()) return;
    setEditSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setClips((prev) =>
      prev.map((c) => (c.id === editClip.id ? { ...c, title: editTitle } : c))
    );
    setEditSaving(false);
    setEditClip(null);
    toast.success("Clip title updated");
  }

  async function handleQueueAdd(clip: Clip) {
    setQueueing(clip.id);
    await new Promise((r) => setTimeout(r, 900));
    setQueueing(null);
    toast.success(`"${clip.title}" added to publish queue`);
  }

  function handleDownload(clip: Clip) {
    toast.info(`Preparing download for "${clip.title}"…`);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setClips((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.title}" deleted`);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Clips" description="Create and manage your clips">
        <Button asChild>
          <Link href="/clips/create">Create Clip</Link>
        </Button>
      </PageHeader>

      {clips.length === 0 && (
        <Card>
          <CardContent className="flex h-36 items-center justify-center text-sm text-muted-foreground">
            No clips yet. Create your first clip above.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {clips.map((clip) => (
          <Card key={clip.id}>
            <CardContent className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{clip.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{clip.sourceUrl}</p>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDuration(clip.duration)}
                </span>
                <StatusBadge status={clip.status} />
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {formatRelativeTime(clip.createdAt)}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    {queueing === clip.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(clip)}>
                    <Pencil className="h-4 w-4 mr-2" />Edit Title
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleQueueAdd(clip)}
                    disabled={clip.status !== "ready" || queueing === clip.id}
                  >
                    <ListPlus className="h-4 w-4 mr-2" />Add to Queue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(clip)}>
                    <Download className="h-4 w-4 mr-2" />Download
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(clip)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editClip} onOpenChange={(open: boolean) => !open && setEditClip(null)}>
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
            <Button variant="outline" onClick={() => setEditClip(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving || !editTitle.trim()}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete clip?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
