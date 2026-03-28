import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  FileText,
  Send,
  Shield,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Brain,
} from "lucide-react";

type AgentType =
  | "clip"
  | "content"
  | "publishing"
  | "moderation"
  | "analytics"
  | "growth"
  | "community"
  | "revenue";

const agentMeta: Record<AgentType, { label: string; icon: React.ElementType; color: string }> = {
  clip: {
    label: "Clip Worker",
    icon: Scissors,
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  content: {
    label: "Content Worker",
    icon: FileText,
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  publishing: {
    label: "Publisher Worker",
    icon: Send,
    color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  moderation: {
    label: "Moderation Worker",
    icon: Shield,
    color: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  analytics: {
    label: "Analytics Worker",
    icon: BarChart3,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  growth: {
    label: "Growth Worker",
    icon: TrendingUp,
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  community: {
    label: "Community Worker",
    icon: Users,
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  revenue: {
    label: "Revenue Worker",
    icon: DollarSign,
    color: "bg-green-500/10 text-green-400 border-green-500/20",
  },
};

interface AgentTypeBadgeProps {
  type: AgentType | string;
  showLabel?: boolean;
  className?: string;
}

export function AgentTypeBadge({ type, showLabel = true, className }: AgentTypeBadgeProps) {
  const meta = agentMeta[type as AgentType] ?? {
    label: type,
    icon: Brain,
    color: "bg-muted text-muted-foreground border-border",
  };
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[10px] h-5 py-0 px-1.5", meta.color, className)}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {showLabel && meta.label}
    </Badge>
  );
}
