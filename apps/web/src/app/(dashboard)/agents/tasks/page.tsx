"use client";

import { useAgentTasks, useActOnApproval } from "@/lib/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { AgentTask } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TaskSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4 gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-56 rounded bg-muted animate-pulse" />
          <div className="flex gap-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-20 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  actingId,
  onApprove,
  onReject,
}: {
  task: AgentTask;
  actingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const isActioning = actingId === task.id;

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium">{task.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {task.agentType}
              </Badge>
              <span className="text-xs text-muted-foreground">Priority: {task.priority}</span>
              <span className="text-xs text-muted-foreground">{relativeTime(task.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} />
          {task.status === "awaiting_approval" && (
            <>
              <Button size="sm" disabled={isActioning} onClick={() => onApprove(task.id)}>
                {isActioning ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isActioning}
                onClick={() => onReject(task.id)}
              >
                {isActioning ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentTasksPage() {
  const { data, isLoading, isError } = useAgentTasks({ limit: 100 });
  const actOnApproval = useActOnApproval();

  const tasks = data?.data ?? [];
  const actingId = actOnApproval.isPending ? (actOnApproval.variables?.id ?? null) : null;

  function handleApprove(id: string) {
    actOnApproval.mutate({ id, action: "approve" });
  }

  function handleReject(id: string) {
    actOnApproval.mutate({ id, action: "reject" });
  }

  const runningTasks = tasks.filter((t) => t.status === "running");
  const awaitingTasks = tasks.filter((t) => t.status === "awaiting_approval");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const cardProps = { actingId, onApprove: handleApprove, onReject: handleReject };

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Agent Tasks" description="Monitor and manage agent work" />
        <EmptyState preset="offline" subtitle="Could not load tasks. Check your connection." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Agent Tasks" description="Monitor and manage agent work" />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All{!isLoading && ` (${tasks.length})`}</TabsTrigger>
          <TabsTrigger value="running">
            Running{!isLoading && ` (${runningTasks.length})`}
          </TabsTrigger>
          <TabsTrigger value="awaiting_approval">
            Awaiting{!isLoading && ` (${awaitingTasks.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed{!isLoading && ` (${completedTasks.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <TaskSkeleton key={i} />)
          ) : tasks.length === 0 ? (
            <EmptyState
              preset="generic"
              title="No tasks yet"
              subtitle="Your agents haven't created any tasks. Enable an agent to get started."
              size="lg"
            />
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} {...cardProps} />)
          )}
        </TabsContent>

        <TabsContent value="running" className="mt-4 space-y-3">
          {isLoading ? (
            <TaskSkeleton />
          ) : runningTasks.length === 0 ? (
            <EmptyState
              preset="generic"
              title="No running tasks"
              subtitle="Nothing is executing right now."
              size="md"
            />
          ) : (
            runningTasks.map((task) => <TaskCard key={task.id} task={task} {...cardProps} />)
          )}
        </TabsContent>

        <TabsContent value="awaiting_approval" className="mt-4 space-y-3">
          {isLoading ? (
            <TaskSkeleton />
          ) : awaitingTasks.length === 0 ? (
            <EmptyState preset="no-approvals" size="md" />
          ) : (
            awaitingTasks.map((task) => <TaskCard key={task.id} task={task} {...cardProps} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {isLoading ? (
            <TaskSkeleton />
          ) : completedTasks.length === 0 ? (
            <EmptyState
              preset="generic"
              title="No completed tasks"
              subtitle="Approved tasks will appear here once done."
              size="md"
            />
          ) : (
            completedTasks.map((task) => <TaskCard key={task.id} task={task} {...cardProps} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
