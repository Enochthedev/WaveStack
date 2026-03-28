"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FlaskConical,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Bot,
  Zap,
  Webhook,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type LogLevel = "info" | "success" | "error" | "warn" | "system";

type LogLine = {
  id: string;
  ts: string;
  level: LogLevel;
  message: string;
};

type RunStatus = "idle" | "running" | "success" | "error";

// ── Mock workflow + agent data ─────────────────────────────────────────────

const WORKFLOWS = [
  { id: "wf-1", name: "Post-stream clip pipeline" },
  { id: "wf-2", name: "Auto-tweet on stream end" },
  { id: "wf-3", name: "Raid response sequence" },
  { id: "wf-4", name: "Weekly analytics digest" },
];

const AGENTS = [
  { id: "content", name: "Content Agent" },
  { id: "clip", name: "Clip Agent" },
  { id: "moderation", name: "Moderation Agent" },
  { id: "analytics", name: "Analytics Agent" },
];

const BOT_COMMANDS = ["!clip", "!uptime", "!discord", "!so", "!lurk", "!quote"];

const WEBHOOK_EVENTS = [
  { id: "stream.live", label: "stream.live" },
  { id: "stream.end", label: "stream.end" },
  { id: "follower.new", label: "follower.new" },
  { id: "subscriber.new", label: "subscriber.new" },
  { id: "raid.incoming", label: "raid.incoming" },
  { id: "clip.ready", label: "clip.ready" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

let logId = 0;
function mkLog(level: LogLevel, message: string): LogLine {
  return {
    id: String(++logId),
    ts: new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    level,
    message,
  };
}

const levelStyle: Record<LogLevel, string> = {
  system: "text-muted-foreground",
  info: "text-blue-400",
  success: "text-green-400",
  error: "text-red-400",
  warn: "text-yellow-400",
};

// ── Workflow runner ────────────────────────────────────────────────────────

async function simulateWorkflow(
  workflowId: string,
  addLog: (l: LogLine) => void,
  setStatus: (s: RunStatus) => void,
) {
  const name = WORKFLOWS.find((w) => w.id === workflowId)?.name ?? workflowId;
  setStatus("running");
  addLog(mkLog("system", `[DRY RUN] Starting: "${name}"`));
  await delay(400);
  addLog(mkLog("info", "Trigger: stream.end received"));
  await delay(300);
  addLog(mkLog("info", "Step 1: Checking recent clips…"));
  await delay(600);
  addLog(mkLog("success", "Step 1: Found 3 clips from last stream"));
  await delay(400);
  addLog(mkLog("info", "Step 2: Generating tweet draft…"));
  await delay(700);
  addLog(
    mkLog("success", 'Step 2: Draft ready — "Streamed for 2h tonight! New clips available ▶"'),
  );
  await delay(300);
  addLog(mkLog("info", "Step 3: [DRY RUN] Would post to Twitter/X — skipped"));
  await delay(400);
  addLog(mkLog("warn", "Step 3: No Twitch VOD URL yet — marked for retry"));
  await delay(500);
  addLog(mkLog("success", "[DRY RUN] Workflow completed (3/3 steps, 1 warning, 0 errors)"));
  setStatus("success");
}

// ── Agent runner ───────────────────────────────────────────────────────────

async function simulateAgent(
  agentId: string,
  prompt: string,
  addLog: (l: LogLine) => void,
  setStatus: (s: RunStatus) => void,
) {
  const name = AGENTS.find((a) => a.id === agentId)?.name ?? agentId;
  setStatus("running");
  addLog(
    mkLog(
      "system",
      `[DRY RUN] ${name} — task: "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"`,
    ),
  );
  await delay(500);
  addLog(mkLog("info", "Analysing task…"));
  await delay(800);
  addLog(mkLog("info", "Planning actions (no API calls in dry run)…"));
  await delay(600);
  addLog(mkLog("success", "Plan: [1] Fetch analytics, [2] Draft content, [3] Queue for approval"));
  await delay(700);
  addLog(mkLog("info", "[DRY RUN] Would use 2 MCP tools: analytics.fetch, content.generate"));
  await delay(400);
  addLog(mkLog("warn", "Note: Knowledge base has no entries for this topic yet"));
  await delay(500);
  addLog(mkLog("success", "[DRY RUN] Task completed — output would be sent to approval queue"));
  setStatus("success");
}

// ── Bot command runner ─────────────────────────────────────────────────────

async function simulateBotCommand(
  cmd: string,
  channel: string,
  addLog: (l: LogLine) => void,
  setStatus: (s: RunStatus) => void,
) {
  setStatus("running");
  addLog(mkLog("system", `[DRY RUN] Simulating ${cmd} in #${channel || "general"}`));
  await delay(300);
  addLog(mkLog("info", `Command received: ${cmd} from TestUser123`));
  await delay(500);

  const responses: Record<string, string> = {
    "!clip": 'Would create clip → replying: "Clip created! twitch.tv/clip/abc123"',
    "!uptime": 'Would reply: "Stream has been live for 1h 23m"',
    "!discord": 'Would reply: "Join the server: discord.gg/wavestack"',
    "!so": 'Would shoutout: "Go follow @WaveRider — great streamer!"',
    "!lurk": 'Would reply: "WaveRider99 is lurking! 👀"',
    "!quote": "Would reply: \"#42 — 'This game is rigged' — WaveCreator (2026)\"",
  };
  addLog(mkLog("info", responses[cmd] ?? `Would process command: ${cmd}`));
  await delay(400);
  addLog(mkLog("info", "Rate limit check: OK"));
  addLog(mkLog("success", "[DRY RUN] Command handled (no actual message sent)"));
  setStatus("success");
}

// ── Webhook runner ─────────────────────────────────────────────────────────

async function simulateWebhook(
  event: string,
  payload: string,
  addLog: (l: LogLine) => void,
  setStatus: (s: RunStatus) => void,
) {
  setStatus("running");
  addLog(mkLog("system", `[DRY RUN] Firing event: ${event}`));
  await delay(300);

  try {
    JSON.parse(payload || "{}");
    addLog(mkLog("info", "Payload: valid JSON ✓"));
  } catch {
    addLog(mkLog("error", "Payload: invalid JSON — using empty object"));
  }

  await delay(500);
  addLog(mkLog("info", "Matching registered workflows…"));
  await delay(400);
  addLog(
    mkLog(
      "success",
      "3 workflows would trigger: post-stream pipeline, analytics digest, discord notify",
    ),
  );
  await delay(600);
  addLog(mkLog("info", "[DRY RUN] Would notify 2 active agents"));
  await delay(400);
  addLog(mkLog("success", "[DRY RUN] Event dispatched (no real side effects)"));
  setStatus("success");
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Panel component ────────────────────────────────────────────────────────

function LogPane({ logs, onClear }: { logs: LogLine[]; onClear: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" />
          Output
        </Label>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      <ScrollArea className="h-48 rounded-md border bg-black/90 p-3">
        <div className="space-y-0.5 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-muted-foreground/50 italic">Run something to see output here…</p>
          ) : (
            logs.map((line) => (
              <p key={line.id} className={cn("flex gap-2", levelStyle[line.level])}>
                <span className="shrink-0 text-muted-foreground/40">{line.ts}</span>
                <span>{line.message}</span>
              </p>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  if (status === "idle") return null;
  if (status === "running")
    return (
      <Badge variant="outline" className="text-blue-400 border-blue-400/30 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    );
  if (status === "success")
    return (
      <Badge variant="outline" className="text-green-400 border-green-400/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Passed
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-red-400 border-red-400/30 gap-1">
      <XCircle className="h-3 w-3" />
      Failed
    </Badge>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SandboxPage() {
  // Workflow tab
  const [wfId, setWfId] = useState(WORKFLOWS[0].id);
  const [wfLogs, setWfLogs] = useState<LogLine[]>([]);
  const [wfStatus, setWfStatus] = useState<RunStatus>("idle");

  // Agent tab
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentLogs, setAgentLogs] = useState<LogLine[]>([]);
  const [agentStatus, setAgentStatus] = useState<RunStatus>("idle");

  // Bot tab
  const [botCmd, setBotCmd] = useState(BOT_COMMANDS[0]);
  const [botChannel, setBotChannel] = useState("general");
  const [botLogs, setBotLogs] = useState<LogLine[]>([]);
  const [botStatus, setBotStatus] = useState<RunStatus>("idle");

  // Webhook tab
  const [webhookEvent, setWebhookEvent] = useState(WEBHOOK_EVENTS[0].id);
  const [webhookPayload, setWebhookPayload] = useState(
    '{\n  "user": "WaveRider99",\n  "platform": "twitch"\n}',
  );
  const [webhookLogs, setWebhookLogs] = useState<LogLine[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<RunStatus>("idle");

  function addTo(setter: React.Dispatch<React.SetStateAction<LogLine[]>>) {
    return (l: LogLine) => setter((prev) => [...prev, l]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sandbox"
        description="Dry-run workflows, agents, bot commands, and webhooks — no real side effects"
      >
        <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          Dry Run Mode
        </Badge>
      </PageHeader>

      {/* What sandbox mode means */}
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm flex items-start gap-3">
        <FlaskConical className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Sandbox is always safe.</strong> Nothing in this
          environment makes real API calls, sends messages, posts to platforms, or modifies your
          data. Use it to validate logic, debug agents, and preview outputs before going live.
        </p>
      </div>

      <Tabs defaultValue="workflow">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="workflow" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Agent
          </TabsTrigger>
          <TabsTrigger value="bot" className="gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Bot Command
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-1.5">
            <Webhook className="h-3.5 w-3.5" />
            Webhook
          </TabsTrigger>
        </TabsList>

        {/* ── Workflow ── */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Workflow Dry Run
                <StatusBadge status={wfStatus} />
              </CardTitle>
              <CardDescription>
                Run any workflow in simulation mode — see every step without executing real actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Workflow</Label>
                <Select value={wfId} onValueChange={setWfId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOWS.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <LogPane
                logs={wfLogs}
                onClear={() => {
                  setWfLogs([]);
                  setWfStatus("idle");
                }}
              />
              <Button
                className="w-full"
                disabled={wfStatus === "running"}
                onClick={() => simulateWorkflow(wfId, addTo(setWfLogs), setWfStatus)}
              >
                {wfStatus === "running" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {wfStatus === "running" ? "Running…" : "Run Dry Test"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Agent ── */}
        <TabsContent value="agent">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Agent Dry Run
                <StatusBadge status={agentStatus} />
              </CardTitle>
              <CardDescription>
                Give an agent a task and see how it plans to execute — no real API calls made.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENTS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-prompt">Task</Label>
                  <Input
                    id="agent-prompt"
                    placeholder="Generate a clip highlight…"
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                  />
                </div>
              </div>
              <LogPane
                logs={agentLogs}
                onClear={() => {
                  setAgentLogs([]);
                  setAgentStatus("idle");
                }}
              />
              <Button
                className="w-full"
                disabled={agentStatus === "running" || !agentPrompt.trim()}
                onClick={() =>
                  simulateAgent(agentId, agentPrompt, addTo(setAgentLogs), setAgentStatus)
                }
              >
                {agentStatus === "running" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {agentStatus === "running" ? "Simulating…" : "Simulate Agent"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bot Command ── */}
        <TabsContent value="bot">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Bot Command Tester
                <StatusBadge status={botStatus} />
              </CardTitle>
              <CardDescription>
                Preview bot responses without sending anything to chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Command</Label>
                  <Select value={botCmd} onValueChange={setBotCmd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOT_COMMANDS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bot-channel">Channel</Label>
                  <Input
                    id="bot-channel"
                    placeholder="general"
                    value={botChannel}
                    onChange={(e) => setBotChannel(e.target.value)}
                  />
                </div>
              </div>
              <LogPane
                logs={botLogs}
                onClear={() => {
                  setBotLogs([]);
                  setBotStatus("idle");
                }}
              />
              <Button
                className="w-full"
                disabled={botStatus === "running"}
                onClick={() =>
                  simulateBotCommand(botCmd, botChannel, addTo(setBotLogs), setBotStatus)
                }
              >
                {botStatus === "running" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {botStatus === "running" ? "Testing…" : "Test Command"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Webhook ── */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Webhook Event Simulator
                <StatusBadge status={webhookStatus} />
              </CardTitle>
              <CardDescription>
                Fire a platform event and see which workflows and agents would trigger.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={webhookEvent} onValueChange={setWebhookEvent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEBHOOK_EVENTS.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-payload">Payload (JSON)</Label>
                <Textarea
                  id="webhook-payload"
                  rows={4}
                  className="font-mono text-xs"
                  value={webhookPayload}
                  onChange={(e) => setWebhookPayload(e.target.value)}
                />
              </div>
              <LogPane
                logs={webhookLogs}
                onClear={() => {
                  setWebhookLogs([]);
                  setWebhookStatus("idle");
                }}
              />
              <Button
                className="w-full"
                disabled={webhookStatus === "running"}
                onClick={() =>
                  simulateWebhook(
                    webhookEvent,
                    webhookPayload,
                    addTo(setWebhookLogs),
                    setWebhookStatus,
                  )
                }
              >
                {webhookStatus === "running" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {webhookStatus === "running" ? "Firing…" : "Fire Event"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
