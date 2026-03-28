import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, WifiOff, Lock, ServerCrash, RefreshCw, Clock } from "lucide-react";

// ─── Error type classifier ────────────────────────────────────────────────────

export type ErrorKind =
  | "network" // fetch failed / offline
  | "unauthorized" // 401 — session expired
  | "forbidden" // 403 — no permission
  | "not_found" // 404
  | "rate_limited" // 429
  | "server" // 5xx
  | "timeout" // request timed out
  | "unknown";

/** Infer kind from an Error or ApiError object. */
export function classifyError(err: unknown): ErrorKind {
  if (!err) return "unknown";
  if (typeof err === "object" && "status" in err) {
    const status = (err as { status: number }).status;
    if (status === 401) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 404) return "not_found";
    if (status === 429) return "rate_limited";
    if (status >= 500) return "server";
  }
  const msg = (err as Error).message ?? "";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch"))
    return "network";
  if (msg.includes("timeout") || msg.includes("AbortError")) return "timeout";
  return "unknown";
}

// ─── Per-kind copy & icon ─────────────────────────────────────────────────────

const ERROR_META: Record<
  ErrorKind,
  {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    canRetry: boolean;
  }
> = {
  network: {
    icon: WifiOff,
    title: "Connection error",
    subtitle: "Couldn't reach the server. Check your internet connection.",
    canRetry: true,
  },
  unauthorized: {
    icon: Lock,
    title: "Session expired",
    subtitle: "Your session has expired. Please sign in again.",
    canRetry: false,
  },
  forbidden: {
    icon: Lock,
    title: "Access denied",
    subtitle: "You don't have permission to view this.",
    canRetry: false,
  },
  not_found: {
    icon: AlertTriangle,
    title: "Not found",
    subtitle: "This resource doesn't exist or has been removed.",
    canRetry: false,
  },
  rate_limited: {
    icon: Clock,
    title: "Too many requests",
    subtitle: "You've hit the rate limit. Wait a moment and try again.",
    canRetry: true,
  },
  server: {
    icon: ServerCrash,
    title: "Server error",
    subtitle: "Something went wrong on our end. We're looking into it.",
    canRetry: true,
  },
  timeout: {
    icon: Clock,
    title: "Request timed out",
    subtitle: "The request took too long. Check your connection and try again.",
    canRetry: true,
  },
  unknown: {
    icon: AlertTriangle,
    title: "Something went wrong",
    subtitle: "An unexpected error occurred.",
    canRetry: true,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  error?: unknown;
  kind?: ErrorKind;
  /** Override the title */
  title?: string;
  /** Override the subtitle */
  subtitle?: string;
  onRetry?: () => void;
  onSignIn?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ErrorState({
  error,
  kind: kindProp,
  title,
  subtitle,
  onRetry,
  onSignIn,
  className,
  size = "md",
}: ErrorStateProps) {
  const kind = kindProp ?? (error ? classifyError(error) : "unknown");
  const meta = ERROR_META[kind];
  const Icon = meta.icon;
  const heading = title ?? meta.title;
  const body = subtitle ?? meta.subtitle;

  const iconSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const iconWrap = size === "sm" ? "h-11 w-11" : size === "lg" ? "h-18 w-18" : "h-14 w-14";
  const textHead = size === "sm" ? "text-sm" : "text-base";
  const textBody = size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "sm" ? "py-6" : size === "lg" ? "py-16" : "py-10";

  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center", padding, className)}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-destructive/10 mb-4",
          iconWrap,
        )}
      >
        <Icon className={cn(iconSize, "text-destructive")} />
      </div>
      <h3 className={cn("font-semibold text-foreground mb-1", textHead)}>{heading}</h3>
      <p className={cn("text-muted-foreground max-w-xs leading-relaxed", textBody)}>{body}</p>

      <div className="flex items-center gap-2 mt-4">
        {kind === "unauthorized" && onSignIn && (
          <Button size="sm" onClick={onSignIn}>
            Sign in again
          </Button>
        )}
        {meta.canRetry && onRetry && (
          <Button
            size="sm"
            variant={kind === "unauthorized" ? "outline" : "default"}
            onClick={onRetry}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Inline variant (for inside cards, no padding) ───────────────────────────

export function InlineError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const kind = classifyError(error);
  const meta = ERROR_META[kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{meta.subtitle}</span>
      {meta.canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 underline underline-offset-2 text-xs hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
