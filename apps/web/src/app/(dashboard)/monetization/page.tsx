"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  revenueStats,
  revenueHistory,
  partnerEligibility,
  sponsors as initialSponsors,
} from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  TrendingUp,
  BarChart3,
  Users,
  Heart,
  Handshake,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { Sensitive } from "@/lib/streamer-mode";

type Sponsor = (typeof initialSponsors)[number];

const revenueConfig = {
  ads:       { label: "Ad Revenue",    color: "hsl(var(--chart-1))" },
  subs:      { label: "Subscriptions", color: "hsl(var(--chart-2))" },
  donations: { label: "Donations",     color: "hsl(var(--chart-3))" },
  sponsors:  { label: "Sponsorships",  color: "hsl(var(--chart-4))" },
  merch:     { label: "Merchandise",   color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

function fmt(n: number) {
  return "$" + n.toLocaleString();
}

function progressPct(current: number, target: number) {
  return Math.min(Math.round((current / target) * 100), 100);
}

function fmtVal(current: number, target: number, unit: string) {
  if (unit === "") return `${current.toLocaleString()} / ${target.toLocaleString()}`;
  return `${current.toLocaleString()} / ${target.toLocaleString()} ${unit}`;
}

export default function MonetizationPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [addOpen, setAddOpen] = useState(false);
  const [detailSponsor, setDetailSponsor] = useState<Sponsor | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    dealValue: "",
    deliverables: "",
    status: "negotiating",
  });

  async function handleAdd() {
    if (!form.name.trim() || !form.dealValue) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const newSponsor: Sponsor = {
      id: `sp-${Date.now()}`,
      name: form.name,
      logo: form.name.slice(0, 2).toUpperCase(),
      dealValue: Number(form.dealValue),
      deliverables: form.deliverables || "TBD",
      status: form.status as Sponsor["status"],
      nextDeadline: null,
      contactEmail: "",
    };
    setSponsors((prev) => [newSponsor, ...prev]);
    setSaving(false);
    setAddOpen(false);
    setForm({ name: "", dealValue: "", deliverables: "", status: "negotiating" });
    toast.success(`${newSponsor.name} added as sponsor`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monetization"
        description="Revenue tracking and partner eligibility"
      />

      {/* Revenue stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Monthly Revenue" value={fmt(revenueStats.totalMonthly)} change={revenueStats.monthlyChange} trend="up" icon={TrendingUp} />
        <StatCard title="Ad Revenue"      value={fmt(revenueStats.adRevenue)}    icon={BarChart3} />
        <StatCard title="Subscriptions"   value={fmt(revenueStats.subscriptions)} icon={Users} />
        <StatCard title="Donations"       value={fmt(revenueStats.donations)}    icon={Heart} />
        <StatCard title="Sponsorships"    value={fmt(revenueStats.sponsorships)} icon={Handshake} />
      </div>

      {/* Revenue over time chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Last 6 months by source</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-64 w-full">
            <AreaChart data={revenueHistory} margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
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
        </CardContent>
      </Card>

      {/* Partner eligibility tracker */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Platform Monetization Eligibility</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {partnerEligibility.map((prog, idx) => (
            <Card
              key={idx}
              className={`border-l-4 ${prog.unlocked ? "border-l-green-500" : "border-l-muted"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{prog.program}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <PlatformIcon platform={prog.platform.toLowerCase()} size={14} branded />
                      {prog.platform}
                    </CardDescription>
                  </div>
                  {prog.unlocked ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                      Unlocked ✓
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Locked
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {prog.requirements.map((req) => (
                  <div key={req.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{req.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{fmtVal(req.current, req.target, req.unit)}</span>
                        {req.met ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                    <Progress
                      value={progressPct(req.current, req.target)}
                      className={req.met ? "[&>div]:bg-green-500" : ""}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
          {sponsors.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs font-bold">{s.logo}</AvatarFallback>
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
                <p className="text-xs text-muted-foreground truncate">{s.deliverables}</p>
                {s.nextDeadline && (
                  <p className="text-xs text-muted-foreground">
                    Due:{" "}
                    {new Date(s.nextDeadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm"><Sensitive>{fmt(s.dealValue)}</Sensitive></p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDetailSponsor(s)}>
                Details
              </Button>
            </div>
          ))}
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
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.dealValue}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                <AvatarFallback className="text-xs font-bold">{detailSponsor?.logo}</AvatarFallback>
              </Avatar>
              {detailSponsor?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Deal Value</p>
                <p className="font-semibold text-lg"><Sensitive>{detailSponsor && fmt(detailSponsor.dealValue)}</Sensitive><span className="text-xs font-normal text-muted-foreground">/mo</span></p>
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
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Deliverables</p>
              <p className="text-muted-foreground">{detailSponsor?.deliverables}</p>
            </div>
            {detailSponsor?.nextDeadline && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Deadline</p>
                <p>
                  {new Date(detailSponsor.nextDeadline).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailSponsor(null)}>Close</Button>
            <Button onClick={() => { setDetailSponsor(null); toast.info("Opening sponsor contract..."); }}>
              View Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
