"use client";

import { useState } from "react";
import { toast } from "sonner";
import { seoScores as initialScores, trendingKeywords } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
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
import { TrendingUp, Minus, Loader2, CheckCircle2, Wand2 } from "lucide-react";

type SeoScore = (typeof initialScores)[number];

const competitionColors: Record<string, string> = {
  low:    "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high:   "bg-red-500/10 text-red-500 border-red-500/20",
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

// Mock AI suggestions per item
function generateSuggestions(item: SeoScore): string[] {
  const base = [
    `Add "${item.keywords[0] ?? "primary keyword"}" to the title tag`,
    "Increase meta description length to 150-160 characters",
    "Add alt text to all images",
  ];
  return [...item.issues.slice(0, 2), ...base].slice(0, 4);
}

export default function SEOPage() {
  const [scores, setScores] = useState<SeoScore[]>(initialScores);
  const [optimizeTarget, setOptimizeTarget] = useState<SeoScore | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState<Set<string>>(new Set());
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const avgScore     = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  const needingFixes = scores.filter((s) => s.issues.length > 0).length;

  function openOptimize(item: SeoScore) {
    setOptimizeTarget(item);
    setEditTitle(item.title);
    setEditDescription("");
  }

  async function handleApplyOptimizations() {
    if (!optimizeTarget) return;
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 1400));

    // Simulate score improvement
    setScores((prev) =>
      prev.map((s) =>
        s.id === optimizeTarget.id
          ? { ...s, score: Math.min(s.score + Math.floor(Math.random() * 12) + 5, 100), issues: [] }
          : s
      )
    );
    setOptimized((prev) => new Set([...prev, optimizeTarget.id]));
    setOptimizing(false);
    setOptimizeTarget(null);
    toast.success(`SEO optimized for "${optimizeTarget.title}"`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" description="Optimize your content for search" />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg SEO Score",        value: avgScore,               suffix: "/100" },
          { label: "Content Needing Fixes", value: needingFixes,           suffix: ` of ${scores.length}` },
          { label: "Keywords Tracked",      value: trendingKeywords.length, suffix: "" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">
                {s.value}<span className="text-base font-normal text-muted-foreground">{s.suffix}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content SEO scores */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Content SEO Scores</h2>
        <div className="space-y-3">
          {scores.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      {optimized.has(item.id) && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.publishedAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className={`text-2xl font-bold ${scoreColor(item.score)}`}>{item.score}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openOptimize(item)}
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      Optimize
                    </Button>
                  </div>
                </div>

                <Progress value={item.score} className={scoreBarColor(item.score)} />

                {item.issues.length > 0 ? (
                  <ul className="space-y-0.5">
                    {item.issues.map((issue) => (
                      <li key={issue} className="text-xs text-destructive flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-green-500">✓ No issues found</p>
                )}

                <div className="flex gap-1.5 flex-wrap">
                  {item.keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Trending keywords */}
      <Card>
        <CardHeader><CardTitle>Trending Keywords in Your Niche</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {[...trendingKeywords]
              .sort((a, b) => b.relevance - a.relevance)
              .map((kw) => (
                <div key={kw.keyword} className="flex items-center gap-4 px-6 py-3 text-sm flex-wrap">
                  <span className="flex-1 font-medium min-w-[160px]">{kw.keyword}</span>
                  <span className="text-muted-foreground w-24 shrink-0 text-xs">
                    {kw.volume.toLocaleString()} / mo
                  </span>
                  <Badge variant="outline" className={`shrink-0 text-xs ${competitionColors[kw.competition] ?? ""}`}>
                    {kw.competition}
                  </Badge>
                  <span className="shrink-0 w-16 flex items-center gap-1 text-xs">
                    {kw.trend === "up" ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={kw.trend === "up" ? "text-green-500" : "text-muted-foreground"}>
                      {kw.trend}
                    </span>
                  </span>
                  <span className="shrink-0 w-20 text-right text-xs font-medium">
                    {kw.relevance}% match
                  </span>
                </div>
              ))}
          </div>
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

            {/* AI suggestions */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                AI Suggestions
              </Label>
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                {optimizeTarget && generateSuggestions(optimizeTarget).map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Wand2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

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
              <p className="text-xs text-muted-foreground text-right">{editDescription.length}/160</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptimizeTarget(null)}>Cancel</Button>
            <Button onClick={handleApplyOptimizations} disabled={optimizing}>
              {optimizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {optimizing ? "Optimizing..." : "Apply Optimizations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
