"use client";

import { useState } from "react";
import {
  useAgentConfig,
  useUpdateAgentConfig,
  useApprovals,
  useActOnApproval,
} from "@/lib/hooks/use-agents";
import { EmptyState } from "@/components/shared/empty-state";
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
import type { AgentConfig, ApprovalRequest } from "@/lib/api";

const autonomyLevels = ["manual", "copilot", "autopilot"] as const;

// ── Skeletons ──────────────────────────────────────────────────────────────

function AgentCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
        <div className="h-6 w-12 rounded bg-muted" />
        <div className="flex gap-1">
          <div className="h-7 w-16 rounded bg-muted" />
          <div className="h-7 w-16 rounded bg-muted" />
          <div className="h-7 w-16 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalSkeleton() {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 animate-pulse">
      <div className="space-y-1">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-5 w-20 rounded bg-muted" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { data: configData, isLoading: configLoading, isError: configError } = useAgentConfig();
  const { data: approvalsData, isLoading: approvalsLoading } = useApprovals();
  const updateConfig = useUpdateAgentConfig();
  const actOnApproval = useActOnApproval();

  const agentConfigs: AgentConfig[] = configData ?? [];
  const approvals: ApprovalRequest[] = approvalsData?.data ?? [];

  // Autopilot confirmation dialog
  const [pendingAutonomy, setPendingAutonomy] = useState<{
    agentType: string;
    name: string;
    level: AgentConfig["autonomyLevel"];
  } | null>(null);

  function requestAutonomyChange(agent: AgentConfig, level: AgentConfig["autonomyLevel"]) {
    if (agent.autonomyLevel === level) return;
    if (level === "autopilot") {
      setPendingAutonomy({ agentType: agent.agentType, name: agent.name, level });
    } else {
      applyAutonomy(agent.agentType, level);
    }
  }

  function applyAutonomy(agentType: string, level: AgentConfig["autonomyLevel"]) {
    updateConfig.mutate({ agentType, patch: { autonomyLevel: level } });
    setPendingAutonomy(null);
  }

  function toggleEnabled(agent: AgentConfig) {
    updateConfig.mutate({
      agentType: agent.agentType,
      patch: { isEnabled: !agent.isEnabled },
    });
  }

  function handleApprove(approval: ApprovalRequest) {
    actOnApproval.mutate({ id: approval.id, action: "approve" });
  }

  function handleReject(approval: ApprovalRequest) {
    actOnApproval.mutate({ id: approval.id, action: "reject" });
  }

  return (
    <div className="space-y-8">
      <PageHeader title="AI Agents" description="Manage your autonomous AI agents" />

      {configError && (
        <EmptyState preset="offline" subtitle="Could not load agent configuration." />
      )}

      {!configError && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {configLoading ? (
            Array.from({ length: 4 }).map((_, i) => <AgentCardSkeleton key={i} />)
          ) : agentConfigs.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                preset="generic"
                title="No agents configured"
                subtitle="Set up your AI agents to get started with automation."
                size="lg"
              />
            </div>
          ) : (
            agentConfigs.map((agent) => (
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
                      onCheckedChange={() => toggleEnabled(agent)}
                      disabled={updateConfig.isPending}
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
                          disabled={updateConfig.isPending}
                          onClick={() => requestAutonomyChange(agent, level)}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pending Approvals */}
      {approvalsLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <ApprovalSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : approvals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Approvals
              <Badge className="h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                {approvals.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{approval.title}</p>
                    <Badge variant="secondary" className="capitalize">
                      {approval.agentType}
                    </Badge>
                    {approval.urgency === "high" && (
                      <Badge variant="destructive" className="ml-1 capitalize">
                        urgent
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={actOnApproval.isPending}
                      onClick={() => handleApprove(approval)}
                    >
                      {actOnApproval.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actOnApproval.isPending}
                      onClick={() => handleReject(approval)}
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
      ) : (
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
                {pendingAutonomy?.name ?? "this agent"}
              </span>{" "}
              will act autonomously without requiring your approval for each task. You can switch
              back to copilot or manual at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingAutonomy && applyAutonomy(pendingAutonomy.agentType, pendingAutonomy.level)
              }
            >
              Enable Autopilot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
