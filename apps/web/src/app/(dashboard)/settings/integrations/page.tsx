"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePlatforms, useDisconnectPlatform } from "@/lib/hooks/use-platforms";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Plus, Loader2 } from "lucide-react";
import { platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PlatformSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-20 rounded bg-muted animate-pulse shrink-0" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: platformsData, isLoading, isError } = usePlatforms();
  const disconnectPlatform = useDisconnectPlatform();

  const platforms = platformsData ?? [];

  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  function handleDisconnect(platformId: string) {
    disconnectPlatform.mutate(platformId);
  }

  function handleConnect(platformId: string) {
    toast.info(`Redirecting to ${platformLabel[platformId] ?? platformId} OAuth…`);
  }

  function saveWebhook() {
    if (!webhookUrl.trim()) return;
    toast.success("Webhook added");
    setWebhookOpen(false);
    setWebhookUrl("");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
          <CardDescription>
            Connect your streaming and social accounts so WaveStack can publish and pull analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {isError ? (
            <EmptyState preset="offline" subtitle="Could not load platforms." size="sm" />
          ) : isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <PlatformSkeleton key={i} />)
          ) : platforms.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No platforms available. Check back later.
            </div>
          ) : (
            platforms.map((it) => (
              <div key={it.platform} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <PlatformIcon platform={it.platform} size={20} branded />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {platformLabel[it.platform] ?? it.displayName ?? it.platform}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.connected && it.username ? it.username : "Not connected"}
                  </p>
                </div>
                {it.connected ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium hidden sm:inline">
                      Connected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={disconnectPlatform.isPending}
                      onClick={() => handleDisconnect(it.platform)}
                    >
                      {disconnectPlatform.isPending &&
                      disconnectPlatform.variables === it.platform ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Disconnect"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleConnect(it.platform)}>
                    Connect
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Receive real-time events from WaveStack in your own systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">No webhooks configured</p>
            <Button size="sm" variant="outline" onClick={() => setWebhookOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://your-server.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveWebhook} disabled={!webhookUrl.trim()}>
              Add Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
