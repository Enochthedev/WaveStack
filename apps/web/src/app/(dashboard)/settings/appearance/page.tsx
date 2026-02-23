"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shuffle, Loader2 } from "lucide-react";
import { useCompanionAvatar, DICEBEAR_STYLES, type DiceBearStyle } from "@/lib/use-companion-avatar";
import { useStreamerMode } from "@/lib/streamer-mode";
import { cn } from "@/lib/utils";

export default function AppearancePage() {
  const [darkMode,    setDarkMode]    = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [sidebarAuto, setSidebarAuto] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const { avatarUrl, style, seed, setStyle, setSeed, randomize } = useCompanionAvatar();
  const { enabled: streamerOn, toggle: toggleStreamer } = useStreamerMode();

  async function save() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Appearance saved");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Theme</CardTitle>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Dark Mode",              desc: "Use dark theme across the application",                           checked: darkMode,    set: setDarkMode    },
            { label: "Compact Mode",           desc: "Reduce spacing for denser layouts",                               checked: compactMode, set: setCompactMode },
            { label: "Auto-collapse Sidebar",  desc: "Sidebar collapses on smaller screens",                            checked: sidebarAuto, set: setSidebarAuto },
            { label: "Streamer Mode",          desc: "Blur sensitive info (emails, revenue, keys) while on stream. ⌘⇧S", checked: streamerOn,  set: toggleStreamer  },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={item.checked} onCheckedChange={item.set} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Companion</CardTitle>
          <CardDescription>Customise Wave&apos;s avatar — powered by DiceBear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 ring-2 ring-primary/30 overflow-hidden flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt="Companion avatar"
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This avatar appears on the floating companion button, chat panel, and message bubbles.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as DiceBearStyle)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DICEBEAR_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Seed</Label>
            <div className="flex gap-2">
              <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Enter a seed…" />
              <Button variant="outline" size="icon" onClick={randomize} title="Randomize">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quick Pick</Label>
            <div className="flex flex-wrap gap-3">
              {DICEBEAR_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  title={s.label}
                  className={cn(
                    "h-12 w-12 rounded-full overflow-hidden ring-2 transition-all hover:scale-110",
                    style === s.value
                      ? "ring-primary shadow-md shadow-primary/20"
                      : "ring-border hover:ring-primary/50"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/9.x/${s.value}/svg?seed=${encodeURIComponent(seed)}`}
                    alt={s.label}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
