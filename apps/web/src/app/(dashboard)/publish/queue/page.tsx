"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { queueItems as initialItems } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type QueueItem = (typeof initialItems)[number];

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

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [editItem, setEditItem] = useState<QueueItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<QueueItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openEdit(item: QueueItem) {
    setEditItem(item);
    setEditTitle(item.title);
  }

  async function handleSave() {
    if (!editItem) return;
    setEditSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setItems((prev) =>
      prev.map((i) => (i.id === editItem.id ? { ...i, title: editTitle } : i))
    );
    setEditSaving(false);
    setEditItem(null);
    toast.success("Item updated successfully");
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 600));
    setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    setDeleting(false);
    setDeleteItem(null);
    toast.success(`"${deleteItem.title}" removed from queue`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Content Queue"
        description="Manage scheduled content"
      />

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

          {/* Table Rows */}
          {items.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Queue is empty
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b px-6 py-4 last:border-b-0"
            >
              <p className="text-sm font-medium truncate">{item.title}</p>

              <div className="flex items-center gap-1.5 w-48 flex-wrap">
                {item.platforms.map((platform) => (
                  <Badge
                    key={platform}
                    variant="outline"
                    className={
                      platformColors[platform] ||
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {platform.replace("_", " ")}
                  </Badge>
                ))}
              </div>

              <div className="w-24">
                <StatusBadge status={item.status} />
              </div>

              <span className="text-xs text-muted-foreground w-32 whitespace-nowrap">
                {formatScheduleDate(item.scheduleAt)}
              </span>

              <div className="flex items-center gap-1 w-20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteItem(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open: boolean) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Queue Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            {editItem && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Platforms</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {editItem.platforms.map((p) => (
                    <Badge key={p} variant="outline" className={platformColors[p] ?? ""}>
                      {p.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {editItem && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Scheduled</Label>
                <p className="text-sm">{formatScheduleDate(editItem.scheduleAt)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={editSaving || !editTitle.trim()}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open: boolean) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteItem?.title}&rdquo; will be permanently removed from the content queue.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
