"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, CheckCircle2, Plus, Trash2, Loader2 } from "lucide-react";
import { Sensitive } from "@/lib/streamer-mode";
import { apiKeys } from "@/lib/mock-data";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ApiPage() {
  const [keys,         setKeys]         = useState(apiKeys);
  const [copied,       setCopied]       = useState<string | null>(null);
  const [genOpen,      setGenOpen]      = useState(false);
  const [keyName,      setKeyName]      = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  function copy(id: string, val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  }

  async function generate() {
    if (!keyName.trim()) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 900));
    const newKey = {
      id:         `key-${Date.now()}`,
      name:       keyName,
      maskedKey:  `ws_live_${"•".repeat(24)}${Math.random().toString(36).slice(-6)}`,
      createdAt:  new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      scopes:     ["read", "write"],
    };
    setKeys((prev) => [newKey, ...prev]);
    setGenerating(false);
    setGenOpen(false);
    setKeyName("");
    toast.success(`API key "${newKey.name}" created`);
  }

  function confirmRevoke(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setRevokeTarget(null);
    toast.success("API key revoked");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Authenticate requests to the WaveStack API.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Generate key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {keys.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No API keys. Generate one above.</p>
          )}
          {keys.map((k) => (
            <div key={k.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {relDate(k.createdAt)} · Last used {relTime(k.lastUsedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => copy(k.id, k.maskedKey)}
                  >
                    {copied === k.id
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setRevokeTarget(k.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground flex-1 truncate">
                  <Sensitive>{k.maskedKey}</Sensitive>
                </code>
                <div className="flex gap-1 shrink-0">
                  {k.scopes.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] h-5 py-0 px-1.5">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use the WaveStack API to integrate publishing, clips, analytics, and agent tasks into your own tools.
          </p>
          <Button variant="outline" size="sm" onClick={() => toast.info("API docs coming soon")}>
            View API docs
          </Button>
        </CardContent>
      </Card>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate API Key</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                placeholder="e.g., My App Integration"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={generating || !keyName.trim()}>
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open: boolean) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any apps using this key will immediately lose access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && confirmRevoke(revokeTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
