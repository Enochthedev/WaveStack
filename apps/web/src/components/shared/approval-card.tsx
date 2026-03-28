"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, X, Edit3, Clock, ChevronDown, ChevronUp, Bot, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformBadge, platformLabel } from "@/lib/colors";

export type ReasoningStep = {
  step: number;
  label: string;
  detail: string;
};

export type ApprovalRequest = {
  id: string;
  worker: string;
  workerType:
    | "content"
    | "clip"
    | "publishing"
    | "moderation"
    | "analytics"
    | "growth"
    | "community";
  platform: string[];
  contentType: "tweet" | "caption" | "clip" | "post" | "moderation" | "schedule";
  title: string;
  draft: string;
  reasoning: string;
  reasoningSteps?: ReasoningStep[];
  expiresAt: string; // ISO
  urgency: "high" | "medium" | "low";
};

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string, feedback?: string) => void;
}

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;
  const urgent = remaining < 5 * 60 * 1000 && !expired; // < 5 min
  return { mins, secs, expired, urgent };
}

const workerColors: Record<string, string> = {
  content: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  clip: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  publishing: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  moderation: "bg-red-500/10 text-red-400 border-red-500/20",
  analytics: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  growth: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  community: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export function ApprovalCard({ request, onApprove, onReject }: ApprovalCardProps) {
  const [mode, setMode] = useState<"view" | "edit" | "reject">("view");
  const [editedDraft, setEditedDraft] = useState(request.draft);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const { mins, secs, expired, urgent } = useCountdown(request.expiresAt);

  const workerColor = workerColors[request.workerType] ?? workerColors.content;

  async function handleApprove() {
    setLoading("approve");
    await new Promise((r) => setTimeout(r, 600));
    onApprove(request.id);
    toast.success("Approved", { description: `${request.worker} action approved` });
  }

  async function handleReject() {
    setLoading("reject");
    await new Promise((r) => setTimeout(r, 400));
    onReject(request.id, rejectFeedback || undefined);
    toast.info("Rejected", { description: rejectFeedback ? "Feedback sent to agent" : undefined });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-3 transition-all duration-200",
        expired
          ? "opacity-50 border-border/50"
          : urgent
            ? "border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]"
            : "border-border hover:border-border/80",
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 shrink-0 text-primary" />
          <Badge variant="outline" className={cn("text-[10px] h-5 shrink-0", workerColor)}>
            {request.worker}
          </Badge>
          <span className="text-sm font-medium truncate">{request.title}</span>
        </div>

        {/* Expiry countdown */}
        <div
          className={cn(
            "flex items-center gap-1 shrink-0 text-xs font-mono",
            expired ? "text-destructive" : urgent ? "text-amber-500" : "text-muted-foreground",
          )}
        >
          {urgent && !expired && <AlertTriangle className="h-3 w-3" />}
          <Clock className="h-3 w-3" />
          {expired ? "Expired" : `${mins}:${String(secs).padStart(2, "0")}`}
        </div>
      </div>

      {/* ── Platform badges ── */}
      <div className="flex gap-1 flex-wrap">
        {request.platform.map((p) => (
          <Badge
            key={p}
            variant="outline"
            className={cn("text-[10px] h-4 py-0 px-1 gap-1", platformBadge[p])}
          >
            <PlatformIcon platform={p} size={9} branded />
            {platformLabel[p] ?? p}
          </Badge>
        ))}
        <Badge
          variant="outline"
          className="text-[10px] h-4 py-0 px-1.5 bg-muted/50 text-muted-foreground"
        >
          {request.contentType}
        </Badge>
      </div>

      {/* ── Draft content ── */}
      {mode === "edit" ? (
        <Textarea
          value={editedDraft}
          onChange={(e) => setEditedDraft(e.target.value)}
          className="text-sm min-h-[80px] resize-none bg-muted/40"
          autoFocus
        />
      ) : (
        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
          {request.draft}
        </p>
      )}

      {/* ── Agent reasoning ── */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Agent reasoning
        <span className="text-[10px] text-primary/70">{showReasoning ? "hide" : "show"}</span>
      </button>

      {showReasoning && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
          <p className="text-xs text-foreground/80 leading-relaxed">{request.reasoning}</p>
          {request.reasoningSteps && request.reasoningSteps.length > 0 && (
            <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
              {request.reasoningSteps.map((s) => (
                <div key={s.step} className="flex gap-2">
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground/60 mt-0.5 w-4">
                    {s.step}.
                  </span>
                  <div>
                    <span className="text-[11px] font-medium text-foreground/70">{s.label}: </span>
                    <span className="text-[11px] text-muted-foreground">{s.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Reject feedback ── */}
      {mode === "reject" && (
        <div className="space-y-1.5">
          <Textarea
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Optional: tell the agent why you're rejecting this (helps training)…"
            className="text-xs min-h-[60px] resize-none bg-muted/40"
            autoFocus
          />
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 pt-1">
        {mode === "view" && (
          <>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={expired || loading !== null}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => setMode("edit")}
              disabled={expired || loading !== null}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit & Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => setMode("reject")}
              disabled={expired || loading !== null}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}

        {mode === "edit" && (
          <>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={loading !== null}
            >
              <Check className="h-3.5 w-3.5" />
              Approve Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                setMode("view");
                setEditedDraft(request.draft);
              }}
            >
              Cancel
            </Button>
          </>
        )}

        {mode === "reject" && (
          <>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1.5"
              onClick={handleReject}
              disabled={loading !== null}
            >
              <X className="h-3.5 w-3.5" />
              Confirm Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                setMode("view");
                setRejectFeedback("");
              }}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
