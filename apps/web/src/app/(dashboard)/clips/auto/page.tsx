"use client";

import { autoClipRules } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const signalColors: Record<string, string> = {
  viewer_spike:  "bg-blue-500/10 text-blue-400 border-blue-500/30",
  chat_velocity: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  emote_burst:   "bg-pink-500/10 text-pink-400 border-pink-500/30",
  audio_peak:    "bg-orange-500/10 text-orange-400 border-orange-500/30",
  raid:          "bg-green-500/10 text-green-400 border-green-500/30",
};

export default function AutoClipPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Auto-Clip Settings" description="Configure automatic clip detection" />

      {/* Master toggle */}
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <p className="font-semibold">Auto-Clip Detection</p>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically clips based on keywords and highlight signals
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant="outline"
              className={autoClipRules.isEnabled
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-muted text-muted-foreground"}
            >
              {autoClipRules.isEnabled ? "Active" : "Paused"}
            </Badge>
            <Switch checked={autoClipRules.isEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Default settings */}
      <Card>
        <CardHeader><CardTitle>Default Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="clip-length" className="w-36 shrink-0 text-sm">Clip Length</Label>
            <div className="flex items-center gap-2">
              <Input id="clip-length" type="number" defaultValue={autoClipRules.clipLength} className="w-24" />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-36 shrink-0 text-sm">Format</Label>
            <Select defaultValue={autoClipRules.format}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">mp4</SelectItem>
                <SelectItem value="mov">mov</SelectItem>
                <SelectItem value="webm">webm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-36 shrink-0 text-sm">Min Confidence</Label>
            <div className="flex flex-1 items-center gap-4">
              <Slider min={50} max={100} step={1} defaultValue={[autoClipRules.minConfidence]} className="flex-1" />
              <span className="w-10 shrink-0 text-sm font-medium text-muted-foreground">
                {autoClipRules.minConfidence}%
              </span>
            </div>
          </div>

          <Button size="sm">Save Settings</Button>
        </CardContent>
      </Card>

      {/* Keyword triggers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Keyword Triggers</CardTitle>
          <Button variant="outline" size="sm">Add Keyword</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border">
            {autoClipRules.keywordTriggers.map((kw) => (
              <div key={kw.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">{kw.keyword}</span>
                <span className="flex-1 text-xs text-muted-foreground">triggered {kw.triggerCount} times</span>
                <Switch checked={kw.isEnabled} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Input placeholder="New keyword..." className="flex-1" />
            <Button size="sm" variant="secondary">Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Highlight detection */}
      <Card>
        <CardHeader><CardTitle>Highlight Detection Signals</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {autoClipRules.highlightDetection.map((signal) => (
              <div key={signal.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="flex-1 font-medium">{signal.label}</span>
                <Badge variant="outline" className={`shrink-0 text-xs ${signalColors[signal.type] ?? ""}`}>
                  {signal.type.replace(/_/g, " ")}
                </Badge>
                <Switch checked={signal.isEnabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
