"use client";

import { useState } from "react";
import { toast } from "sonner";
import { streamStatus, streamHealth, streamHistory } from "@/lib/mock-data";
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
import { Wifi, AlertTriangle, Cpu, Film, Eye, UserPlus, Scissors, Loader2 } from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformLabel } from "@/lib/colors";

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function StreamPage() {
  const [isLive, setIsLive]         = useState(streamStatus.isLive);
  const [goingLive, setGoingLive]   = useState(false);
  const [endStreamOpen, setEndStreamOpen] = useState(false);
  const [endingStream, setEndingStream]   = useState(false);
  const [scheduleOpen, setScheduleOpen]   = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    date: "",
    time: "",
    platform: "twitch",
  });

  async function handleGoLive() {
    setGoingLive(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLive(true);
    setGoingLive(false);
    toast.success("You are now live! 🎉");
  }

  async function handleEndStream() {
    setEndingStream(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsLive(false);
    setEndingStream(false);
    setEndStreamOpen(false);
    toast.success("Stream ended. VOD is being processed.");
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

  function handleViewVOD(title: string) {
    toast.info(`Opening VOD: "${title}"`);
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
                    Next:{" "}
                    <span className="font-medium text-foreground">{streamStatus.nextStreamTitle}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(streamStatus.nextStreamAt)}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              Schedule Stream
            </Button>
            {isLive ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setEndStreamOpen(true)}
              >
                End Stream
              </Button>
            ) : (
              <Button size="sm" disabled={goingLive} onClick={handleGoLive}>
                {goingLive && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                {goingLive ? "Going live..." : "Go Live"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stream health */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Bitrate"        value={`${streamHealth.bitrate} kbps`}    icon={Wifi} />
        <StatCard title="Dropped Frames" value={`${streamHealth.droppedFrames}%`}  icon={AlertTriangle} />
        <StatCard title="CPU Usage"      value={`${streamHealth.cpuUsage}%`}       icon={Cpu} />
        <StatCard title="FPS"            value={`${streamHealth.encoderFps} fps`}  icon={Film} />
      </div>

      {/* Stream history */}
      <Card>
        <CardHeader><CardTitle>Past Streams</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="divide-y divide-border">
            {streamHistory.map((stream, i) => (
              <div
                key={stream.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 text-sm ${i % 2 === 0 ? "bg-muted/20" : ""}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium">{stream.title}</span>
                  <Badge variant="outline" className="shrink-0 text-xs gap-1">
                    <PlatformIcon platform={stream.platform} size={11} branded />
                    {platformLabel[stream.platform] ?? stream.platform}
                  </Badge>
                </div>
                <span className="w-14 shrink-0 text-muted-foreground">{formatShortDate(stream.startedAt)}</span>
                <span className="w-16 shrink-0 text-muted-foreground">{formatDuration(stream.duration)}</span>
                <span className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />{stream.peakViewers} peak
                </span>
                <span className="w-20 shrink-0 text-muted-foreground">{stream.avgViewers} avg</span>
                <span className="flex w-16 shrink-0 items-center gap-1 text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />{stream.newFollowers}
                </span>
                <span className="flex w-14 shrink-0 items-center gap-1 text-muted-foreground">
                  <Scissors className="h-3.5 w-3.5" />{stream.clipsCreated}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleViewVOD(stream.title)}
                >
                  View VOD
                </Button>
              </div>
            ))}
          </div>
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
                    <span className="flex items-center gap-1.5"><PlatformIcon platform="twitch" size={13} branded /> Twitch</span>
                  </SelectItem>
                  <SelectItem value="youtube">
                    <span className="flex items-center gap-1.5"><PlatformIcon platform="youtube" size={13} branded /> YouTube</span>
                  </SelectItem>
                  <SelectItem value="kick">
                    <span className="flex items-center gap-1.5"><PlatformIcon platform="kick" size={13} branded /> Kick</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSchedule}
              disabled={scheduleSaving || !scheduleForm.title.trim() || !scheduleForm.date || !scheduleForm.time}
            >
              {scheduleSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
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
              Your stream will go offline immediately. A VOD will be generated and available within a few minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Streaming</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndStream}
              disabled={endingStream}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {endingStream && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              End Stream
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
