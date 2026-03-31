"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  useRevenueOverview,
  useRevenueHistory,
  useSponsors,
  useCreateSponsor,
} from "@/lib/hooks/use-revenue";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { TrendingUp, BarChart3, Users, Heart, Handshake, Loader2, Plus } from "lucide-react";
import { Sensitive } from "@/lib/streamer-mode";

const revenueConfig = {
  ads: { label: "Ad Revenue", color: "hsl(var(--chart-1))" },
  subs: { label: "Subscriptions", color: "hsl(var(--chart-2))" },
  donations: { label: "Donations", color: "hsl(var(--chart-3))" },
  sponsors: { label: "Sponsorships", color: "hsl(var(--chart-4))" },
  merch: { label: "Merchandise", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-2 animate-pulse">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="h-7 w-16 rounded bg-muted" />
    </div>
  );
}

function SponsorSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
      <div className="h-5 w-16 rounded bg-muted shrink-0" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MonetizationPage() {
  const { data: overview, isLoading: overviewLoading } = useRevenueOverview();
  const { data: historyData, isLoading: historyLoading } = useRevenueHistory(6);
  const { data: sponsorsData, isLoading: sponsorsLoading, isError: sponsorsError } = useSponsors();
  const createSponsor = useCreateSponsor();

  const sponsors = sponsorsData?.data ?? [];
  const history = historyData ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [detailSponsor, setDetailSponsor] = useState<(typeof sponsors)[number] | null>(null);

  const [form, setForm] = useState({
    name: "",
    dealValue: "",
    deliverables: "",
    status: "negotiating",
  });

  function handleAdd() {
    if (!form.name.trim() || !form.dealValue) return;
    createSponsor.mutate(
      {
        name: form.name,
        dealValue: Number(form.dealValue),
        deliverables: [],
        status: form.status as "prospecting" | "negotiating" | "active" | "completed" | "cancelled",
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setForm({ name: "", dealValue: "", deliverables: "", status: "negotiating" });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Monetization" description="Revenue tracking and sponsor management" />

      {/* Revenue stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {overviewLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Monthly Revenue"
              value={fmt(overview?.month)}
              trend="up"
              icon={TrendingUp}
            />
            <StatCard title="Today" value={fmt(overview?.today)} icon={BarChart3} />
            <StatCard title="Forecast" value={fmt(overview?.forecast)} icon={Users} />
            <StatCard title="All Time" value={fmt(overview?.allTime)} icon={Heart} />
            <StatCard
              title="Sponsorships"
              value={fmt(overview?.breakdown?.sponsorships)}
              icon={Handshake}
            />
          </>
        )}
      </div>

      {/* Revenue over time chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Last 6 months by source</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="h-64 w-full rounded bg-muted/30 animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading chart…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No revenue data yet. Connect your platforms to start tracking.
            </div>
          ) : (
            <ChartContainer config={revenueConfig} className="h-64 w-full">
              <AreaChart data={history} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {(["ads", "subs", "donations", "sponsors", "merch"] as const).map((key, i) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={`hsl(var(--chart-${i + 1}))`}
                    fill={`hsl(var(--chart-${i + 1}))`}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sponsors &amp; Deals</CardTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Sponsor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sponsorsError ? (
            <EmptyState preset="offline" subtitle="Could not load sponsors." size="sm" />
          ) : sponsorsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SponsorSkeleton key={i} />)
          ) : sponsors.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No sponsors yet. Add your first sponsor deal above.
            </div>
          ) : (
            sponsors.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-bold">
                    {(s.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{s.name}</span>
                    <Badge
                      variant="outline"
                      className={
                        s.status === "active"
                          ? "text-green-500 border-green-500/30"
                          : "text-yellow-500 border-yellow-500/30"
                      }
                    >
                      {s.status}
                    </Badge>
                  </div>
                  {s.deliverables?.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {s.deliverables.length} deliverable{s.deliverables.length > 1 ? "s" : ""}
                    </p>
                  )}
                  {s.endDate && (
                    <p className="text-xs text-muted-foreground">
                      Ends:{" "}
                      {new Date(s.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    <Sensitive>{fmt(s.dealValue)}</Sensitive>
                  </p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetailSponsor(s)}>
                  Details
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Sponsor Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sponsor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sp-name">Company Name</Label>
              <Input
                id="sp-name"
                placeholder="e.g., Acme Corp"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-value">Deal Value ($/month)</Label>
              <Input
                id="sp-value"
                type="number"
                placeholder="500"
                value={form.dealValue}
                onChange={(e) => setForm((p) => ({ ...p, dealValue: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-deliverables">Deliverables</Label>
              <Textarea
                id="sp-deliverables"
                placeholder="e.g., 2 dedicated videos/month, social mentions..."
                rows={3}
                value={form.deliverables}
                onChange={(e) => setForm((p) => ({ ...p, deliverables: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={createSponsor.isPending || !form.name.trim() || !form.dealValue}
            >
              {createSponsor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Sponsor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sponsor Detail Dialog */}
      <Dialog open={!!detailSponsor} onOpenChange={(o) => !o && setDetailSponsor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-bold">
                  {(detailSponsor?.name ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {detailSponsor?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Deal Value</p>
                <p className="font-semibold text-lg">
                  <Sensitive>{detailSponsor && fmt(detailSponsor.dealValue)}</Sensitive>
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge
                  variant="outline"
                  className={
                    detailSponsor?.status === "active"
                      ? "text-green-500 border-green-500/30"
                      : "text-yellow-500 border-yellow-500/30"
                  }
                >
                  {detailSponsor?.status}
                </Badge>
              </div>
            </div>
            {detailSponsor?.deliverables && detailSponsor.deliverables.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Deliverables
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-4">
                  {detailSponsor.deliverables.map((d) => (
                    <li key={d.id}>{d.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailSponsor?.endDate && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">End Date</p>
                <p>
                  {new Date(detailSponsor.endDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailSponsor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
