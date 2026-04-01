"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  useLiveStream,
  useStreamSessions,
  useStartStream,
  useEndStream,
  useRelayStatus,
  useStartRelay,
  useStopRelay,
  useStopRelayTarget,
} from "@/lib/hooks/use-stream";
import {
  isTauri,
  startMediamtx,
  stopMediamtx,
  getMediamtxStatus,
  connectStreamEngine,
  disconnectStreamEngine,
  getStreamEngineStatus,
} from "@/lib/hooks/use-tauri";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wifi, Eye, UserPlus, Scissors, Loader2, Radio, Plug, PlugZap, X } from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformLabel } from "@/lib/colors";
import { cn } from "@/lib/utils";

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const RTMP_PORT = 1935;
const API_PORT = 9997;
const SE_WS_URL = process.env.NEXT_PUBLIC_STREAM_ENGINE_WS_URL ?? "ws://localhost:3400/ws";
const CLOUD_RTMP_URL = process.env.NEXT_PUBLIC_RTMP_INGEST_URL ?? "rtmp://localhost:1935/live";

const MULTISTREAM_PLATFORMS = ["twitch", "youtube", "kick"] as const;

type PlatformKey = { platform: string; streamKey: string };

export default function StreamPage() {
  const [goingLive, setGoingLive] = useState(false);
  const [endStreamOpen, setEndStreamOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamPlatform] = useState("twitch");

  // Multistream: selected platforms + their stream keys
  const [multistreamOpen, setMultistreamOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(["twitch"]));
  const [streamKeys, setStreamKeys] = useState<Record<string, string>>({});

  // Desktop-only state
  const [relayRunning, setRelayRunning] = useState(false);
  const [relayLoading, setRelayLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    date: "",
    time: "",
    platform: "twitch",
  });

  // Real API
  const { data: liveStream } = useLiveStream();
  const { data: sessionsData, isLoading: sessionsLoading } = useStreamSessions();
  const startStreamMut = useStartStream();
  const endStreamMut = useEndStream();

  // Relay / multistream
  const { data: relayData } = useRelayStatus();
  const startRelayMut = useStartRelay();
  const stopRelayMut = useStopRelay();
  const stopTargetMut = useStopRelayTarget();

  const isLive = liveStream != null;
  const liveStreamId = liveStream?.id;
  const streamSessions = sessionsData?.data ?? [];

  // Sync desktop relay status on mount
  useEffect(() => {
    if (!isTauri) return;
    getMediamtxStatus().then((s) => {
      if (s) setRelayRunning(s.running);
    });
    getStreamEngineStatus().then((s) => {
      if (s) setWsConnected(s.connected);
    });
  }, []);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  const multistreamTargets: PlatformKey[] = [...selectedPlatforms]
    .filter((p) => streamKeys[p]?.trim())
    .map((p) => ({ platform: p, streamKey: streamKeys[p] }));

  // ── Go Live ───────────────────────────────────────────────────────────────

  async function handleGoLive() {
    setGoingLive(true);
    try {
      // 1. Start the local RTMP relay (desktop only)
      if (isTauri && !relayRunning) {
        const relay = await startMediamtx(RTMP_PORT, API_PORT);
        if (relay?.running) {
          setRelayRunning(true);
          toast.success("RTMP relay started");
        } else {
          toast.error("Failed to start RTMP relay — check mediamtx installation");
        }
      }

      // 2. Connect to stream-engine WebSocket (desktop only)
      if (isTauri) {
        const orgId = ""; // session?.user?.orgId — passed from page context in real impl
        const ws = await connectStreamEngine(`${SE_WS_URL}?org_id=${orgId}`);
        if (ws?.connected) setWsConnected(true);
      }

      // 3. Create stream session via API
      const relayedPlatforms = [...selectedPlatforms];
      startStreamMut.mutate(
        { title: streamTitle || undefined, platform: relayedPlatforms[0] ?? streamPlatform },
        {
          onSuccess: () => {
            toast.success("You are now live!");
            // 4. Start multistream relay if multiple platforms configured
            if (multistreamTargets.length > 0) {
              const sourceUrl = isTauri
                ? `rtmp://localhost:${RTMP_PORT}/live/wavestack`
                : `${CLOUD_RTMP_URL}/wavestack`;
              startRelayMut.mutate({
                sourceUrl,
                platforms: multistreamTargets,
              });
            }
          },
          onError: () => toast.info("Live locally — backend unreachable"),
          onSettled: () => setGoingLive(false),
        },
      );
    } catch (err) {
      console.error(err);
      setGoingLive(false);
    }
  }

  // ── End Stream ────────────────────────────────────────────────────────────

  async function handleEndStream() {
    try {
      // Stop multistream relay
      if (relayData?.active) {
        stopRelayMut.mutate();
      }

      // End stream via API
      if (liveStreamId) {
        endStreamMut.mutate(liveStreamId);
      }

      // Stop relay and WebSocket (desktop)
      if (isTauri) {
        await disconnectStreamEngine();
        setWsConnected(false);
        const relay = await stopMediamtx();
        if (relay) setRelayRunning(false);
      }

      setEndStreamOpen(false);
      toast.success("Stream ended. VOD is being processed.");
    } catch (err) {
      console.error(err);
      toast.error("Error ending stream");
    }
  }

  // ── Toggle relay manually (desktop) ──────────────────────────────────────

  async function handleToggleRelay() {
    setRelayLoading(true);
    try {
      if (relayRunning) {
        const s = await stopMediamtx();
        setRelayRunning(s?.running ?? false);
        toast.success("RTMP relay stopped");
      } else {
        const s = await startMediamtx(RTMP_PORT, API_PORT);
        setRelayRunning(s?.running ?? false);
        if (s?.running) toast.success(`RTMP relay started on port ${RTMP_PORT}`);
        else toast.error("Failed to start relay — is mediamtx installed?");
      }
    } finally {
      setRelayLoading(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleForm.title.trim() || !scheduleForm.date || !scheduleForm.time) return;
    setScheduleSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setScheduleSaving(false);
    setScheduleOpen(false);
    setScheduleForm({ title: "", date: "", time: "", platform: "twitch" });
    toast.success(`"${scheduleForm.title}" scheduled`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Stream Manager" description="Manage your live streams and VODs" />

      {/* Live status banner */}
      <Card className={isLive ? "border-green-500 bg-green-950/10" : "bg-muted/30"}>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {isLive ? (
              <>
                <span className="relative mt-1 flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                <div>
                  <Badge className="bg-green-600 text-white hover:bg-green-600">LIVE</Badge>
                  <p className="mt-1 text-sm text-muted-foreground">Stream is active</p>
                </div>
              </>
            ) : (
              <>
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-muted-foreground/40" />
                <div>
                  <p className="font-semibold">Currently Offline</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Ready to go live when you are.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Stream title + multistream config (pre-live) */}
          {!isLive && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Stream title…"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="h-8 w-44 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-sm"
                onClick={() => setMultistreamOpen(true)}
              >
                {[...selectedPlatforms].map((p) => (
                  <PlatformIcon key={p} platform={p} size={12} branded />
                ))}
                {selectedPlatforms.size === 0
                  ? "Select Platforms"
                  : `${selectedPlatforms.size} platform${selectedPlatforms.size > 1 ? "s" : ""}`}
              </Button>
            </div>
          )}

          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              Schedule
            </Button>
            {isLive ? (
              <Button size="sm" variant="destructive" onClick={() => setEndStreamOpen(true)}>
                End Stream
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={goingLive || startStreamMut.isPending}
                onClick={handleGoLive}
              >
                {(goingLive || startStreamMut.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                )}
                <Radio className="h-3.5 w-3.5 mr-1.5" />
                Go Live
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Desktop-only: RTMP relay + stream-engine status */}
      {isTauri && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PlugZap className="h-4 w-4" /> Desktop Relay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mediamtx status */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Local RTMP Relay</p>
                  <p className="text-xs text-muted-foreground">
                    {relayRunning ? `rtmp://localhost:${RTMP_PORT}/live` : "Not running"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      relayRunning ? "bg-green-500" : "bg-muted-foreground/40",
                    )}
                  />
                  <Button
                    size="sm"
                    variant={relayRunning ? "destructive" : "outline"}
                    className="h-7 text-xs"
                    disabled={relayLoading}
                    onClick={handleToggleRelay}
                  >
                    {relayLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    {relayRunning ? "Stop" : "Start"}
                  </Button>
                </div>
              </div>

              {/* Stream-engine connection */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Stream Engine</p>
                  <p className="text-xs text-muted-foreground">
                    {wsConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      wsConnected ? "bg-green-500" : "bg-muted-foreground/40",
                    )}
                  />
                  <Plug className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* RTMP ingest URL */}
            {relayRunning && (
              <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
                OBS / Streamlabs → Custom RTMP:{" "}
                <span className="text-foreground font-semibold">
                  rtmp://localhost:{RTMP_PORT}/live
                </span>
                <span className="ml-4">
                  Stream Key: <span className="text-foreground">wavestack</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stream health — only shown when live */}
      {isLive && liveStream && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            title="Platform"
            value={platformLabel[liveStream.platform] ?? liveStream.platform ?? "—"}
            icon={Wifi}
          />
          <StatCard title="Viewers" value={liveStream.peakViewerCount ?? 0} icon={Eye} />
          <StatCard title="New Followers" value={liveStream.newFollowers ?? 0} icon={UserPlus} />
          <StatCard title="Clips Created" value={liveStream.clipsCreated ?? 0} icon={Scissors} />
        </div>
      )}

      {/* Multistream relay status — shown when relay is active */}
      {relayData?.active && relayData.targets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-green-500" /> Multistream Relay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relayData.targets.map((t) => (
              <div
                key={t.platform}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={t.platform} size={16} branded />
                  <span className="text-sm font-medium">
                    {platformLabel[t.platform] ?? t.platform}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      t.status === "active" && "text-green-500 border-green-500/30",
                      t.status === "starting" && "text-yellow-500 border-yellow-500/30",
                      t.status === "failed" && "text-red-500 border-red-500/30",
                      t.status === "stopped" && "text-muted-foreground",
                    )}
                  >
                    {t.status}
                  </Badge>
                  {t.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => stopTargetMut.mutate(t.platform)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {relayData.source_url && (
              <p className="text-xs text-muted-foreground pt-1">
                Source: <span className="font-mono">{relayData.source_url}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cloud RTMP ingest info — shown when NOT using desktop app */}
      {!isTauri && !isLive && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-1">Console / Cloud Ingest</p>
            <p className="text-xs text-muted-foreground mb-2">
              Point your PS5, Xbox, or OBS to this RTMP URL. No PC required — WaveStack relays your
              stream to all selected platforms.
            </p>
            <div className="rounded-md bg-background px-3 py-2 text-xs font-mono text-muted-foreground border">
              RTMP URL: <span className="text-foreground font-semibold">{CLOUD_RTMP_URL}</span>
              <span className="ml-4">
                Stream Key: <span className="text-foreground">wavestack</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stream history */}
      <Card>
        <CardHeader>
          <CardTitle>Past Streams</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {sessionsLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3 animate-pulse">
                  <div className="h-4 w-48 rounded bg-muted flex-1" />
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : streamSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-6">
              No past streams yet. Go live to start building your history.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {streamSessions.map((stream, i) => (
                <div
                  key={stream.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-medium">
                      {stream.title ?? "Untitled stream"}
                    </span>
                    {stream.platform && (
                      <Badge variant="outline" className="shrink-0 text-xs gap-1">
                        <PlatformIcon platform={stream.platform} size={11} branded />
                        {platformLabel[stream.platform] ?? stream.platform}
                      </Badge>
                    )}
                  </div>
                  {stream.startedAt && (
                    <span className="w-14 shrink-0 text-muted-foreground">
                      {formatShortDate(stream.startedAt)}
                    </span>
                  )}
                  {stream.durationSeconds != null && (
                    <span className="w-16 shrink-0 text-muted-foreground">
                      {formatDuration(Math.round(stream.durationSeconds / 60))}
                    </span>
                  )}
                  {stream.peakViewerCount != null && (
                    <span className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {stream.peakViewerCount} peak
                    </span>
                  )}
                  {stream.avgViewerCount != null && (
                    <span className="w-20 shrink-0 text-muted-foreground">
                      {stream.avgViewerCount} avg
                    </span>
                  )}
                  {stream.newFollowers != null && (
                    <span className="flex w-16 shrink-0 items-center gap-1 text-muted-foreground">
                      <UserPlus className="h-3.5 w-3.5" />
                      {stream.newFollowers}
                    </span>
                  )}
                  {stream.clipsCreated != null && (
                    <span className="flex w-14 shrink-0 items-center gap-1 text-muted-foreground">
                      <Scissors className="h-3.5 w-3.5" />
                      {stream.clipsCreated}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toast.info(`Opening VOD: "${stream.title}"`)}
                  >
                    View VOD
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Stream Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a Stream</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="stream-title">Stream Title</Label>
              <Input
                id="stream-title"
                placeholder="e.g., Friday Night Gaming Session"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stream-date">Date</Label>
                <Input
                  id="stream-date"
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stream-time">Time</Label>
                <Input
                  id="stream-time"
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={scheduleForm.platform}
                onValueChange={(v) => setScheduleForm((p) => ({ ...p, platform: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitch">
                    <span className="flex items-center gap-1.5">
                      <PlatformIcon platform="twitch" size={13} branded /> Twitch
                    </span>
                  </SelectItem>
                  <SelectItem value="youtube">
                    <span className="flex items-center gap-1.5">
                      <PlatformIcon platform="youtube" size={13} branded /> YouTube
                    </span>
                  </SelectItem>
                  <SelectItem value="kick">
                    <span className="flex items-center gap-1.5">
                      <PlatformIcon platform="kick" size={13} branded /> Kick
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={
                scheduleSaving ||
                !scheduleForm.title.trim() ||
                !scheduleForm.date ||
                !scheduleForm.time
              }
            >
              {scheduleSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multistream Platform Setup Dialog */}
      <Dialog open={multistreamOpen} onOpenChange={setMultistreamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Multistream Setup</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select platforms and enter your stream keys. WaveStack will broadcast to all of them
            simultaneously.
          </p>
          <div className="space-y-3 py-2">
            {MULTISTREAM_PLATFORMS.map((p) => {
              const active = selectedPlatforms.has(p);
              return (
                <div key={p} className="space-y-2">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    )}
                    onClick={() => togglePlatform(p)}
                  >
                    <PlatformIcon platform={p} size={20} branded />
                    <span className="flex-1 text-sm font-medium">{platformLabel[p] ?? p}</span>
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border-2 transition-colors",
                        active ? "bg-primary border-primary" : "border-muted-foreground/40",
                      )}
                    />
                  </button>
                  {active && (
                    <Input
                      placeholder={`${platformLabel[p] ?? p} stream key`}
                      value={streamKeys[p] ?? ""}
                      onChange={(e) => setStreamKeys((prev) => ({ ...prev, [p]: e.target.value }))}
                      className="h-8 text-xs font-mono ml-8"
                      type="password"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMultistreamOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setMultistreamOpen(false)}>
              Save ({selectedPlatforms.size} platform{selectedPlatforms.size !== 1 ? "s" : ""})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Stream Confirmation */}
      <AlertDialog open={endStreamOpen} onOpenChange={setEndStreamOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End stream?</AlertDialogTitle>
            <AlertDialogDescription>
              Your stream will go offline immediately. A VOD will be generated and available within
              a few minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Streaming</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndStream}
              disabled={endStreamMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {endStreamMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              End Stream
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
