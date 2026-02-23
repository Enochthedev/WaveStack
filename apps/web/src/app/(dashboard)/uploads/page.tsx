"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Upload,
  CloudUpload,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  HardDrive,
  Clock,
  Zap,
  Youtube,
  Twitch,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type UploadStatus = "uploading" | "processing" | "complete" | "failed" | "queued";

type PlatformJob = {
  platform: string;
  status: UploadStatus;
  progress: number;
  eta: string | null;
};

type CloudJob = {
  id: string;
  filename: string;
  sizeBytes: number;
  cloudProgress: number; // 0–100 (upload to WaveStack)
  cloudStatus: UploadStatus;
  startedAt: string;
  platforms: PlatformJob[];
};

// ── Mock seed data ─────────────────────────────────────────────────────────

const SEED_JOBS: CloudJob[] = [
  {
    id: "j1",
    filename: "stream-2026-02-22.mp4",
    sizeBytes: 4_800_000_000,
    cloudProgress: 100,
    cloudStatus: "complete",
    startedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    platforms: [
      { platform: "youtube",  status: "processing", progress: 62, eta: "4m" },
      { platform: "twitch",   status: "complete",   progress: 100, eta: null },
    ],
  },
  {
    id: "j2",
    filename: "tutorial-react-2026.mp4",
    sizeBytes: 1_200_000_000,
    cloudProgress: 71,
    cloudStatus: "uploading",
    startedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    platforms: [
      { platform: "youtube",  status: "queued", progress: 0, eta: null },
      { platform: "tiktok",   status: "queued", progress: 0, eta: null },
    ],
  },
];

