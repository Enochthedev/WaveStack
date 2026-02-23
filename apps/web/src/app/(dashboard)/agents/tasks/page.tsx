"use client";

import { useState } from "react";
import { toast } from "sonner";
import { agentTasks as initialTasks } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type Task = (typeof initialTasks)[number] & { status: string };

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function TaskCard({
  task,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  task: Task;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: string | null;
  rejecting: string | null;
}) {
  const isActioning = approving === task.id || rejecting === task.id;

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
              <span className="text-xs text-muted-foreground">
                Priority: {task.priority}
              </span>
              <span className="text-xs text-muted-foreground">
                {relativeTime(task.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} />
          {task.status === "awaiting_approval" && (
            <>
              <Button
                size="sm"
                variant="default"
                disabled={isActioning}
                onClick={() => onApprove(task.id)}
              >
                {approving === task.id ? (
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
                {rejecting === task.id ? (
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

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks as Task[]);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setApproving(id);
    await new Promise((r) => setTimeout(r, 700));
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t))
    );
    setApproving(null);
    toast.success("Task approved — agent executing");
  }

  async function handleReject(id: string) {
    setRejecting(id);
    await new Promise((r) => setTimeout(r, 500));
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setRejecting(null);
    toast.success("Task rejected and removed");
  }

  const runningTasks = tasks.filter((t) => t.status === "running");
  const awaitingTasks = tasks.filter((t) => t.status === "awaiting_approval");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const cardProps = { onApprove: handleApprove, onReject: handleReject, approving, rejecting };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agent Tasks"
        description="Monitor and manage agent work"
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
          <TabsTrigger value="running">Running ({runningTasks.length})</TabsTrigger>
          <TabsTrigger value="awaiting_approval">
            Awaiting ({awaitingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks.</p>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} {...cardProps} />
          ))}
        </TabsContent>

        <TabsContent value="running" className="mt-4 space-y-3">
          {runningTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No running tasks.</p>
          )}
          {runningTasks.map((task) => (
            <TaskCard key={task.id} task={task} {...cardProps} />
          ))}
        </TabsContent>

        <TabsContent value="awaiting_approval" className="mt-4 space-y-3">
          {awaitingTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks awaiting approval.</p>
          )}
          {awaitingTasks.map((task) => (
            <TaskCard key={task.id} task={task} {...cardProps} />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No completed tasks.</p>
          )}
          {completedTasks.map((task) => (
            <TaskCard key={task.id} task={task} {...cardProps} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
