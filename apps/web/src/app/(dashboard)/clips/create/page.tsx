"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function CreateClipPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    sourceUrl: "",
    startTime: "",
    duration: "",
    format: "mp4",
    clipName: "",
  });
  const [creating, setCreating] = useState(false);

  const isValid = form.sourceUrl.trim() !== "" && Number(form.duration) > 0;

  async function handleCreate() {
    if (!isValid) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1400));
    setCreating(false);
    toast.success(
      `Clip "${form.clipName || "Untitled clip"}" created — processing`
    );
    router.push("/clips");
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Create Clip" description="Extract a segment from a stream VOD" />

      <Card className="max-w-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="source-url">Source URL <span className="text-destructive">*</span></Label>
            <Input
              id="source-url"
              placeholder="https://twitch.tv/videos/..."
              value={form.sourceUrl}
              onChange={(e) => setForm((p) => ({ ...p, sourceUrl: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time (seconds)</Label>
              <Input
                id="start-time"
                type="number"
                placeholder="0"
                min={0}
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds) <span className="text-destructive">*</span></Label>
              <Input
                id="duration"
                type="number"
                placeholder="30"
                min={1}
                value={form.duration}
                onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={form.format}
              onValueChange={(v) => setForm((p) => ({ ...p, format: v }))}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">mp4</SelectItem>
                <SelectItem value="mov">mov</SelectItem>
                <SelectItem value="webm">webm</SelectItem>
                <SelectItem value="mkv">mkv</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clip-name">Clip Name (optional)</Label>
            <Input
              id="clip-name"
              placeholder="My awesome clip"
              value={form.clipName}
              onChange={(e) => setForm((p) => ({ ...p, clipName: e.target.value }))}
            />
          </div>

          {!isValid && (form.sourceUrl || form.duration) && (
            <p className="text-xs text-destructive">
              {!form.sourceUrl.trim()
                ? "Source URL is required."
                : "Duration must be greater than 0."}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating || !isValid}
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {creating ? "Creating clip…" : "Create Clip"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