const COMPLETED_JOBS: CloudJob[] = [
  {
    id: "done1",
    filename: "vlog-feb-18.mp4",
    sizeBytes: 2_100_000_000,
    cloudProgress: 100,
    cloudStatus: "complete",
    startedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    platforms: [
      { platform: "youtube", status: "complete", progress: 100, eta: null },
      { platform: "twitch",  status: "complete", progress: 100, eta: null },
    ],
  },
  {
    id: "done2",
    filename: "speedrun-highlight.mp4",
    sizeBytes: 890_000_000,
    cloudProgress: 100,
    cloudStatus: "complete",
    startedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    platforms: [
      { platform: "youtube", status: "complete", progress: 100, eta: null },
      { platform: "tiktok",  status: "complete", progress: 100, eta: null },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBytes(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + " MB";
  return (n / 1e3).toFixed(0) + " KB";
}

function relTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube",  color: "text-red-500"    },
  twitch:  { label: "Twitch",   color: "text-purple-500" },
  tiktok:  { label: "TikTok",   color: "text-pink-500"   },
  instagram:{ label: "Instagram", color: "text-orange-500" },
};

const PLATFORMS = ["youtube", "twitch", "tiktok"];

function statusBadge(status: UploadStatus) {
  const map: Record<UploadStatus, { label: string; className: string }> = {
    uploading:  { label: "Uploading",  className: "text-blue-400 border-blue-500/30" },
    processing: { label: "Processing", className: "text-yellow-400 border-yellow-500/30" },
    complete:   { label: "Done",       className: "text-green-400 border-green-500/30" },
    failed:     { label: "Failed",     className: "text-destructive border-destructive/30" },
    queued:     { label: "Queued",     className: "text-muted-foreground" },
  };
  const { label, className } = map[status];
  return <Badge variant="outline" className={`text-xs ${className}`}>{label}</Badge>;
}

// ── Storage mock ────────────────────────────────────────────────────────────

const STORAGE_USED_GB = 48.3;
const STORAGE_TOTAL_GB = 100;

// ── Page ───────────────────────────────────────────────────────────────────

export default function UploadsPage() {
  const [jobs, setJobs] = useState<CloudJob[]>(SEED_JOBS);
  const [completedJobs] = useState<CloudJob[]>(COMPLETED_JOBS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube"]);
  const [uploading, setUploading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CloudJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate upload progress ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.cloudStatus === "uploading") {
            const next = Math.min(job.cloudProgress + Math.random() * 3, 100);
            return {
              ...job,
              cloudProgress: next,
              cloudStatus: next >= 100 ? "complete" : "uploading",
            };
          }
          if (job.cloudStatus === "complete") {
            return {
              ...job,
              platforms: job.platforms.map((p) => {
                if (p.status === "processing") {
                  const next = Math.min(p.progress + Math.random() * 2, 100);
                  return {
                    ...p,
                    progress: next,
                    status: next >= 100 ? "complete" : "processing",
                    eta: next >= 100 ? null : p.eta,
                  };
                }
                if (p.status === "queued" && job.cloudStatus === "complete") {
                  const firstQueued = job.platforms.find((x) => x.status === "queued");
                  if (firstQueued?.platform === p.platform) {
                    return { ...p, status: "processing" };
                  }
                }
                return p;
              }),
            };
          }
          return job;
        })
      );
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleUpload() {
    if (!selectedFile || selectedPlatforms.length === 0) return;
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1000));

    const newJob: CloudJob = {
      id: `j-${Date.now()}`,
      filename: selectedFile.name,
      sizeBytes: selectedFile.size || 800_000_000,
      cloudProgress: 0,
      cloudStatus: "uploading",
      startedAt: new Date().toISOString(),
      platforms: selectedPlatforms.map((p) => ({
        platform: p,
        status: "queued",
        progress: 0,
        eta: null,
      })),
    };

    setJobs((prev) => [newJob, ...prev]);
    setUploading(false);
    setUploadOpen(false);
    setSelectedFile(null);
    setSelectedPlatforms(["youtube"]);
    toast.success(`"${selectedFile.name}" queued — WaveStack will handle the rest`);
  }

  function handleCancel() {
    if (!cancelTarget) return;
    setJobs((prev) => prev.filter((j) => j.id !== cancelTarget.id));
    toast.success(`Upload cancelled`);
    setCancelTarget(null);
  }

  const activeJobs = jobs.filter(
    (j) => j.cloudStatus !== "complete" || j.platforms.some((p) => p.status !== "complete")
  );
  const finishedJobs = jobs.filter(
    (j) => j.cloudStatus === "complete" && j.platforms.every((p) => p.status === "complete")
  );

  const storagePct = Math.round((STORAGE_USED_GB / STORAGE_TOTAL_GB) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Uploads"
        description="Upload once — WaveStack handles every platform while your machine stays free"
      >
        <Button onClick={() => setUploadOpen(true)}>
          <CloudUpload className="h-4 w-4 mr-2" />
          Upload VOD
        </Button>
      </PageHeader>

      {/* Value prop banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Zero impact on your machine</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              WaveStack uploads to YouTube, Twitch, TikTok server-side. Uploading a 4 GB VOD locally takes ~40 min of bandwidth. We do it in the background — no CPU, no GPU, no network saturation.
            </p>
          </div>
        </div>
        <div className="flex gap-6 shrink-0 text-center">
          <div>
            <p className="text-xl font-bold text-green-500">0%</p>
            <p className="text-xs text-muted-foreground">Your CPU</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-500">0%</p>
            <p className="text-xs text-muted-foreground">Your GPU</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{activeJobs.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </div>
      </div>

      {/* Storage */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Cloud Storage
            </div>
            <span className="text-xs text-muted-foreground">
              {STORAGE_USED_GB} GB / {STORAGE_TOTAL_GB} GB used
            </span>
          </div>
          <Progress value={storagePct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {STORAGE_TOTAL_GB - STORAGE_USED_GB} GB remaining — files are kept for 30 days after publishing
          </p>
        </CardContent>
      </Card>

      {/* Active uploads */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              Active Uploads
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeJobs.map((job) => (
              <div key={job.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{job.filename}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtBytes(job.sizeBytes)} · Started {relTime(job.startedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(job.cloudStatus)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setCancelTarget(job)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Cloud upload progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CloudUpload className="h-3 w-3" />
                      WaveStack Cloud
                    </span>
                    <span>{Math.round(job.cloudProgress)}%</span>
                  </div>
                  <Progress value={job.cloudProgress} className="h-1.5" />
                </div>

                {/* Per-platform progress */}
                <div className="pl-4 border-l-2 border-border space-y-2">
                  {job.platforms.map((p) => {
                    const meta = PLATFORM_META[p.platform] ?? { label: p.platform, color: "text-foreground" };
                    return (
                      <div key={p.platform} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-medium", meta.color)}>{meta.label}</span>
                          <div className="flex items-center gap-2">
                            {p.eta && <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{p.eta}</span>}
                            {statusBadge(p.status)}
                          </div>
                        </div>
                        <Progress
                          value={p.progress}
                          className={cn(
                            "h-1",
                            p.status === "complete" && "[&>div]:bg-green-500",
                            p.status === "queued" && "opacity-40"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Finished (from active jobs that just completed) */}
      {finishedJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Just Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {finishedJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-4 py-1">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.filename}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {job.platforms.map((p) => (
                      <span key={p.platform} className={cn("text-xs font-medium", PLATFORM_META[p.platform]?.color)}>
                        {PLATFORM_META[p.platform]?.label ?? p.platform} ✓
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{relTime(job.startedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload history */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {completedJobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 py-2 border-b last:border-0">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{job.filename}</p>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {job.platforms.map((p) => (
                    <span key={p.platform} className={cn("text-xs", PLATFORM_META[p.platform]?.color)}>
                      {PLATFORM_META[p.platform]?.label ?? p.platform}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{fmtBytes(job.sizeBytes)}</span>
              <span className="text-xs text-muted-foreground shrink-0">{relTime(job.startedAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Drop zone hint when nothing active */}
      {activeJobs.length === 0 && finishedJobs.length === 0 && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) { setSelectedFile(f); setUploadOpen(true); }
          }}
          onClick={() => setUploadOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setUploadOpen(true)}
        >
          <CloudUpload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Drop a VOD here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, MKV up to 100 GB · WaveStack handles the rest</p>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open: boolean) => { if (!uploading) { setUploadOpen(open); if (!open) setSelectedFile(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload VOD to Cloud</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* File picker */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setSelectedFile(f);
              }}
            >
              <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtBytes(selectedFile.size)}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Click to browse or drag a file</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, MKV, WEBM up to 100 GB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }}
              />
            </div>

            {/* Platform selection */}
            <div className="space-y-2">
              <Label>Publish to</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const meta = PLATFORM_META[p]!;
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <span className={active ? "text-primary" : meta.color}>{meta.label}</span>
                      {active && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                WaveStack uploads to each platform server-side — your bandwidth is untouched.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); setSelectedFile(null); }} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || selectedPlatforms.length === 0}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
              {uploading ? "Queuing…" : "Upload to Cloud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open: boolean) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel upload?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{cancelTarget?.filename}&rdquo; will be removed from the cloud queue. Any partial uploads to platforms will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Uploading</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
