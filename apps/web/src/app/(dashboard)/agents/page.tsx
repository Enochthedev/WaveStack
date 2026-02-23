"use client";

import { useState } from "react";
import { toast } from "sonner";
import { agents, agentTasks as initialTasks } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
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
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type AgentTask = (typeof initialTasks)[number];

const autonomyLevels = ["manual", "copilot", "autopilot"] as const;

export default function AgentsPage() {
  const [agentStates, setAgentStates] = useState(
    agents.map((a) => ({ ...a }))
  );
  const [tasks, setTasks] = useState<AgentTask[]>(initialTasks);
  const [actioningTask, setActioningTask] = useState<string | null>(null);

  // Autonomy change confirmation
  const [pendingAutonomy, setPendingAutonomy] = useState<{
    index: number;
    level: string;
  } | null>(null);

  const pendingApprovals = tasks.filter((t) => t.status === "awaiting_approval");

  function toggleEnabled(index: number) {
    const agent = agentStates[index];
    setAgentStates((prev) =>
      prev.map((a, i) => (i === index ? { ...a, isEnabled: !a.isEnabled } : a))
    );
    toast.success(`${agent.name} ${agent.isEnabled ? "disabled" : "enabled"}`);
  }

  function requestAutonomyChange(index: number, level: string) {
    const agent = agentStates[index];
    if (agent.autonomyLevel === level) return;
    // Escalating to autopilot requires confirmation
    if (level === "autopilot") {
      setPendingAutonomy({ index, level });
    } else {
      applyAutonomy(index, level);
    }
  }

  function applyAutonomy(index: number, level: string) {
    const agent = agentStates[index];
    setAgentStates((prev) =>
      prev.map((a, i) => (i === index ? { ...a, autonomyLevel: level } : a))
    );
    toast.success(`${agent.name} set to ${level} mode`);
  }

  function confirmAutonomy() {
    if (!pendingAutonomy) return;
    applyAutonomy(pendingAutonomy.index, pendingAutonomy.level);
    setPendingAutonomy(null);
  }

  async function handleApprove(task: AgentTask) {
    setActioningTask(task.id);
    await new Promise((r) => setTimeout(r, 700));
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setActioningTask(null);
    toast.success(`Task approved: "${task.title}"`);
  }

  async function handleReject(task: AgentTask) {
    setActioningTask(task.id);
    await new Promise((r) => setTimeout(r, 500));
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setActioningTask(null);
    toast.success(`Task rejected: "${task.title}"`);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="AI Agents" description="Manage your autonomous AI agents" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {agentStates.map((agent, index) => (
          <Card key={agent.agentType}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">{agent.name}</CardTitle>
              <StatusBadge status={agent.autonomyLevel} />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{agent.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Completed:{" "}
                  <span className="font-medium text-foreground">{agent.tasksCompleted}</span>
                </span>
                <span className="text-muted-foreground">
                  Running:{" "}
                  <span className="font-medium text-foreground">{agent.tasksRunning}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={agent.isEnabled}
                  onCheckedChange={() => toggleEnabled(index)}
                />
                <span className="text-sm text-muted-foreground">Enabled</span>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Autonomy Level</p>
                <div className="flex gap-1">
                  {autonomyLevels.map((level) => (
                    <Button
                      key={level}
                      size="sm"
                      variant={agent.autonomyLevel === level ? "default" : "outline"}
                      className="h-7 text-xs capitalize"
                      onClick={() => requestAutonomyChange(index, level)}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Approvals
              <Badge className="h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                {pendingApprovals.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApprovals.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge variant="secondary" className="capitalize">
                      {task.agentType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={actioningTask === task.id}
                      onClick={() => handleApprove(task)}
                    >
                      {actioningTask === task.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actioningTask === task.id}
                      onClick={() => handleReject(task)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingApprovals.length === 0 && tasks.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 h-20 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            All pending approvals cleared
          </CardContent>
        </Card>
      )}

      {/* Autopilot confirmation dialog */}
      <AlertDialog
        open={!!pendingAutonomy}
        onOpenChange={(open: boolean) => !open && setPendingAutonomy(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Autopilot?</AlertDialogTitle>
            <AlertDialogDescription>
              In autopilot mode,{" "}
              <span className="font-medium text-foreground">
                {pendingAutonomy !== null ? agentStates[pendingAutonomy.index]?.name : "this agent"}
              </span>{" "}
              will act autonomously without requiring your approval for each task. You can switch
              back to copilot or manual at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutonomy}>
              Enable Autopilot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
