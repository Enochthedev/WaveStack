"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Plus, Loader2 } from "lucide-react";
import { integrations } from "@/lib/mock-data";
import { platformLabel } from "@/lib/colors";
import { PlatformIcon } from "@/components/icons/platform-icon";

export default function IntegrationsPage() {
  const [items,         setItems]         = useState(integrations);
  const [webhookOpen,   setWebhookOpen]   = useState(false);
  const [webhookUrl,    setWebhookUrl]    = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [connecting,    setConnecting]    = useState<string | null>(null);

  async function toggle(id: string) {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    setConnecting(id);
    await new Promise((r) => setTimeout(r, 900));
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, connected: !it.connected } : it))
    );
    setConnecting(null);
    toast.success(`${platformLabel[id] ?? id} ${item.connected ? "disconnected" : "connected"}`);
  }

  async function saveWebhook() {
    if (!webhookUrl.trim()) return;
    setSavingWebhook(true);
    await new Promise((r) => setTimeout(r, 700));
    setSavingWebhook(false);
    setWebhookOpen(false);
    setWebhookUrl("");
    toast.success("Webhook added");
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
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <PlatformIcon platform={it.id} size={20} branded />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{platformLabel[it.id] ?? it.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {it.connected && it.username ? it.username : "Not connected"}
                </p>
              </div>
              {it.connected ? (
                <div className="flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium hidden sm:inline">Connected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={connecting === it.id}
                    onClick={() => toggle(it.id)}
                  >
                    {connecting === it.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : "Disconnect"}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={connecting === it.id}
                  onClick={() => toggle(it.id)}
                >
                  {connecting === it.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : "Connect"}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Receive real-time events from WaveStack in your own systems.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">No webhooks configured</p>
            <Button size="sm" variant="outline" onClick={() => setWebhookOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Webhook</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setWebhookOpen(false)}>Cancel</Button>
            <Button onClick={saveWebhook} disabled={savingWebhook || !webhookUrl.trim()}>
              {savingWebhook && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
