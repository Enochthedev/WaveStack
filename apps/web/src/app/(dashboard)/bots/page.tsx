"use client";

import { useState } from "react";
import { toast } from "sonner";
import { bots as initialBots } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Bot,
  MessageSquare,
  Terminal,
  RefreshCw,
  Loader2,
  Link2,
  CheckCircle2,
  ExternalLink,
  Unlink,
  KeyRound,
} from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformLabel } from "@/lib/colors";
import { cn } from "@/lib/utils";

type BotData = (typeof initialBots)[number];

// ── Mock logs ────────────────────────────────────────────────────────────────

const MOCK_LOGS: Record<string, string[]> = {
  discord: [
    "[10:42:03] INFO  Command !clip triggered by StreamerXYZ",
    "[10:42:04] INFO  Clip created: clip_8f2a1b",
    "[10:41:55] INFO  Moderation: Deleted spam message from user123",
    "[10:41:30] INFO  New subscriber: WaveRider99 (tier 1)",
    "[10:40:12] INFO  Command !discord triggered — invite link sent",
    "[10:39:45] WARN  Rate limit hit on #general channel",
    "[10:38:00] INFO  Bot connected to 3 Discord servers",
  ],
  twitch: [
    "[10:42:10] INFO  Raid incoming from TwitchChannel (124 viewers)",
    "[10:42:10] INFO  Raid response posted in chat",
    "[10:41:50] INFO  Keyword 'giveaway' detected — response sent",
    "[10:41:20] INFO  Command !uptime responded: 1h 23m",
    "[10:40:55] INFO  Lurk mode: 0 users entered silent mode",
    "[10:39:00] INFO  Command !followage queried for GamingPro",
    "[10:38:30] INFO  Connected to channel wavecreator",
  ],
  telegram: [
    "[10:41:00] INFO  Bot started",
    "[10:40:00] INFO  Waiting for messages...",
  ],
  whatsapp: [
    "[10:41:00] WARN  Bot offline — API not configured",
  ],
};

function getLogsForBot(botId: string): string[] {
  return MOCK_LOGS[botId] ?? [
    "[10:42:00] INFO  Bot online",
    "[10:41:00] INFO  Listening for events...",
  ];
}

// ── Third-party bots ─────────────────────────────────────────────────────────

type ThirdPartyBot = {
  id:       string;
  name:     string;
  tags:     string[];
  platform: "twitch" | "youtube" | "discord" | "multi";
  desc:     string;
  tokenLabel: string;
  tokenHint:  string;
};

const THIRD_PARTY_BOTS: ThirdPartyBot[] = [
  {
    id: "nightbot",
    name: "Nightbot",
    tags: ["commands", "timers", "spam filter"],
    platform: "multi",
    desc: "Free cloud-based bot for Twitch & YouTube. Custom commands, spam protection, timers, and more.",
    tokenLabel: "API Token",
    tokenHint:  "Find it at nightbot.tv → Dashboard → API",
  },
  {
    id: "streamelements",
    name: "StreamElements",
    tags: ["commands", "loyalty", "overlays"],
    platform: "multi",
    desc: "All-in-one bot with chat commands, loyalty points, giveaways, tipping, and stream overlays.",
    tokenLabel: "JWT Token",
    tokenHint:  "Find it at streamelements.com → Account → Channels",
  },
  {
    id: "moobot",
    name: "Moobot",
    tags: ["commands", "polls", "giveaways"],
    platform: "twitch",
    desc: "Twitch-focused bot with custom commands, polls, subscriber perks, and detailed chat stats.",
    tokenLabel: "API Key",
    tokenHint:  "Find it at moo.bot → Settings → API",
  },
  {
    id: "fossabot",
    name: "Fossabot",
    tags: ["commands", "variables", "integrations"],
    platform: "multi",
    desc: "Powerful chat bot with an extensive variable system, built-in integrations, and real-time events.",
    tokenLabel: "API Secret",
    tokenHint:  "Find it at fossabot.com → Settings → API",
  },
  {
    id: "mee6",
    name: "MEE6",
    tags: ["moderation", "levels", "automod"],
    platform: "discord",
    desc: "The most popular Discord bot. Leveling, automod, announcements, welcome messages, and more.",
    tokenLabel: "API Token",
    tokenHint:  "Find it at mee6.xyz → Dashboard → Plugins → API",
  },
  {
    id: "dyno",
    name: "Dyno",
    tags: ["moderation", "logging", "fun"],
    platform: "discord",
    desc: "Feature-rich Discord utility bot. Moderation, logging, role management, and custom commands.",
    tokenLabel: "Bot Token",
    tokenHint:  "Find it at dyno.gg → Dashboard → Settings",
  },
  {
    id: "carlbot",
    name: "Carl-bot",
    tags: ["roles", "logging", "automod"],
    platform: "discord",
    desc: "Powerful Discord bot for reaction roles, logging, automod, embeds, and custom commands.",
    tokenLabel: "Bot Token",
    tokenHint:  "Find it at carl.gg → Dashboard → Settings",
  },
];

