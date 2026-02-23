"use client";

import { useState } from "react";
import { toast } from "sonner";
import { workflows as initialWorkflows, workflowRuns, workflowTemplates } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
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

type Workflow = (typeof initialWorkflows)[number];

const triggerColors: Record<string, string> = {
  stream_end:       "bg-purple-500/10 text-purple-400 border-purple-500/30",
  clip_ready:       "bg-blue-500/10 text-blue-400 border-blue-500/30",
  schedule:         "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  twitch_raid:      "bg-orange-500/10 text-orange-400 border-orange-500/30",
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

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [running, setRunning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [editTarget, setEditTarget] = useState<Workflow | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [installingTemplate, setInstallingTemplate] = useState<string | null>(null);

  const activeCount = workflows.filter((w) => w.status === "active").length;
  const totalRuns   = workflows.reduce((a, w) => a + w.runsTotal, 0);

  async function runWorkflow(wf: Workflow) {
    setRunning(wf.id);
    await new Promise((r) => setTimeout(r, 1500));
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === wf.id
          ? { ...w, lastRunAt: new Date().toISOString(), lastRunStatus: "success", runsTotal: w.runsTotal + 1 }
          : w
      )
    );
    setRunning(null);
    toast.success(`"${wf.name}" completed successfully`);
  }

  function toggleWorkflow(wf: Workflow) {
    const next = wf.status === "active" ? "paused" : "active";
    setWorkflows((prev) =>
      prev.map((w) => (w.id === wf.id ? { ...w, status: next } : w))
    );
    toast.success(`"${wf.name}" ${next === "active" ? "enabled" : "paused"}`);
  }

  function duplicateWorkflow(wf: Workflow) {
    const copy: Workflow = {
      ...wf,
      id: `${wf.id}-copy-${Date.now()}`,
      name: `${wf.name} (copy)`,
      status: "draft",
      lastRunAt: null,
      lastRunStatus: null,
      runsTotal: 0,
    };
    setWorkflows((prev) => [...prev, copy]);
    toast.success(`"${wf.name}" duplicated`);
  }

  function openEdit(wf: Workflow) {
    setEditTarget(wf);
    setEditName(wf.name);
  }

  async function saveEdit() {
    if (!editTarget || !editName.trim()) return;
    setEditSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setWorkflows((prev) =>
      prev.map((w) => (w.id === editTarget.id ? { ...w, name: editName } : w))
    );
    setEditSaving(false);
    setEditTarget(null);
    toast.success("Workflow updated");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  }

  async function installTemplate(t: (typeof workflowTemplates)[number]) {
    setInstallingTemplate(t.id);
    await new Promise((r) => setTimeout(r, 1000));
    const newWf: Workflow = {
      id: `wf-${Date.now()}`,
      name: t.name,
      trigger: t.trigger,
      triggerLabel: t.trigger.replace(/_/g, " "),
      status: "active",
      steps: t.steps,
      runsTotal: 0,
      lastRunAt: null,
      lastRunStatus: null,
    };
    setWorkflows((prev) => [...prev, newWf]);
    setInstallingTemplate(null);
    toast.success(`"${t.name}" installed from template`);
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
          { label: "Active Workflows", value: activeCount },
          { label: "Total Runs",       value: totalRuns },
          { label: "Runs (last 5)",    value: workflowRuns.length },
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
          {workflows.map((wf) => (
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
              {/* Status dot */}
              <div
                className={`h-2 w-2 rounded-full shrink-0 ${
                  wf.status === "active"
                    ? "bg-green-500"
                    : wf.status === "paused"
                    ? "bg-yellow-500"
                    : "bg-muted-foreground"
                }`}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{wf.name}</span>
                  <Badge variant="outline" className={`text-xs ${triggerColors[wf.trigger] ?? ""}`}>
                    {wf.triggerLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{wf.steps} steps</span>
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
                        {wf.runsTotal} total runs
                      </span>
                    </>
                  ) : (
                    <span>Never run</span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={wf.status === "draft" || running === wf.id}
                  onClick={() => runWorkflow(wf)}
                >
                  {running === wf.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1" />
                  )}
                  {running === wf.id ? "Running" : "Run"}
                </Button>
                <Switch
                  checked={wf.status === "active"}
                  disabled={wf.status === "draft"}
                  onCheckedChange={() => toggleWorkflow(wf)}
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
                      <Pencil className="h-4 w-4 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateWorkflow(wf)}>
                      <Copy className="h-4 w-4 mr-2" />Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(wf)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Run history */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workflowRuns.map((run) => (
            <div key={run.id} className="flex items-center gap-4 py-2 border-b last:border-0 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{run.workflowName}</p>
                <p className="text-xs text-muted-foreground">{relTime(run.startedAt)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{run.duration}s</span>
              <span className="text-xs text-muted-foreground">{run.stepsCompleted} steps</span>
              <Badge
                variant="outline"
                className={
                  run.status === "success"
                    ? "text-green-500 border-green-500/30"
                    : "text-destructive border-destructive/30"
                }
              >
                {run.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Start from a Template</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflowTemplates.map((t) => (
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
      <Dialog open={!!editTarget} onOpenChange={(open: boolean) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wf-name">Name</Label>
              <Input
                id="wf-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving || !editName.trim()}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all its run history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
