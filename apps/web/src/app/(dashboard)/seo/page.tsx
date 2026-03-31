"use client";

import { useState } from "react";
import { useSeoScores, useTrendingKeywords, useAnalyzeTitle } from "@/lib/hooks/use-seo";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TrendingUp, Minus, Loader2, Wand2 } from "lucide-react";

const competitionColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-500";
  if (score >= 70) return "text-yellow-500";
  return "text-destructive";
}

function scoreBarColor(score: number) {
  if (score >= 85) return "[&>div]:bg-green-500";
  if (score >= 70) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-destructive";
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function ScoreSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-8 w-12 rounded bg-muted" />
        </div>
        <div className="h-2 w-full rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SEOPage() {
  const { data: scoresData, isLoading: scoresLoading, isError: scoresError } = useSeoScores();
  const { data: keywordsData, isLoading: keywordsLoading } = useTrendingKeywords();
  const analyzeTitle = useAnalyzeTitle();

  const scores = scoresData ?? [];
  const keywords = keywordsData ?? [];

  const [optimizeTarget, setOptimizeTarget] = useState<(typeof scores)[number] | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
  const needingFixes = scores.filter((s) => s.issues?.length > 0).length;

  function openOptimize(item: (typeof scores)[number]) {
    setOptimizeTarget(item);
    setEditTitle(item.title);
    setEditDescription("");
  }

  function handleApplyOptimizations() {
    if (!optimizeTarget) return;
    analyzeTitle.mutate(
      { title: editTitle, platform: "youtube" },
      {
        onSuccess: () => {
          setOptimizeTarget(null);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" description="Optimize your content for search" />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {scoresLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-center animate-pulse">
                  <div className="h-8 w-16 rounded bg-muted mx-auto" />
                  <div className="h-3 w-24 rounded bg-muted mx-auto mt-2" />
                </CardContent>
              </Card>
            ))
          : [
              { label: "Avg SEO Score", value: avgScore, suffix: "/100" },
              {
                label: "Content Needing Fixes",
                value: needingFixes,
                suffix: ` of ${scores.length}`,
              },
              { label: "Keywords Tracked", value: keywords.length, suffix: "" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">
                    {s.value}
                    <span className="text-base font-normal text-muted-foreground">{s.suffix}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Content SEO scores */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Content SEO Scores</h2>
        {scoresError ? (
          <EmptyState preset="offline" subtitle="Could not load SEO scores." />
        ) : scoresLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ScoreSkeleton key={i} />
            ))}
          </div>
        ) : scores.length === 0 ? (
          <EmptyState
            preset="generic"
            title="No SEO data"
            subtitle="Publish content to start tracking SEO scores."
            size="lg"
          />
        ) : (
          <div className="space-y-3">
            {scores.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                      </div>
                      {item.publishedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className={`text-2xl font-bold ${scoreColor(item.score)}`}>
                        {item.score}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => openOptimize(item)}>
                        <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                        Optimize
                      </Button>
                    </div>
                  </div>

                  <Progress value={item.score} className={scoreBarColor(item.score)} />

                  {item.issues?.length > 0 ? (
                    <ul className="space-y-0.5">
                      {item.issues.map((issue: string) => (
                        <li
                          key={issue}
                          className="text-xs text-destructive flex items-center gap-1.5"
                        >
                          <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-green-500">No issues found</p>
                  )}

                  {item.keywords?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {item.keywords.map((kw: string) => (
                        <Badge key={kw} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Trending keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Trending Keywords in Your Niche</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {keywordsLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3 animate-pulse">
                  <div className="h-4 w-32 rounded bg-muted flex-1" />
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-5 w-14 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : keywords.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No trending keywords found. Check back later.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[...keywords]
                .sort((a, b) => b.relevance - a.relevance)
                .map((kw) => (
                  <div
                    key={kw.keyword}
                    className="flex items-center gap-4 px-6 py-3 text-sm flex-wrap"
                  >
                    <span className="flex-1 font-medium min-w-[160px]">{kw.keyword}</span>
                    <span className="text-muted-foreground w-24 shrink-0 text-xs">
                      {kw.volume?.toLocaleString() ?? "—"} / mo
                    </span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${competitionColors[kw.competition] ?? ""}`}
                    >
                      {kw.competition}
                    </Badge>
                    <span className="shrink-0 w-16 flex items-center gap-1 text-xs">
                      {kw.trend === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span
                        className={kw.trend === "up" ? "text-green-500" : "text-muted-foreground"}
                      >
                        {kw.trend}
                      </span>
                    </span>
                    <span className="shrink-0 w-20 text-right text-xs font-medium">
                      {kw.relevance}% match
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimize Dialog */}
      <Dialog open={!!optimizeTarget} onOpenChange={(o) => !o && setOptimizeTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>SEO Optimization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground line-clamp-1 font-medium">
              {optimizeTarget?.title}
            </p>

            {optimizeTarget && optimizeTarget.issues?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Issues to Fix
                </Label>
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  {optimizeTarget.issues!.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Wand2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="seo-title">Title Tag</Label>
              <Input
                id="seo-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground text-right">{editTitle.length}/60</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-desc">Meta Description</Label>
              <Textarea
                id="seo-desc"
                placeholder="Write a compelling meta description (150-160 chars)..."
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground text-right">
                {editDescription.length}/160
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptimizeTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleApplyOptimizations} disabled={analyzeTitle.isPending}>
              {analyzeTitle.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {analyzeTitle.isPending ? "Optimizing..." : "Apply Optimizations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
