"use client";

/**
 * QueryBoundary — wraps any TanStack Query result and renders the correct
 * loading / error / empty / success state automatically.
 *
 * Usage:
 * ```tsx
 * <QueryBoundary
 *   status={query.status}
 *   error={query.error}
 *   isEmpty={data.length === 0}
 *   skeleton={<ListSkeleton />}
 *   emptyPreset="no-clips"
 *   emptyTitle="No clips yet"
 *   emptyCta={{ label: "Create clip", onClick: () => {} }}
 * >
 *   {data.map(...)}
 * </QueryBoundary>
 * ```
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState, type EmptyStatePreset } from "./empty-state";
import { ErrorState } from "./error-state";
import { CardSkeleton } from "./skeleton-card";

interface QueryBoundaryProps {
  /** TanStack Query status string */
  status: "pending" | "error" | "success";
  /** The raw error (from query.error) */
  error?: unknown;
  /** Custom retry fn (passed to ErrorState) */
  onRetry?: () => void;
  /** Custom sign-in fn — shown when error is 401 */
  onSignIn?: () => void;

  /** Whether the fetched data is empty (e.g. array.length === 0) */
  isEmpty?: boolean;

  // ── Loading slot ──────────────────────────────────────────────────────────
  /** What to render while loading. Defaults to a generic CardSkeleton. */
  skeleton?: ReactNode;

  // ── Empty slot ────────────────────────────────────────────────────────────
  emptyPreset?: EmptyStatePreset;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: LucideIcon;
  emptyCta?: { label: string; onClick: () => void };
  emptySecondaryCta?: { label: string; onClick: () => void };
  /** Fully custom empty node (overrides all emptyXxx props) */
  emptyNode?: ReactNode;

  // ── Success slot ──────────────────────────────────────────────────────────
  children: ReactNode;

  className?: string;
}

export function QueryBoundary({
  status,
  error,
  onRetry,
  onSignIn,
  isEmpty = false,
  skeleton,
  emptyPreset = "generic",
  emptyTitle,
  emptySubtitle,
  emptyIcon,
  emptyCta,
  emptySecondaryCta,
  emptyNode,
  children,
  className,
}: QueryBoundaryProps) {
  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === "pending") {
    return <>{skeleton ?? <CardSkeleton className={className} />}</>;
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === "error") {
    return <ErrorState error={error} onRetry={onRetry} onSignIn={onSignIn} className={className} />;
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (isEmpty) {
    if (emptyNode) return <>{emptyNode}</>;
    return (
      <EmptyState
        preset={emptyPreset}
        icon={emptyIcon}
        title={emptyTitle}
        subtitle={emptySubtitle}
        cta={emptyCta}
        secondaryCta={emptySecondaryCta}
        className={className}
      />
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  return <>{children}</>;
}

// ─── Convenience variant for infinite queries ─────────────────────────────────

interface InfiniteQueryBoundaryProps extends Omit<QueryBoundaryProps, "isEmpty"> {
  totalItems: number;
}

export function InfiniteQueryBoundary({ totalItems, ...rest }: InfiniteQueryBoundaryProps) {
  return <QueryBoundary isEmpty={totalItems === 0} {...rest} />;
}
