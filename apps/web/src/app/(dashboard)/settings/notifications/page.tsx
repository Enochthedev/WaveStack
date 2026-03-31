"use client";

import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/lib/hooks/use-notifications";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

// ── Skeleton ────────────────────────────────────────────────────────────────

function PrefsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g}>
          <div className="h-3 w-20 rounded bg-muted mb-2" />
          {Array.from({ length: 3 }).map((_, r) => (
            <div
              key={r}
              className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 px-3 py-2.5"
            >
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-5 w-9 rounded-full bg-muted mx-auto" />
              <div className="h-5 w-9 rounded-full bg-muted mx-auto" />
              <div className="h-5 w-9 rounded-full bg-muted mx-auto" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: prefs, isLoading, isError } = useNotificationPrefs();
  const updatePrefs = useUpdateNotificationPrefs();

  type PrefKey = "email" | "inApp" | "push";

  function toggle(id: string, key: PrefKey) {
    if (!prefs) return;
    const updated = prefs.map((p) => (p.id === id ? { ...p, [key]: !p[key] } : p));
    updatePrefs.mutate(updated);
  }

  const categories = prefs ? [...new Set(prefs.map((p) => p.category))] : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how and when WaveStack notifies you.</CardDescription>
          </div>
          {updatePrefs.isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <EmptyState
            preset="offline"
            subtitle="Could not load notification preferences."
            size="sm"
          />
        ) : isLoading ? (
          <PrefsSkeleton />
        ) : !prefs || prefs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No notification preferences available.
          </p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-[1fr_80px_80px_80px] gap-2 px-1">
              <span />
              <span className="text-center text-xs font-medium text-muted-foreground">Email</span>
              <span className="text-center text-xs font-medium text-muted-foreground">In-app</span>
              <span className="text-center text-xs font-medium text-muted-foreground">Push</span>
            </div>
            <div className="space-y-5">
              {categories.map((cat: string) => (
                <div key={cat}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {prefs
                      .filter((p) => p.category === cat)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                        >
                          <span className="text-sm">{p.label}</span>
                          {(["email", "inApp", "push"] as PrefKey[]).map((key) => (
                            <div key={key} className="flex justify-center">
                              <Switch
                                checked={p[key] as boolean}
                                onCheckedChange={() => toggle(p.id, key)}
                                disabled={updatePrefs.isPending}
                                className="scale-90"
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
