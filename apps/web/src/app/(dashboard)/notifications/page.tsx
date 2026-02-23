"use client";

import { useState } from "react";
import { toast } from "sonner";
import { notifications as initialNotifications } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield, Brain, Send, DollarSign, Workflow, Radio, Handshake, Users, Bell,
} from "lucide-react";

type NotificationType = "all" | "moderation" | "agent" | "publish" | "workflow" | "monetization" | "stream" | "sponsor" | "community";
type Notification = (typeof initialNotifications)[number];

const FILTERS: { label: string; value: NotificationType }[] = [
  { label: "All",          value: "all" },
  { label: "Moderation",   value: "moderation" },
  { label: "Agents",       value: "agent" },
  { label: "Publishing",   value: "publish" },
  { label: "Workflows",    value: "workflow" },
  { label: "Monetization", value: "monetization" },
  { label: "Stream",       value: "stream" },
];

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  moderation:   { icon: Shield,    color: "text-red-400 bg-red-500/10" },
  agent:        { icon: Brain,     color: "text-purple-400 bg-purple-500/10" },
  publish:      { icon: Send,      color: "text-blue-400 bg-blue-500/10" },
  monetization: { icon: DollarSign,color: "text-green-400 bg-green-500/10" },
  workflow:     { icon: Workflow,  color: "text-orange-400 bg-orange-500/10" },
  stream:       { icon: Radio,     color: "text-cyan-400 bg-cyan-500/10" },
  sponsor:      { icon: Handshake, color: "text-yellow-400 bg-yellow-500/10" },
  community:    { icon: Users,     color: "text-pink-400 bg-pink-500/10" },
};

function relTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType>("all");
  const [items, setItems] = useState<Notification[]>(initialNotifications);

  const unreadCount = items.filter((n) => !n.isRead).length;
  const filtered = filter === "all" ? items : items.filter((n) => n.type === filter);
  const unread = filtered.filter((n) => !n.isRead);
  const read   = filtered.filter((n) => n.isRead);

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    toast.success("Marked as read");
  }

  function markAllRead() {
    const unreadIds = new Set(filtered.filter((n) => !n.isRead).map((n) => n.id));
    if (unreadIds.size === 0) return;
    setItems((prev) => prev.map((n) => (unreadIds.has(n.id) ? { ...n, isRead: true } : n)));
    toast.success(`Marked ${unreadIds.size} notification${unreadIds.size !== 1 ? "s" : ""} as read`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Your activity and alerts">
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread.length === 0}>
          Mark all read
        </Button>
      </PageHeader>

      {/* Unread count */}
      {unreadCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{unreadCount}</span>{" "}
          unread notification{unreadCount !== 1 ? "s" : ""}
        </p>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Unread section */}
      {unread.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Unread</p>
          {unread.map((n) => {
            const { icon: Icon, color } = typeIcons[n.type] ?? { icon: Bell, color: "text-muted-foreground bg-muted" };
            return (
              <Card key={n.id} className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{relTime(n.createdAt)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </Button>
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Read section */}
      {read.length > 0 && (
        <div className="space-y-2">
          {unread.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Earlier</p>
          )}
          {read.map((n) => {
            const { icon: Icon, color } = typeIcons[n.type] ?? { icon: Bell, color: "text-muted-foreground bg-muted" };
            return (
              <Card key={n.id} className="opacity-70">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{relTime(n.createdAt)}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No notifications in this category
          </CardContent>
        </Card>
      )}
    </div>
  );
}
