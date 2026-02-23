import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusBadge } from "@/lib/colors";

const fallback: Record<string, string> = {
  draft:        "bg-muted text-muted-foreground border-muted",
  idle:         "bg-muted text-muted-foreground border-muted",
  disconnected: "bg-muted text-muted-foreground border-muted",
  manual:       "bg-muted text-muted-foreground border-muted",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = statusBadge[key] ?? fallback[key] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("capitalize", style, className)}>
      {status}
    </Badge>
  );
}
