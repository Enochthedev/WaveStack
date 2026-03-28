import type React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ─── Base skeleton pulse ──────────────────────────────────────────────────────

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} style={style} />;
}

// ─── Generic stat card skeleton ───────────────────────────────────────────────

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-4 w-4 rounded-full" />
        </div>
        <Bone className="h-7 w-20 mb-2" />
        <Bone className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

// ─── Approval card skeleton ───────────────────────────────────────────────────

export function ApprovalCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bone className="h-4 w-4 rounded-full" />
          <Bone className="h-5 w-20 rounded-full" />
          <Bone className="h-4 w-40" />
        </div>
        <Bone className="h-3.5 w-12" />
      </div>
      <div className="flex gap-1">
        <Bone className="h-4 w-16 rounded-full" />
        <Bone className="h-4 w-16 rounded-full" />
      </div>
      <Bone className="h-14 w-full rounded-lg" />
      <div className="flex gap-2">
        <Bone className="h-7 w-20 rounded-md" />
        <Bone className="h-7 w-28 rounded-md" />
        <Bone className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
}

// ─── Clip card skeleton (grid) ────────────────────────────────────────────────

export function ClipCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <Bone className="w-full aspect-video" />
      <div className="p-3 space-y-2">
        <Bone className="h-4 w-3/4" />
        <div className="flex gap-1">
          <Bone className="h-3.5 w-12 rounded-full" />
          <Bone className="h-3.5 w-12 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Bone className="h-3 w-16" />
          <Bone className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────────────────────

export function TableRowSkeleton({ cols = 5, className }: { cols?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 px-4 py-3 border-b border-border/50", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Bone key={i} className="h-4 flex-1" style={{ maxWidth: `${80 + i * 20}px` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  );
}

// ─── List item skeleton ───────────────────────────────────────────────────────

export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-2 py-2.5", className)}>
      <Bone className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Bone className="h-3.5 w-2/3" />
        <Bone className="h-3 w-1/3" />
      </div>
      <Bone className="h-5 w-14 rounded-full shrink-0" />
    </div>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

export function ChartSkeleton({
  height = 200,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full animate-pulse", className)} style={{ height }}>
      <div className="w-full h-full bg-muted/40 rounded-lg flex items-end gap-1 px-2 pb-2 overflow-hidden">
        {[40, 65, 50, 80, 45, 90, 70, 55, 85, 60, 75, 95].map((h, i) => (
          <div key={i} className="flex-1 bg-muted rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Card skeleton (generic) ──────────────────────────────────────────────────

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Bone className="h-5 w-32" />
          <Bone className="h-7 w-20 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5" style={{ width: `${50 + i * 15}%` }} />
              <Bone className="h-3" style={{ width: `${30 + i * 10}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Platform badge skeleton ──────────────────────────────────────────────────

export function PlatformRowSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Bone className="h-8 w-8 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <Bone className="h-4 w-14" />
            <Bone className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page-level dashboard skeleton ───────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CardSkeleton rows={4} className="lg:col-span-2" />
        <CardSkeleton rows={3} />
      </div>
      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}
