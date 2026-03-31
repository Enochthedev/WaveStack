"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Loader2, Link2, CheckCircle2, ExternalLink, Unlink, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Third-party bots ─────────────────────────────────────────────────────────

type ThirdPartyBot = {
  id: string;
  name: string;
  tags: string[];
  platform: "twitch" | "youtube" | "discord" | "multi";
  desc: string;
  tokenLabel: string;
  tokenHint: string;
};

const THIRD_PARTY_BOTS: ThirdPartyBot[] = [
  {
    id: "nightbot",
    name: "Nightbot",
    tags: ["commands", "timers", "spam filter"],
    platform: "multi",
    desc: "Free cloud-based bot for Twitch & YouTube. Custom commands, spam protection, timers, and more.",
    tokenLabel: "API Token",
    tokenHint: "Find it at nightbot.tv → Dashboard → API",
  },
  {
    id: "streamelements",
    name: "StreamElements",
    tags: ["commands", "loyalty", "overlays"],
    platform: "multi",
    desc: "All-in-one bot with chat commands, loyalty points, giveaways, tipping, and stream overlays.",
    tokenLabel: "JWT Token",
    tokenHint: "Find it at streamelements.com → Account → Channels",
  },
  {
    id: "moobot",
    name: "Moobot",
    tags: ["commands", "polls", "giveaways"],
    platform: "twitch",
    desc: "Twitch-focused bot with custom commands, polls, subscriber perks, and detailed chat stats.",
    tokenLabel: "API Key",
    tokenHint: "Find it at moo.bot → Settings → API",
  },
  {
    id: "fossabot",
    name: "Fossabot",
    tags: ["commands", "variables", "integrations"],
    platform: "multi",
    desc: "Powerful chat bot with an extensive variable system, built-in integrations, and real-time events.",
    tokenLabel: "API Secret",
    tokenHint: "Find it at fossabot.com → Settings → API",
  },
  {
    id: "mee6",
    name: "MEE6",
    tags: ["moderation", "levels", "automod"],
    platform: "discord",
    desc: "The most popular Discord bot. Leveling, automod, announcements, welcome messages, and more.",
    tokenLabel: "API Token",
    tokenHint: "Find it at mee6.xyz → Dashboard → Plugins → API",
  },
  {
    id: "dyno",
    name: "Dyno",
    tags: ["moderation", "logging", "fun"],
    platform: "discord",
    desc: "Feature-rich Discord utility bot. Moderation, logging, role management, and custom commands.",
    tokenLabel: "Bot Token",
    tokenHint: "Find it at dyno.gg → Dashboard → Settings",
  },
  {
    id: "carlbot",
    name: "Carl-bot",
    tags: ["roles", "logging", "automod"],
    platform: "discord",
    desc: "Powerful Discord bot for reaction roles, logging, automod, embeds, and custom commands.",
    tokenLabel: "Bot Token",
    tokenHint: "Find it at carl.gg → Dashboard → Settings",
  },
];

const PLATFORM_TAG: Record<ThirdPartyBot["platform"], string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  discord: "Discord",
  multi: "Multi-platform",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BotsPage() {
  // Third-party bots
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [connectTarget, setConnectTarget] = useState<ThirdPartyBot | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<ThirdPartyBot | null>(null);

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

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bots"
        description="Manage WaveStack bots and connect your existing third-party bots"
      />

      <Tabs defaultValue="wavestack">
        <TabsList>
          <TabsTrigger value="wavestack">WaveStack Bots</TabsTrigger>
          <TabsTrigger value="thirdparty" className="gap-2">
            Third-Party Bots
            {connectedCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {connectedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── WaveStack bots tab ─────────────────────────────────────── */}
        <TabsContent value="wavestack" className="space-y-6 mt-4">
          <EmptyState
            preset="generic"
            title="WaveStack Bots coming soon"
            subtitle="Built-in chat bots for Discord, Twitch, and more are being developed."
            size="lg"
          />
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
              commands, sync events, and display activity in the combined log — without replacing
              it.
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
                    isConnected ? "border-l-emerald-500" : "border-l-muted",
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
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
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
              <p>
                WaveStack uses this token to read commands and activity. It cannot modify your bot
                settings or send messages on its behalf.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectTarget(null)}>
              Cancel
            </Button>
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
              WaveStack will stop syncing activity from {disconnectTarget?.name}. Your bot itself
              won&apos;t be affected.
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
