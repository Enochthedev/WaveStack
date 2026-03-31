"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useWorkflows,
  useWorkflowRuns,
  useRunWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useCreateWorkflow,
} from "@/lib/hooks/use-workflows";
// Static workflow template catalog (not user data)
const WORKFLOW_TEMPLATES = [
  {
    id: "t1",
    name: "Clip & Ship",
    description: "Auto-clip highlight → thumbnail → caption → post to TikTok + Shorts",
    trigger: "clip_ready",
    steps: 4,
    installs: 234,
  },
  {
    id: "t2",
    name: "Stream Recap",
    description: "Stream ends → summary → highlight reel → recap thread",
    trigger: "stream_end",
    steps: 5,
    installs: 189,
  },
  {
    id: "t3",
    name: "Trend Surfer",
    description: "Every morning → check trending → draft tweet → queue",
    trigger: "schedule",
    steps: 3,
    installs: 310,
  },
  {
    id: "t4",
    name: "Raid Thank You",
    description: "Incoming raid → Discord alert → clip moment → shoutout post",
    trigger: "twitch_raid",
    steps: 3,
    installs: 78,
  },
];
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Play,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Copy,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import type { Workflow, WorkflowTrigger } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const triggerColors: Record<string, string> = {
  stream_end: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  clip_ready: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  schedule: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  twitch_raid: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  keyword_detected: "bg-pink-500/10 text-pink-400 border-pink-500/30",
};

function relTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function WorkflowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border">
      <div className="h-2 w-2 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-8 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { data: workflowsData, isLoading: wfLoading, isError: wfError } = useWorkflows();
  const { data: runsData, isLoading: runsLoading } = useWorkflowRuns({ limit: 10 });

  const runWorkflow = useRunWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const createWorkflow = useCreateWorkflow();

  const workflows = workflowsData?.data ?? [];
  const runs = runsData?.data ?? [];

  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [editTarget, setEditTarget] = useState<Workflow | null>(null);
  const [editName, setEditName] = useState("");
  const [installingTemplate, setInstallingTemplate] = useState<string | null>(null);

  const activeCount = workflows.filter((w) => w.status === "active").length;
  const totalRuns = workflows.reduce((a, w) => a + (w.runsTotal ?? 0), 0);

  function handleRun(wf: Workflow) {
    runWorkflow.mutate(wf.id);
  }

  function handleToggle(wf: Workflow) {
    const newStatus = wf.status === "active" ? "paused" : "active";
    updateWorkflow.mutate({ id: wf.id, status: newStatus });
  }

  function handleDuplicate(wf: Workflow) {
    createWorkflow.mutate(
      {
        name: `${wf.name} (copy)`,
        trigger: wf.trigger,
        triggerLabel: wf.triggerLabel,
        steps: wf.steps,
        status: "draft",
      },
      { onSuccess: () => toast.success(`"${wf.name}" duplicated`) },
    );
  }

  function openEdit(wf: Workflow) {
    setEditTarget(wf);
    setEditName(wf.name);
  }

  function handleEditSave() {
    if (!editTarget || !editName.trim()) return;
    updateWorkflow.mutate(
      { id: editTarget.id, name: editName },
      {
        onSuccess: () => {
          setEditTarget(null);
          toast.success("Workflow updated");
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteWorkflow.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  async function installTemplate(t: (typeof WORKFLOW_TEMPLATES)[number]) {
    setInstallingTemplate(t.id);
    createWorkflow.mutate(
      {
        name: t.name,
        trigger: t.trigger as WorkflowTrigger,
        triggerLabel: t.trigger.replace(/_/g, " "),
        steps: t.steps,
        status: "active",
      },
      {
        onSuccess: () => {
          setInstallingTemplate(null);
          toast.success(`"${t.name}" installed`);
        },
        onError: () => setInstallingTemplate(null),
      },
    );
  }

  if (wfError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workflows" description="Automate your creator pipeline">
          <Button disabled>
            <Zap className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </PageHeader>
        <EmptyState preset="offline" subtitle="Could not load workflows. Check your connection." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Workflows" description="Automate your creator pipeline">
        <Button onClick={() => toast.info("Workflow editor coming soon")}>
          <Zap className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Workflows", value: wfLoading ? "—" : activeCount },
          { label: "Total Runs", value: wfLoading ? "—" : totalRuns },
          { label: "Recent Runs", value: runsLoading ? "—" : runs.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow list */}
      <Card>
        <CardHeader>
          <CardTitle>Your Workflows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {wfLoading ? (
            Array.from({ length: 3 }).map((_, i) => <WorkflowSkeleton key={i} />)
          ) : workflows.length === 0 ? (
            <EmptyState
              preset="no-workflows"
              size="lg"
              cta={{ label: "Browse Templates Below", onClick: () => {} }}
            />
          ) : (
            workflows.map((wf) => {
              const isRunning = runWorkflow.isPending && runWorkflow.variables === wf.id;
              const isToggling =
                updateWorkflow.isPending && (updateWorkflow.variables as any)?.id === wf.id;

              return (
                <div
                  key={wf.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    wf.status === "active"
                      ? "border-l-4 border-l-green-500"
                      : wf.status === "paused"
                        ? "border-l-4 border-l-yellow-500"
                        : "border-dashed"
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      wf.status === "active"
                        ? "bg-green-500"
                        : wf.status === "paused"
                          ? "bg-yellow-500"
                          : "bg-muted-foreground"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{wf.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${triggerColors[wf.trigger] ?? ""}`}
                      >
                        {(wf.triggerLabel ?? wf.trigger).replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{wf.steps ?? 0} steps</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {wf.lastRunAt ? (
                        <>
                          <span className="flex items-center gap-1">
                            {wf.lastRunStatus === "success" ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive" />
                            )}
                            Last run {relTime(wf.lastRunAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {wf.runsTotal ?? 0} total runs
                          </span>
                        </>
                      ) : (
                        <span>Never run</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={wf.status === "draft" || isRunning}
                      onClick={() => handleRun(wf)}
                    >
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1" />
                      )}
                      {isRunning ? "Running" : "Run"}
                    </Button>
                    <Switch
                      checked={wf.status === "active"}
                      disabled={wf.status === "draft" || isToggling}
                      onCheckedChange={() => handleToggle(wf)}
                      aria-label="Toggle workflow"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(wf)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(wf)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(wf)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Run history */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-5 w-14 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No runs yet. Trigger a workflow to see history here.
            </p>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-4 py-2 border-b last:border-0 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{run.workflowName}</p>
                  <p className="text-xs text-muted-foreground">{relTime(run.startedAt)}</p>
                </div>
                {run.durationSeconds != null && (
                  <span className="text-xs text-muted-foreground">{run.durationSeconds}s</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {run.stepsCompleted}/{run.stepsTotal} steps
                </span>
                <Badge
                  variant="outline"
                  className={
                    run.status === "success"
                      ? "text-green-500 border-green-500/30"
                      : run.status === "failed"
                        ? "text-destructive border-destructive/30"
                        : "text-muted-foreground"
                  }
                >
                  {run.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Start from a Template</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WORKFLOW_TEMPLATES.map((t) => (
            <div key={t.id} className="border rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${triggerColors[t.trigger] ?? ""}`}>
                  {t.trigger.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">{t.steps} steps</span>
                <span className="text-xs text-muted-foreground">{t.installs} creators</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={installingTemplate === t.id}
                onClick={() => installTemplate(t)}
              >
                {installingTemplate === t.id && (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                )}
                {installingTemplate === t.id ? "Installing..." : "Use Template"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wf-name">Name</Label>
              <Input id="wf-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateWorkflow.isPending || !editName.trim()}
            >
              {updateWorkflow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all its run history will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkflow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