const PLATFORM_TAG: Record<ThirdPartyBot["platform"], string> = {
  twitch:  "Twitch",
  youtube: "YouTube",
  discord: "Discord",
  multi:   "Multi-platform",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BotsPage() {
  // WaveStack bots
  const [bots,            setBots]            = useState<BotData[]>(initialBots);
  const [configBot,       setConfigBot]        = useState<BotData | null>(null);
  const [configPrefix,    setConfigPrefix]     = useState("");
  const [configSaving,    setConfigSaving]     = useState(false);
  const [logsBot,         setLogsBot]          = useState<BotData | null>(null);
  const [combinedLogsOpen, setCombinedLogsOpen] = useState(false);
  const [restartOpen,     setRestartOpen]      = useState(false);
  const [restarting,      setRestarting]       = useState(false);
  const [syncing,         setSyncing]          = useState(false);

  // Third-party bots
  const [connected,       setConnected]        = useState<Record<string, boolean>>({});
  const [connectTarget,   setConnectTarget]    = useState<ThirdPartyBot | null>(null);
  const [tokenInput,      setTokenInput]       = useState("");
  const [tokenSaving,     setTokenSaving]      = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<ThirdPartyBot | null>(null);

  // ── WaveStack bot handlers ───────────────────────────────────────────────

  function openConfig(bot: BotData) {
    setConfigBot(bot);
    setConfigPrefix("!");
  }

  async function saveConfig() {
    if (!configBot) return;
    setConfigSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setConfigSaving(false);
    setConfigBot(null);
    toast.success(`${configBot.name} configuration saved`);
  }

  async function handleRestartAll() {
    setRestarting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setBots((prev) => prev.map((b) => ({ ...b, status: "online" as const })));
    setRestarting(false);
    setRestartOpen(false);
    toast.success("All bots restarted successfully");
  }

  async function handleSync() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSyncing(false);
    toast.success("Commands synced across all bots");
  }

  // ── Third-party handlers ─────────────────────────────────────────────────

  function openConnect(bot: ThirdPartyBot) {
    setConnectTarget(bot);
    setTokenInput("");
  }

  async function saveConnect() {
    if (!connectTarget || !tokenInput.trim()) return;
    setTokenSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setConnected((prev) => ({ ...prev, [connectTarget.id]: true }));
    setTokenSaving(false);
    setConnectTarget(null);
    setTokenInput("");
    toast.success(`${connectTarget.name} connected`);
  }

  function confirmDisconnect() {
    if (!disconnectTarget) return;
    setConnected((prev) => ({ ...prev, [disconnectTarget.id]: false }));
    toast.success(`${disconnectTarget.name} disconnected`);
    setDisconnectTarget(null);
  }

  const allLogs   = Object.values(MOCK_LOGS).flat().sort().reverse();
  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Bots" description="Manage WaveStack bots and connect your existing third-party bots" />

      <Tabs defaultValue="wavestack">
        <TabsList>
          <TabsTrigger value="wavestack">WaveStack Bots</TabsTrigger>
          <TabsTrigger value="thirdparty" className="gap-2">
            Third-Party Bots
            {connectedCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{connectedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── WaveStack bots tab ─────────────────────────────────────── */}
        <TabsContent value="wavestack" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bots.map((bot) => (
              <Card
                key={bot.id}
                className={`border-l-4 ${
                  bot.status === "online" ? "border-l-green-500" : "border-l-muted"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    {bot.name}
                  </CardTitle>
                  <StatusBadge status={bot.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <PlatformIcon platform={bot.platform} size={14} withLabel branded />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{bot.servers}</p>
                      <p className="text-xs text-muted-foreground">Servers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bot.commands}</p>
                      <p className="text-xs text-muted-foreground">Commands</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{bot.messagesHandled}</p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openConfig(bot)}>
                      <Terminal className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setLogsBot(bot)}>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      View Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setRestartOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart All Bots
                </Button>
                <Button variant="outline" onClick={() => setCombinedLogsOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Combined Logs
                </Button>
                <Button variant="outline" disabled={syncing} onClick={handleSync}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Terminal className="h-4 w-4 mr-2" />
                  )}
                  {syncing ? "Syncing..." : "Sync Commands"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Third-party bots tab ───────────────────────────────────── */}
        <TabsContent value="thirdparty" className="mt-4 space-y-4">
          {/* Info banner */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-5 py-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
              Connect your existing bot
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Already using a bot on your channel or server? Connect it here so WaveStack can read
              commands, sync events, and display activity in the combined log — without replacing it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THIRD_PARTY_BOTS.map((bot) => {
              const isConnected = Boolean(connected[bot.id]);
              return (
                <Card
                  key={bot.id}
                  className={cn(
                    "border-l-4 transition-colors",
                    isConnected ? "border-l-emerald-500" : "border-l-muted"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {bot.name}
                          {isConnected && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">{bot.desc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {PLATFORM_TAG[bot.platform]}
                      </Badge>
                      {bot.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {isConnected ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => toast.info(`Opening ${bot.name} dashboard…`)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Dashboard
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => setDisconnectTarget(bot)}
                          >
                            <Unlink className="h-3.5 w-3.5 mr-1.5" />
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => openConnect(bot)}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* WaveStack bot configure */}
      <Dialog open={!!configBot} onOpenChange={(o) => !o && setConfigBot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {configBot?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Platform</p>
                <Badge variant="secondary" className="gap-1">
                  <PlatformIcon platform={configBot?.platform ?? ""} size={12} branded />
                  {platformLabel[configBot?.platform ?? ""] ?? configBot?.platform}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Status</p>
                {configBot && <StatusBadge status={configBot.status} />}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bot-prefix">Command Prefix</Label>
              <Input
                id="bot-prefix"
                value={configPrefix}
                onChange={(e) => setConfigPrefix(e.target.value)}
                placeholder="!"
                maxLength={3}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Stats</Label>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border p-3">
                  <p className="text-lg font-bold">{configBot?.servers}</p>
                  <p className="text-xs text-muted-foreground">Servers</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-lg font-bold">{configBot?.commands}</p>
                  <p className="text-xs text-muted-foreground">Commands</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-lg font-bold">{configBot?.messagesHandled}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigBot(null)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={configSaving}>
              {configSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-bot logs */}
      <Dialog open={!!logsBot} onOpenChange={(o) => !o && setLogsBot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{logsBot?.name} — Logs</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-72 rounded-md border bg-black/80 p-3">
            <div className="space-y-0.5 font-mono text-xs">
              {logsBot && getLogsForBot(logsBot.id).map((line, i) => (
                <p key={i} className={
                  line.includes("WARN")  ? "text-yellow-400" :
                  line.includes("ERROR") ? "text-red-400"    : "text-green-300"
                }>
                  {line}
                </p>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsBot(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Combined logs */}
      <Dialog open={combinedLogsOpen} onOpenChange={setCombinedLogsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Combined Bot Logs</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-80 rounded-md border bg-black/80 p-3">
            <div className="space-y-0.5 font-mono text-xs">
              {allLogs.map((line, i) => (
                <p key={i} className={
                  line.includes("WARN")  ? "text-yellow-400" :
                  line.includes("ERROR") ? "text-red-400"    : "text-green-300"
                }>
                  {line}
                </p>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCombinedLogsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart all confirmation */}
      <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart all bots?</AlertDialogTitle>
            <AlertDialogDescription>
              All {bots.length} bots will briefly go offline while restarting. Active sessions may be interrupted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartAll} disabled={restarting}>
              {restarting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Restart All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Third-party connect dialog */}
      <Dialog open={!!connectTarget} onOpenChange={(o) => !o && setConnectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectTarget?.name}</DialogTitle>
            <DialogDescription>{connectTarget?.desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tp-token" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                {connectTarget?.tokenLabel}
              </Label>
              <Input
                id="tp-token"
                type="password"
                placeholder="Paste your token here"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoFocus
              />
              {connectTarget?.tokenHint && (
                <p className="text-xs text-muted-foreground">{connectTarget.tokenHint}</p>
              )}
            </div>
            <div className="rounded-lg bg-muted/40 border px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Read-only access</p>
              <p>WaveStack uses this token to read commands and activity. It cannot modify your bot settings or send messages on its behalf.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectTarget(null)}>Cancel</Button>
            <Button onClick={saveConnect} disabled={tokenSaving || !tokenInput.trim()}>
              {tokenSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Third-party disconnect confirmation */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(o) => !o && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              WaveStack will stop syncing activity from {disconnectTarget?.name}. Your bot itself won&apos;t be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
