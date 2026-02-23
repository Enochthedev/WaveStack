"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Send, Calendar, Clock, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";

// ── Platform config ────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "twitter",        handle: "@creator",  maxChars: 280,  feedCap: 280  },
  { id: "instagram",      handle: "@creator",  maxChars: 2200, feedCap: 125  },
  { id: "tiktok",         handle: "@creator",  maxChars: 2200, feedCap: 2200 },
  { id: "youtube_shorts", handle: "Creator",   maxChars: 5000, feedCap: 5000 },
  { id: "linkedin",       handle: "Creator",   maxChars: 3000, feedCap: 210  },
];

type PlatformId = string;

// ── Component ──────────────────────────────────────────────────────────────

export default function ComposePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlatformId[]>(["twitter", "instagram"]);
  const [caption, setCaption] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");

  function togglePlatform(id: PlatformId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  const selectedPlatforms = PLATFORMS.filter((p) => selected.includes(p.id));
  const canSubmit = caption.trim().length > 0 && selected.length > 0;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Compose Post" description="Write once, publish everywhere" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: editor ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Platform pills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Publish to</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      selected.includes(p.id)
                        ? platformBadge[p.id] ?? "bg-muted text-foreground border-border"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <PlatformIcon platform={p.id} size={12} branded />
                    {platformLabel[p.id] ?? p.id}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Caption */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Caption</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Write your caption here… Wave can draft one for you"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[160px] resize-none"
              />

              {/* Per-platform char counts */}
              {selectedPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {selectedPlatforms.map((p) => {
                    const remaining = p.maxChars - caption.length;
                    const over = remaining < 0;
                    const warn = !over && remaining < p.maxChars * 0.1;
                    return (
                      <div key={p.id} className="flex items-center gap-1 text-xs">
                        <PlatformIcon platform={p.id} size={11} branded />
                        <span className="text-muted-foreground">{platformLabel[p.id] ?? p.id}:</span>
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            over
                              ? "text-destructive"
                              : warn
                              ? "text-yellow-500"
                              : "text-muted-foreground"
                          )}
                        >
                          {remaining}
                        </span>
                        {over && <AlertCircle className="h-3 w-3 text-destructive" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/40 hover:bg-muted/40">
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-xs">Drop media here or click to browse</span>
                  <span className="text-[10px]">PNG, JPG, MP4, GIF · max 500 MB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">When to publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleMode("now")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
                    scheduleMode === "now"
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  Post now
                </button>
                <button
                  onClick={() => setScheduleMode("schedule")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
                    scheduleMode === "schedule"
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </button>
              </div>

              {scheduleMode === "schedule" && (
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pb-6">
            <Button variant="outline" onClick={() => router.push("/publish")}>
              Cancel
            </Button>
            <Button
              onClick={() => router.push("/publish")}
              disabled={!canSubmit}
              className="gap-2"
            >
              {scheduleMode === "now" ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Publish now
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  Schedule post
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: live previews ─────────────────────────────────── */}
        <div className="space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Live Preview
          </p>

          {selectedPlatforms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Select platforms above to preview.
            </p>
          )}

          {selectedPlatforms.map((p) => {
            const truncated = caption.length > p.feedCap;
            const displayText = truncated
              ? caption.slice(0, p.feedCap - 3) + "…"
              : caption;

            return (
              <Card key={p.id} className="overflow-hidden">
                <div className={cn("border-b px-3 py-1.5 text-[10px] font-semibold flex items-center gap-1.5", platformBadge[p.id] ?? "bg-muted text-foreground")}>
                  <PlatformIcon platform={p.id} size={12} branded={false} />
                  {platformLabel[p.id] ?? p.id}
                </div>
                <CardContent className="p-3 space-y-2">
                  {/* Account row */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      CR
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-none">Creator</p>
                      <p className="text-[10px] text-muted-foreground">{p.handle}</p>
                    </div>
                  </div>

                  {/* Caption preview */}
                  {displayText ? (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                      {displayText}
                      {truncated && (
                        <span className="text-muted-foreground"> more</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      Your caption will appear here…
                    </p>
                  )}

                  {/* Media placeholder */}
                  <div className="flex h-20 items-center justify-center rounded-lg bg-muted">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
