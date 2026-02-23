"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mcpServers as initialServers, mcpTools as initialTools } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Server, Plug, Wrench, Loader2 } from "lucide-react";

type McpServer = (typeof initialServers)[number];
type McpTool   = (typeof initialTools)[number];

function formatRelativeTime(dateStr: string) {
  const diffMs   = Date.now() - new Date(dateStr).getTime();
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffDays > 0)  return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0)  return `${diffMins}m ago`;
  return "just now";
}

export default function McpPage() {
  const [servers, setServers]         = useState<McpServer[]>(initialServers);
  const [tools, setTools]             = useState<McpTool[]>(initialTools);
  const [toggling, setToggling]       = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<McpServer | null>(null);
  const [addOpen, setAddOpen]         = useState(false);
  const [saving, setSaving]           = useState(false);

  const [form, setForm] = useState({
    name: "",
    url: "",
    transport: "http",
  });

  async function toggleServer(server: McpServer) {
    if (server.status === "connected") {
      setDisconnectTarget(server);
      return;
    }
    setToggling(server.id);
    await new Promise((r) => setTimeout(r, 1000));
    setServers((prev) =>
      prev.map((s) =>
        s.id === server.id
          ? { ...s, status: "connected" as const, lastPingAt: new Date().toISOString() }
          : s
      )
    );
    setToggling(null);
    toast.success(`${server.name} connected`);
  }

  async function confirmDisconnect() {
    if (!disconnectTarget) return;
    setToggling(disconnectTarget.id);
    await new Promise((r) => setTimeout(r, 600));
    setServers((prev) =>
      prev.map((s) =>
        s.id === disconnectTarget.id ? { ...s, status: "disconnected" as const } : s
      )
    );
    setToggling(null);
    setDisconnectTarget(null);
    toast.success(`${disconnectTarget.name} disconnected`);
  }

  function toggleTool(id: string) {
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isEnabled: !t.isEnabled } : t))
    );
    const tool = tools.find((t) => t.id === id);
    toast.success(tool?.isEnabled ? "Tool disabled" : "Tool enabled");
  }

  async function handleAddServer() {
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const newServer: McpServer = {
      id: `mcp-${Date.now()}`,
      name: form.name,
      slug: form.name.toLowerCase().replace(/\s+/g, "-"),
      transport: form.transport as McpServer["transport"],
      status: "connected",
      toolCount: 0,
      lastPingAt: new Date().toISOString(),
    };
    setServers((prev) => [...prev, newServer]);
    setSaving(false);
    setAddOpen(false);
    setForm({ name: "", url: "", transport: "http" });
    toast.success(`${newServer.name} added and connected`);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="MCP Tools" description="Model Context Protocol server management">
        <Button onClick={() => setAddOpen(true)}>
          <Plug className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </PageHeader>

      {/* Connected Servers */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Server className="h-5 w-5" />
          Connected Servers
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{server.name}</CardTitle>
                  <StatusBadge status={server.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{server.transport}</Badge>
                  <span className="text-sm text-muted-foreground">{server.toolCount} tools</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last ping: {formatRelativeTime(server.lastPingAt)}
                </p>
                <Button
                  variant={server.status === "connected" ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={toggling === server.id}
                  onClick={() => toggleServer(server)}
                >
                  {toggling === server.id && (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  )}
                  {server.status === "connected" ? "Disconnect" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Available Tools */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Wrench className="h-5 w-5" />
          Available Tools
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <code className="text-sm font-mono font-medium whitespace-nowrap">
                      {tool.name}
                    </code>
                    <Badge variant="outline" className="shrink-0">
                      {tool.serverName}
                    </Badge>
                    <span className="text-sm text-muted-foreground truncate">
                      {tool.description}
                    </span>
                  </div>
                  <Switch
                    checked={tool.isEnabled}
                    onCheckedChange={() => toggleTool(tool.id)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Add Server Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mcp-name">Server Name</Label>
              <Input
                id="mcp-name"
                placeholder="e.g., YouTube MCP"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-url">Server URL</Label>
              <Input
                id="mcp-url"
                placeholder="https://mcp.example.com"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Transport</Label>
              <Select
                value={form.transport}
                onValueChange={(v) => setForm((p) => ({ ...p, transport: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="stdio">stdio</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddServer}
              disabled={saving || !form.name.trim() || !form.url.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(open: boolean) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              All tools from this server will become unavailable to your agents until reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
