"use client";

import { useState } from "react";
import { useCompetitors, useAddCompetitor, useRemoveCompetitor } from "@/lib/hooks/use-competitors";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, TrendingUp, TrendingDown, Minus, Trash2, Loader2 } from "lucide-react";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { cn } from "@/lib/utils";
import type { Competitor } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function ChangeCell({ value }: { value?: number }) {
  if (!value || value === 0) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
        <Minus className="h-3 w-3" />0
      </span>
    );
  }
  if (value > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />+{value.toLocaleString()}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-destructive text-xs font-medium">
      <TrendingDown className="h-3 w-3" />
      {value.toLocaleString()}
    </span>
  );
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted flex-1" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-muted" />
            <div className="space-y-1">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 rounded bg-muted" />
          <div className="h-8 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const { data: competitorsData, isLoading, isError } = useCompetitors();
  const addCompetitor = useAddCompetitor();
  const removeCompetitor = useRemoveCompetitor();

  const list: Competitor[] = competitorsData ?? [];

  const [query, setQuery] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [newPlatform, setNewPlatform] = useState("twitch");

  function handleAdd() {
    if (!newHandle.trim()) return;
    addCompetitor.mutate(
      { channelName: newHandle.replace("@", ""), platform: newPlatform },
      { onSuccess: () => setNewHandle("") },
    );
  }

  function handleRemove(id: string) {
    removeCompetitor.mutate(id);
  }

  const filtered = list.filter((c) => c.channelName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitors"
        description="Track and compare your stats against other creators"
      />

      {/* ── Add competitor ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Add Competitor</CardTitle>
          <CardDescription>
            Search by handle to track another creator&apos;s public stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="@handle or channel name…"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Select value={newPlatform} onValueChange={setNewPlatform}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitch">Twitch</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newHandle.trim() || addCompetitor.isPending}>
              {addCompetitor.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Comparison table ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Leaderboard</CardTitle>
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder="Filter…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <EmptyState preset="offline" subtitle="Could not load competitors." size="sm" />
          ) : isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium w-52">Creator</th>
                    <th className="pb-2 px-3 font-medium">Followers</th>
                    <th className="pb-2 px-3 font-medium">Growth Rate</th>
                    <th className="pb-2 px-3 font-medium">Avg Viewers</th>
                    <th className="pb-2 pl-3 font-medium w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        {list.length === 0
                          ? "No competitors tracked yet. Add one above."
                          : "No matches found."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                              {c.channelName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{c.channelName}</p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-4 py-0 px-1 gap-0.5",
                                  platformBadge[c.platform],
                                )}
                              >
                                <PlatformIcon platform={c.platform} size={10} branded />
                                {platformLabel[c.platform] ?? c.platform}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium">{c.followers.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <ChangeCell value={c.growthRate} />
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {c.avgViewers != null && c.avgViewers > 0
                            ? c.avgViewers.toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-3 pl-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={removeCompetitor.isPending}
                            onClick={() => handleRemove(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Competitor cards ────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState preset="no-competitors" size="lg" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {list.map((c) => (
            <Card key={c.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                      {c.channelName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.channelName}</p>
                    </div>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-4 py-0 px-1.5 w-fit gap-0.5",
                    platformBadge[c.platform],
                  )}
                >
                  <PlatformIcon platform={c.platform} size={10} branded />
                  {platformLabel[c.platform] ?? c.platform}
                </Badge>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Followers</p>
                    <p className="font-semibold">{c.followers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Growth</p>
                    <ChangeCell value={c.growthRate} />
                  </div>
                  {c.avgViewers != null && c.avgViewers > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Avg viewers</p>
                      <p className="font-semibold">{c.avgViewers.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
