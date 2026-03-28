"use client";

import { useSSEStore } from "@/lib/store/sse-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const statusConfig = {
  connected: {
    dot: "bg-emerald-500",
    icon: Wifi,
    label: "Connected",
    text: "text-emerald-500",
    pulse: false,
  },
  connecting: {
    dot: "bg-amber-400",
    icon: RefreshCw,
    label: "Connecting…",
    text: "text-amber-400",
    pulse: true,
  },
  reconnecting: {
    dot: "bg-amber-500",
    icon: RefreshCw,
    label: "Reconnecting…",
    text: "text-amber-500",
    pulse: true,
  },
  disconnected: {
    dot: "bg-muted-foreground/40",
    icon: WifiOff,
    label: "Offline",
    text: "text-muted-foreground",
    pulse: false,
  },
};

interface SSEStatusProps {
  /** Show only the dot (default). Pass showLabel to also render text. */
  showLabel?: boolean;
  className?: string;
}

export function SSEStatus({ showLabel = false, className }: SSEStatusProps) {
  const { status, lastEventAt } = useSSEStore();
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  const lastSeen = lastEventAt
    ? `Last event: ${new Date(lastEventAt).toLocaleTimeString()}`
    : "No events received yet";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5 cursor-default", className)}>
          <span
            className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot, cfg.pulse && "animate-pulse")}
          />
          {showLabel && <span className={cn("text-xs font-medium", cfg.text)}>{cfg.label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <Icon className="h-3 w-3" />
          Real-time: {cfg.label}
        </div>
        <div className="text-muted-foreground">{lastSeen}</div>
      </TooltipContent>
    </Tooltip>
  );
}
