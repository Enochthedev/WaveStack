"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StreamHealthIndicatorProps {
  bitrate: number; // kbps
  droppedFrames: number; // percentage 0–100
  latencyMs?: number; // optional per-platform latency
  className?: string;
}

function getHealth(bitrate: number, droppedFrames: number): "good" | "warn" | "bad" {
  if (droppedFrames > 5 || bitrate < 2000) return "bad";
  if (droppedFrames > 1 || bitrate < 4000) return "warn";
  return "good";
}

const healthConfig = {
  good: { dot: "bg-emerald-500", label: "Healthy", text: "text-emerald-500" },
  warn: { dot: "bg-amber-500", label: "Degraded", text: "text-amber-500" },
  bad: { dot: "bg-red-500", label: "Poor", text: "text-red-500" },
};

export function StreamHealthIndicator({
  bitrate,
  droppedFrames,
  latencyMs,
  className,
}: StreamHealthIndicatorProps) {
  const health = getHealth(bitrate, droppedFrames);
  const cfg = healthConfig[health];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5 cursor-default", className)}>
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              cfg.dot,
              health === "bad" && "animate-pulse",
            )}
          />
          <span className={cn("text-xs font-medium", cfg.text)}>{cfg.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="space-y-1 text-xs">
        <div className="font-semibold mb-1">Stream Health</div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Bitrate</span>
          <span
            className={
              bitrate < 2000
                ? "text-red-400"
                : bitrate < 4000
                  ? "text-amber-400"
                  : "text-emerald-400"
            }
          >
            {(bitrate / 1000).toFixed(1)} Mbps
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Dropped frames</span>
          <span
            className={
              droppedFrames > 5
                ? "text-red-400"
                : droppedFrames > 1
                  ? "text-amber-400"
                  : "text-emerald-400"
            }
          >
            {droppedFrames.toFixed(1)}%
          </span>
        </div>
        {latencyMs !== undefined && (
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Latency</span>
            <span
              className={
                latencyMs > 300
                  ? "text-red-400"
                  : latencyMs > 150
                    ? "text-amber-400"
                    : "text-emerald-400"
              }
            >
              {latencyMs} ms
            </span>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
