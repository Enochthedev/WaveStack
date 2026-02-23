"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { competitors, competitorGrowth } from "@/lib/mock-data";
import { platformBadge, platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Competitor = (typeof competitors)[0];
type SortKey = "followers" | "followersChange" | "avgViewers" | "uploadsPerWeek" | "grade";
type SortDir = "asc" | "desc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradeColor(grade: string) {
  const g = grade[0];
  if (g === "A") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (g === "B") return "bg-sky-500/10 text-sky-600 border-sky-500/20";
  if (g === "C") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-muted text-muted-foreground";
}

function ChangeCell({ value }: { value: number }) {
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
      <TrendingUp className="h-3 w-3" />
      +{value.toLocaleString()}
    </span>
  );
  if (value < 0) return (
    <span className="flex items-center gap-0.5 text-destructive text-xs font-medium">
      <TrendingDown className="h-3 w-3" />
      {value.toLocaleString()}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" />
      0
    </span>
  );
}

// Line colours for chart — one per entity
const LINE_COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ef4444"];
const LINE_KEYS   = ["you", ...competitors.map((c) => c.name)];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const [list,    setList]    = useState<Competitor[]>(competitors);
  const [query,   setQuery]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("followers");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [newHandle,   setNewHandle]   = useState("");
  const [newPlatform, setNewPlatform] = useState("twitch");

  function sort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function remove(id: string) {
    setList((prev) => prev.filter((c) => c.id !== id));
  }

  function addCompetitor() {
    if (!newHandle.trim()) return;
    const fake: Competitor = {
      id:              String(Date.now()),
      name:            newHandle.replace("@", ""),
      handle:          newHandle.startsWith("@") ? newHandle : `@${newHandle}`,
      platform:        newPlatform,
      followers:       0,
      followersChange: 0,
      avgViewers:      0,
      uploadsPerWeek:  0,
      grade:           "–",
    };
    setList((prev) => [...prev, fake]);
    setNewHandle("");
  }

  const sorted = [...list]
    .filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.handle.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp   className="h-3 w-3 text-primary" />
      : <ChevronDown className="h-3 w-3 text-primary" />;
  }

  // Remap growth data keys to match competitor names
  const chartData = competitorGrowth.map((row) => ({
    month:             row.month,
    you:               row.you,
    StreamKing:        row.StreamKing,
    ProCodeCast:       row.ProCodeCast,
    NightShiftGaming:  row.NightShiftGaming,
    TechStreamDaily:   row.TechStreamDaily,
  }));

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
          <CardDescription>Search by handle to track another creator&apos;s public stats.</CardDescription>
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
                onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
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
            <Button onClick={addCompetitor} disabled={!newHandle.trim()}>
              <Plus className="h-4 w-4 mr-1.5" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium w-52">Creator</th>
                  <th className="pb-2 px-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => sort("followers")}>
                      Followers <SortIcon k="followers" />
                    </button>
                  </th>
                  <th className="pb-2 px-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => sort("followersChange")}>
                      7d Growth <SortIcon k="followersChange" />
                    </button>
                  </th>
                  <th className="pb-2 px-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => sort("avgViewers")}>
                      Avg Viewers <SortIcon k="avgViewers" />
                    </button>
                  </th>
                  <th className="pb-2 px-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => sort("uploadsPerWeek")}>
                      Posts/wk <SortIcon k="uploadsPerWeek" />
                    </button>
                  </th>
                  <th className="pb-2 px-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => sort("grade")}>
                      Grade <SortIcon k="grade" />
                    </button>
                  </th>
                  <th className="pb-2 pl-3 font-medium w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* "You" row */}
                <tr className="bg-primary/5">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        WS
                      </div>
                      <div>
                        <p className="font-medium text-sm">You (WaveStack)</p>
                        <p className="text-xs text-muted-foreground">@wavestack</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium">45,200</td>
                  <td className="py-3 px-3"><ChangeCell value={1700} /></td>
                  <td className="py-3 px-3 text-muted-foreground">31</td>
                  <td className="py-3 px-3 text-muted-foreground">5</td>
                  <td className="py-3 px-3">
                    <Badge variant="outline" className={cn("text-xs", gradeColor("B"))}>B</Badge>
                  </td>
                  <td className="py-3 pl-3" />
                </tr>

                {sorted.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{c.handle}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] h-4 py-0 px-1 gap-0.5", platformBadge[c.platform])}
                            >
                              <PlatformIcon platform={c.platform} size={10} branded />
                              {platformLabel[c.platform] ?? c.platform}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium">{c.followers.toLocaleString()}</td>
                    <td className="py-3 px-3"><ChangeCell value={c.followersChange} /></td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {c.avgViewers > 0 ? c.avgViewers.toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">{c.uploadsPerWeek}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className={cn("text-xs", gradeColor(c.grade))}>
                        {c.grade}
                      </Badge>
                    </td>
                    <td className="py-3 pl-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Growth chart ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Follower Growth (6 months)</CardTitle>
          <CardDescription>Compare your follower trajectory against tracked competitors.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                className="fill-muted-foreground"
              />
              <Tooltip
                formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {LINE_KEYS.filter((k) =>
                k === "you" || list.some((c) => c.name === k)
              ).map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key === "you" ? "You" : key}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={key === "you" ? 2.5 : 1.5}
                  dot={false}
                  strokeDasharray={key === "you" ? undefined : undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Competitor cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {list.map((c) => (
          <Card key={c.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.handle}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs shrink-0", gradeColor(c.grade))}>
                  {c.grade}
                </Badge>
              </div>

              <Badge
                variant="outline"
                className={cn("text-[10px] h-4 py-0 px-1.5 w-fit gap-0.5", platformBadge[c.platform])}
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
                  <p className="text-xs text-muted-foreground">7d growth</p>
                  <ChangeCell value={c.followersChange} />
                </div>
                {c.avgViewers > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Avg viewers</p>
                    <p className="font-semibold">{c.avgViewers.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Posts/wk</p>
                  <p className="font-semibold">{c.uploadsPerWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
