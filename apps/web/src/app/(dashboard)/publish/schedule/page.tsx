"use client";

import { useState } from "react";
import { toast } from "sonner";
import { scheduledPosts as initialPosts } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Loader2, Trash2 } from "lucide-react";
import { platformBadge, platformDot, platformLabel } from "@/lib/colors";
import { cn } from "@/lib/utils";

type Post = (typeof initialPosts)[number];

const WEEK = [
  { label: "Sun", date: "Feb 22", day: 22 },
  { label: "Mon", date: "Feb 23", day: 23 },
  { label: "Tue", date: "Feb 24", day: 24 },
  { label: "Wed", date: "Feb 25", day: 25 },
  { label: "Thu", date: "Feb 26", day: 26 },
  { label: "Fri", date: "Feb 27", day: 27 },
  { label: "Sat", date: "Feb 28", day: 28 },
];

const PLATFORMS_AVAILABLE = [
  { id: "youtube",        label: "YouTube"       },
  { id: "twitch",         label: "Twitch"        },
  { id: "tiktok",         label: "TikTok"        },
  { id: "twitter",        label: "X / Twitter"   },
  { id: "instagram",      label: "Instagram"     },
  { id: "youtube_shorts", label: "YT Shorts"     },
];

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtFull(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function SchedulePage() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [prefillDay, setPrefillDay] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "12:00",
    platforms: [] as string[],
  });

  function openNew(day?: number) {
    const dayStr = day
      ? `2026-02-${String(day).padStart(2, "0")}`
      : "";
    setPrefillDay(day ?? null);
    setForm({ title: "", date: dayStr, time: "12:00", platforms: [] });
    setNewPostOpen(true);
  }

  function togglePlatform(id: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id],
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date || form.platforms.length === 0) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));

    const scheduleAt = new Date(`${form.date}T${form.time}:00Z`).toISOString();
    const newPost: Post = {
      id: `post-${Date.now()}`,
      title: form.title,
      platforms: form.platforms,
      scheduleAt,
      status: "scheduled",
    };
    setPosts((prev) => [...prev, newPost]);
    setSaving(false);
    setNewPostOpen(false);
    toast.success(`"${newPost.title}" scheduled`);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.title}" removed from schedule`);
    setDeleteTarget(null);
  }

  // bucket posts by day-of-month
  const byDay: Record<number, Post[]> = {};
  for (const post of posts) {
    const day = new Date(post.scheduleAt).getDate();
    (byDay[day] ??= []).push(post);
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(a.scheduleAt).getTime() - new Date(b.scheduleAt).getTime()
  );

  const isFormValid = form.title.trim() && form.date && form.platforms.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Content Schedule" description="Your publishing calendar">
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-1.5" />New Post
        </Button>
      </PageHeader>

      {/* Weekly calendar grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEK.map((day) => (
                <div key={day.day} className="border-r border-border px-3 py-2 last:border-r-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</p>
                  <p className="text-sm font-medium">{day.date}</p>
                </div>
              ))}
            </div>
            {/* Day columns */}
            <div className="grid grid-cols-7">
              {WEEK.map((day) => {
                const dayPosts = byDay[day.day] ?? [];
                return (
                  <div key={day.day} className="min-h-[180px] border-r border-border p-2 last:border-r-0 space-y-1.5">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="group rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity bg-muted/30 border-border relative"
                        onClick={() => setDeleteTarget(post)}
                      >
                        <p className="font-medium text-[11px] text-muted-foreground">{fmtTime(post.scheduleAt)}</p>
                        <p className="leading-tight truncate mt-0.5">{post.title}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {post.platforms.map((p) => (
                            <span
                              key={p}
                              className={`inline-block h-1.5 w-1.5 rounded-full ${platformDot[p] ?? "bg-muted-foreground"}`}
                            />
                          ))}
                        </div>
                        <Trash2 className="absolute top-1 right-1 h-3 w-3 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {/* Add button on empty or at end */}
                    <button
                      onClick={() => openNew(day.day)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary list */}
      <Card>
        <CardHeader><CardTitle>Scheduled This Week</CardTitle></CardHeader>
        <CardContent className="px-0">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nothing scheduled. Click <strong>New Post</strong> or a <strong>+</strong> on the calendar to add one.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((post, i) => (
                <div
                  key={post.id}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 text-sm flex-wrap group",
                    i % 2 === 0 ? "bg-muted/20" : ""
                  )}
                >
                  <div className="flex gap-1 shrink-0">
                    {post.platforms.map((p) => (
                      <Badge key={p} variant="outline" className={`text-xs ${platformBadge[p] ?? ""}`}>
                        {platformLabel[p] ?? p}
                      </Badge>
                    ))}
                  </div>
                  <span className="flex-1 min-w-0 truncate font-medium">{post.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtFull(post.scheduleAt)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => setDeleteTarget(post)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Post Dialog */}
      <Dialog open={newPostOpen} onOpenChange={(open: boolean) => !open && setNewPostOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                placeholder="Epic clutch moment"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="post-date">Date</Label>
                <Input
                  id="post-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-time">Time</Label>
                <Input
                  id="post-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS_AVAILABLE.map((p) => {
                  const active = form.platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {form.platforms.length === 0 && (
                <p className="text-xs text-destructive">Select at least one platform</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPostOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !isFormValid}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove scheduled post?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be removed from the schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
