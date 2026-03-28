import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  SearchX,
  WifiOff,
  Users,
  BarChart3,
  Scissors,
  Send,
  Bot,
  DollarSign,
  Shield,
  Bell,
  FileVideo,
  Swords,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// ─── Named empty state presets ────────────────────────────────────────────────

export type EmptyStatePreset =
  | "no-clips"
  | "no-approvals"
  | "no-posts"
  | "no-streams"
  | "no-notifications"
  | "no-moderation-flags"
  | "no-community"
  | "no-revenue"
  | "no-competitors"
  | "no-workflows"
  | "no-sponsors"
  | "no-search"
  | "no-analytics"
  | "no-agents"
  | "offline"
  | "generic";

const PRESETS: Record<EmptyStatePreset, { icon: LucideIcon; title: string; subtitle: string }> = {
  "no-clips": {
    icon: Scissors,
    title: "No clips yet",
    subtitle: "Go live or upload a video — your highlights will appear here.",
  },
  "no-approvals": {
    icon: Bot,
    title: "All caught up",
    subtitle: "Your agent has nothing waiting. New approvals will appear here.",
  },
  "no-posts": {
    icon: Send,
    title: "Nothing scheduled",
    subtitle: "Compose a post or let the agent draft one from your latest clip.",
  },
  "no-streams": {
    icon: FileVideo,
    title: "No stream history yet",
    subtitle: "Go live to start building your analytics.",
  },
  "no-notifications": {
    icon: Bell,
    title: "You're all caught up",
    subtitle: "New activity will show up here in real time.",
  },
  "no-moderation-flags": {
    icon: Shield,
    title: "Nothing to review",
    subtitle: "Auto-mod is handling everything. Flagged messages appear here.",
  },
  "no-community": {
    icon: Users,
    title: "No community data yet",
    subtitle: "Stream and engage with viewers to start building your fanbase.",
  },
  "no-revenue": {
    icon: DollarSign,
    title: "No revenue connected",
    subtitle: "Connect Twitch, YouTube, or Patreon to see your earnings here.",
  },
  "no-competitors": {
    icon: Swords,
    title: "No competitors tracked",
    subtitle: "Add up to 10 channels to track and compare against.",
  },
  "no-workflows": {
    icon: Sparkles,
    title: "No workflows yet",
    subtitle: "Automate your stream-to-post pipeline with a workflow template.",
  },
  "no-sponsors": {
    icon: DollarSign,
    title: "No sponsor deals",
    subtitle: "Add your first sponsorship deal to track deliverables and pay.",
  },
  "no-search": {
    icon: SearchX,
    title: "No results",
    subtitle: "Try different keywords or clear your filters.",
  },
  "no-analytics": {
    icon: BarChart3,
    title: "No analytics yet",
    subtitle: "Go live or publish content to start seeing your data.",
  },
  "no-agents": {
    icon: Bot,
    title: "No agents running",
    subtitle: "Enable an agent to start automating your content pipeline.",
  },
  offline: {
    icon: WifiOff,
    title: "You appear to be offline",
    subtitle: "Check your internet connection and try again.",
  },
  generic: { icon: Inbox, title: "Nothing here yet", subtitle: "This section is empty for now." },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Use a named preset OR supply your own icon + text */
  preset?: EmptyStatePreset;
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  /** Secondary action (e.g., "Learn more") */
  secondaryCta?: { label: string; onClick: () => void };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  preset = "generic",
  icon,
  title,
  subtitle,
  cta,
  secondaryCta,
  className,
  size = "md",
}: EmptyStateProps) {
  const p = PRESETS[preset];
  const Icon = icon ?? p.icon;
  const heading = title ?? p.title;
  const body = subtitle ?? p.subtitle;

  const iconSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const iconWrap = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const textHead = size === "sm" ? "text-sm" : "text-base";
  const textBody = size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "sm" ? "py-6" : size === "lg" ? "py-16" : "py-10";

  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center", padding, className)}
    >
      <div
        className={cn("flex items-center justify-center rounded-2xl bg-muted/50 mb-4", iconWrap)}
      >
        <Icon className={cn(iconSize, "text-muted-foreground/60")} />
      </div>
      <h3 className={cn("font-semibold text-foreground mb-1", textHead)}>{heading}</h3>
      <p className={cn("text-muted-foreground max-w-xs leading-relaxed", textBody)}>{body}</p>
      {(cta || secondaryCta) && (
        <div className="flex items-center gap-2 mt-4">
          {cta && (
            <Button size={size === "lg" ? "default" : "sm"} onClick={cta.onClick}>
              {cta.label}
            </Button>
          )}
          {secondaryCta && (
            <Button
              variant="ghost"
              size={size === "lg" ? "default" : "sm"}
              onClick={secondaryCta.onClick}
            >
              {secondaryCta.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
