"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Zap,
  Bell,
  Users,
  Target,
  MessageSquare,
  Trophy,
  Copy,
  ExternalLink,
  Settings2,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Overlay definitions ────────────────────────────────────────────────────

const BASE_URL = "https://overlay.wavestack.io";

type OverlayId = "alerts" | "goal" | "chat" | "recent_events" | "leaderboard" | "ticker";

type Overlay = {
  id: OverlayId;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  enabled: boolean;
  path: string;
};

const INITIAL_OVERLAYS: Overlay[] = [
  {
    id: "alerts",
    label: "Alert Box",
    description: "Animated follower, subscriber, raid, and donation alerts.",
    icon: Bell,
    color: "text-purple-500",
    enabled: true,
    path: "/alerts/abc123",
  },
  {
    id: "goal",
    label: "Subscriber Goal",
    description: "Animated progress bar toward your next subscriber milestone.",
    icon: Target,
    color: "text-blue-500",
    enabled: true,
    path: "/goal/abc123",
  },
  {
    id: "chat",
    label: "Chat Overlay",
    description: "Display recent chat messages on screen without OBS chat.",
    icon: MessageSquare,
    color: "text-green-500",
    enabled: false,
    path: "/chat/abc123",
  },
  {
    id: "recent_events",
    label: "Recent Events",
    description: "Scrolling ticker of subs, follows, cheers, and raids.",
    icon: Zap,
    color: "text-yellow-500",
    enabled: true,
    path: "/events/abc123",
  },
  {
    id: "leaderboard",
    label: "Top Supporters",
    description: "Real-time leaderboard of top gifters or cheerers.",
    icon: Trophy,
    color: "text-orange-500",
    enabled: false,
    path: "/leaderboard/abc123",
  },
  {
    id: "ticker",
    label: "Info Ticker",
    description: "Scrolling bottom bar with custom text or social links.",
    icon: Users,
    color: "text-cyan-500",
    enabled: false,
    path: "/ticker/abc123",
  },
];

// ── Alert style config ──────────────────────────────────────────────────────

type AlertConfig = {
  theme: string;
  animation: string;
  duration: string;
  sound: string;
};

const ALERT_DEFAULTS: AlertConfig = {
  theme: "dark",
  animation: "slide",
  duration: "5",
  sound: "chime",
};

// ── Goal config ─────────────────────────────────────────────────────────────

type GoalConfig = {
  current: string;
  target: string;
  label: string;
  color: string;
};

const GOAL_DEFAULTS: GoalConfig = {
  current: "142",
  target: "200",
  label: "Subscribers",
  color: "blue",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function OverlaysPage() {
  const [overlays, setOverlays] = useState<Overlay[]>(INITIAL_OVERLAYS);
  const [configOverlay, setConfigOverlay] = useState<Overlay | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(ALERT_DEFAULTS);
  const [goalConfig, setGoalConfig] = useState<GoalConfig>(GOAL_DEFAULTS);
  const [saving, setSaving] = useState(false);

  function toggleOverlay(id: OverlayId) {
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, enabled: !o.enabled }
          : o
      )
    );
    const overlay = overlays.find((o) => o.id === id);
    if (overlay) {
      toast.success(`${overlay.label} ${overlay.enabled ? "disabled" : "enabled"}`);
    }
  }

  function copyUrl(overlay: Overlay) {
    const url = `${BASE_URL}${overlay.path}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Browser source URL copied");
    });
  }

  function openPreview(overlay: Overlay) {
    toast.info(`Opening preview for ${overlay.label}…`);
  }

  async function saveConfig() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setConfigOverlay(null);
    toast.success(`${configOverlay?.label} settings saved`);
  }

  const enabledCount = overlays.filter((o) => o.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stream Overlays"
        description="Browser source URLs for OBS, Streamlabs, or any streaming software"
      />

      {/* OBS instructions banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-5 py-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-blue-500" />
          How to use overlays in OBS
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>In OBS, add a new <strong>Browser Source</strong></li>
          <li>Copy the URL from any overlay below</li>
          <li>Paste it into the URL field, set width/height to match your stream resolution</li>
          <li>Enable the overlay here — changes apply instantly without restarting OBS</li>
        </ol>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Overlays",  value: enabledCount },
          { label: "Total Overlays",   value: overlays.length },
          { label: "Resolution",       value: "1920×1080" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overlay cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overlays.map((overlay) => (
          <Card
            key={overlay.id}
            className={cn(
              "transition-colors",
              overlay.enabled ? "border-l-4 border-l-green-500" : "border-l-4 border-l-muted"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    overlay.enabled ? "bg-primary/10" : "bg-muted"
                  )}>
                    <overlay.icon className={cn("h-4 w-4", overlay.enabled ? overlay.color : "text-muted-foreground")} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{overlay.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{overlay.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={overlay.enabled}
                  onCheckedChange={() => toggleOverlay(overlay.id)}
                  aria-label={`Toggle ${overlay.label}`}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Browser source URL */}
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
                  {BASE_URL}{overlay.path}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyUrl(overlay)}
                  title="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => openPreview(overlay)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
                {(overlay.id === "alerts" || overlay.id === "goal") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setConfigOverlay(overlay)}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    Configure
                  </Button>
                )}
                <Badge
                  variant="outline"
                  className={overlay.enabled
                    ? "ml-auto text-xs text-green-400 border-green-400/30"
                    : "ml-auto text-xs text-muted-foreground"
                  }
                >
                  {overlay.enabled ? "Live" : "Disabled"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Box config dialog */}
      <Dialog
        open={configOverlay?.id === "alerts"}
        onOpenChange={(open: boolean) => !open && setConfigOverlay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Alert Box</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={alertConfig.theme} onValueChange={(v) => setAlertConfig((p) => ({ ...p, theme: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Animation</Label>
                <Select value={alertConfig.animation} onValueChange={(v) => setAlertConfig((p) => ({ ...p, animation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slide">Slide in</SelectItem>
                    <SelectItem value="bounce">Bounce</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="pop">Pop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={alertConfig.duration}
                  onChange={(e) => setAlertConfig((p) => ({ ...p, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Alert Sound</Label>
                <Select value={alertConfig.sound} onValueChange={(v) => setAlertConfig((p) => ({ ...p, sound: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="fanfare">Fanfare</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOverlay(null)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscriber Goal config dialog */}
      <Dialog
        open={configOverlay?.id === "goal"}
        onOpenChange={(open: boolean) => !open && setConfigOverlay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Subscriber Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current count</Label>
                <Input
                  type="number"
                  value={goalConfig.current}
                  onChange={(e) => setGoalConfig((p) => ({ ...p, current: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Input
                  type="number"
                  value={goalConfig.target}
                  onChange={(e) => setGoalConfig((p) => ({ ...p, target: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Label text</Label>
              <Input
                value={goalConfig.label}
                onChange={(e) => setGoalConfig((p) => ({ ...p, label: e.target.value }))}
                placeholder="Subscribers"
              />
            </div>
            <div className="space-y-2">
              <Label>Bar colour</Label>
              <Select value={goalConfig.color} onValueChange={(v) => setGoalConfig((p) => ({ ...p, color: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Live preview bar */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <div className="flex items-center justify-between text-sm">
                <span>{goalConfig.label}</span>
                <span className="font-bold">{goalConfig.current} / {goalConfig.target}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      Math.round((Number(goalConfig.current) / Math.max(Number(goalConfig.target), 1)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOverlay(null)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
