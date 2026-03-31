"use client";

import { useState } from "react";
import { toast } from "sonner";
// TODO: wire to real auto-clip settings API when available
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, Plus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type KeywordTrigger = {
  id: string;
  keyword: string;
  isEnabled: boolean;
  triggerCount: number;
};

type HighlightSignal = {
  id: string;
  type: string;
  label: string;
  isEnabled: boolean;
};

const DEFAULT_SIGNALS: HighlightSignal[] = [
  { id: "1", type: "viewer_spike", label: "Viewer count spike (>20%)", isEnabled: true },
  { id: "2", type: "chat_velocity", label: "Chat moving fast (>5 msg/sec)", isEnabled: true },
  { id: "3", type: "emote_burst", label: "Emote burst (>50 emotes in 5s)", isEnabled: true },
  { id: "4", type: "audio_peak", label: "Audio volume peak", isEnabled: false },
  { id: "5", type: "raid", label: "Incoming raid", isEnabled: true },
];

const signalColors: Record<string, string> = {
  viewer_spike: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  chat_velocity: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  emote_burst: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  audio_peak: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  raid: "bg-green-500/10 text-green-400 border-green-500/30",
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function AutoClipPage() {
  const [enabled, setEnabled] = useState(false);
  const [clipLength, setClipLength] = useState(30);
  const [format, setFormat] = useState("mp4");
  const [confidence, setConfidence] = useState(75);
  const [keywords, setKeywords] = useState<KeywordTrigger[]>([]);
  const [signals, setSignals] = useState<HighlightSignal[]>(DEFAULT_SIGNALS);
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast.success("Auto-clip settings saved");
  }

  function toggleKeyword(id: string) {
    setKeywords((prev) => prev.map((k) => (k.id === id ? { ...k, isEnabled: !k.isEnabled } : k)));
  }

  function removeKeyword(id: string) {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  function addKeyword() {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywords.some((k) => k.keyword.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Keyword already exists");
      return;
    }
    setKeywords((prev) => [
      ...prev,
      { id: `kw-${Date.now()}`, keyword: trimmed, isEnabled: true, triggerCount: 0 },
    ]);
    setNewKeyword("");
  }

  function toggleSignal(id: string) {
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s)));
  }

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
              className={
                enabled
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-muted text-muted-foreground"
              }
            >
              {enabled ? "Active" : "Paused"}
            </Badge>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Default settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="clip-length" className="w-36 shrink-0 text-sm">
              Clip Length
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="clip-length"
                type="number"
                min={5}
                max={300}
                value={clipLength}
                onChange={(e) => setClipLength(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-36 shrink-0 text-sm">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
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
              <Slider
                min={50}
                max={100}
                step={1}
                value={[confidence]}
                onValueChange={([v]) => setConfidence(v)}
                className="flex-1"
              />
              <span className="w-10 shrink-0 text-sm font-medium text-muted-foreground">
                {confidence}%
              </span>
            </div>
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Keyword triggers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Keyword Triggers</CardTitle>
          <Badge variant="secondary">{keywords.filter((k) => k.isEnabled).length} active</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No keyword triggers. Add one below.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {keywords.map((kw) => (
                <div key={kw.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="rounded bg-muted px-2 py-1 font-mono text-xs">{kw.keyword}</span>
                  <span className="flex-1 text-xs text-muted-foreground">
                    triggered {kw.triggerCount} times
                  </span>
                  <Switch checked={kw.isEnabled} onCheckedChange={() => toggleKeyword(kw.id)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeKeyword(kw.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Input
              placeholder="New keyword…"
              className="flex-1"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={addKeyword}
              disabled={!newKeyword.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Highlight detection */}
      <Card>
        <CardHeader>
          <CardTitle>Highlight Detection Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {signals.map((signal) => (
              <div key={signal.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="flex-1 font-medium">{signal.label}</span>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${signalColors[signal.type] ?? ""}`}
                >
                  {signal.type.replace(/_/g, " ")}
                </Badge>
                <Switch
                  checked={signal.isEnabled}
                  onCheckedChange={() => toggleSignal(signal.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
