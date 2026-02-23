"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Zap,
  Youtube,
  Twitch,
  Twitter,
  Instagram,
  Sparkles,
  Radio,
  BarChart3,
  Bot,
} from "lucide-react";

// ── Steps ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "welcome",    label: "Welcome"    },
  { id: "platforms",  label: "Platforms"  },
  { id: "goals",      label: "Goals"      },
  { id: "agent",      label: "AI Setup"   },
  { id: "done",       label: "Done"       },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ── Platform data ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "youtube",   label: "YouTube",   color: "text-red-500",    bg: "bg-red-500/10 border-red-500/30",  icon: Youtube    },
  { id: "twitch",    label: "Twitch",    color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30", icon: Twitch },
  { id: "tiktok",    label: "TikTok",    color: "text-pink-500",   bg: "bg-pink-500/10 border-pink-500/30",    icon: Zap    },
  { id: "twitter",   label: "X / Twitter", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/30",  icon: Twitter    },
  { id: "instagram", label: "Instagram", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", icon: Instagram },
];

const GOALS = [
  { id: "grow",      label: "Grow my audience",       icon: BarChart3  },
  { id: "automate",  label: "Automate my workflow",    icon: Zap        },
  { id: "monetize",  label: "Increase revenue",        icon: Sparkles   },
  { id: "stream",    label: "Level up my streams",     icon: Radio      },
  { id: "bots",      label: "Manage community bots",   icon: Bot        },
];

const AGENT_MODES = [
  {
    id: "manual",
    label: "Manual",
    desc: "Agents suggest — you approve every action. Full control.",
    badge: "Safest",
    badgeClass: "text-blue-400 border-blue-400/30",
  },
  {
    id: "semi",
    label: "Semi-auto",
    desc: "Agents act on routine tasks, notify you for important decisions.",
    badge: "Recommended",
    badgeClass: "text-green-400 border-green-400/30",
  },
  {
    id: "autopilot",
    label: "Autopilot",
    desc: "Agents handle everything autonomously. Maximum automation.",
    badge: "Advanced",
    badgeClass: "text-orange-400 border-orange-400/30",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("welcome");
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [agentMode, setAgentMode] = useState("semi");
  const [displayName, setDisplayName] = useState("");
  const [finishing, setFinishing] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const progress = Math.round(((stepIndex) / (STEPS.length - 1)) * 100);

  async function connectPlatform(id: string) {
    setConnecting(id);
    await new Promise((r) => setTimeout(r, 1200));
    setConnected((prev) => new Set([...prev, id]));
    setConnecting(null);
    toast.success(`${PLATFORMS.find((p) => p.id === id)?.label} connected`);
  }

  function toggleGoal(id: string) {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function next() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  }

  function back() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  }

  async function finish() {
    setFinishing(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("WaveStack is ready. Let's go!");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            W
          </div>
          <span className="font-semibold text-base">WaveStack</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    i < stepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === stepIndex
                      ? "border-2 border-primary text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("h-px w-6 transition-colors", i < stepIndex ? "bg-primary" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{stepIndex + 1} / {STEPS.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-0.5 rounded-none" />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">

          {/* ── Welcome ── */}
          {step === "welcome" && (
            <div className="space-y-6 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground text-3xl font-bold shadow-lg">
                W
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome to WaveStack</h1>
                <p className="text-muted-foreground mt-2">
                  Your AI-powered creator platform. Let&apos;s get you set up in 2 minutes.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name">What should we call you?</Label>
                <Input
                  id="display-name"
                  placeholder="StreamerXYZ"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-center text-lg h-12"
                  onKeyDown={(e) => e.key === "Enter" && displayName.trim() && next()}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                {[
                  { icon: "🤖", label: "AI Agents" },
                  { icon: "📡", label: "Multi-Platform" },
                  { icon: "⚡", label: "Automation" },
                ].map((f) => (
                  <div key={f.label} className="rounded-lg border p-4 space-y-1">
                    <p className="text-2xl">{f.icon}</p>
                    <p className="text-xs font-medium">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Platforms ── */}
          {step === "platforms" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Connect your platforms</h2>
                <p className="text-muted-foreground mt-1">Connect at least one to get started. You can add more later.</p>
              </div>
              <div className="space-y-3">
                {PLATFORMS.map((p) => {
                  const isConnected = connected.has(p.id);
                  const isConnecting = connecting === p.id;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-4 transition-colors",
                        isConnected ? `${p.bg}` : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <p.icon className={cn("h-5 w-5", p.color)} />
                        <span className="font-medium text-sm">{p.label}</span>
                        {isConnected && (
                          <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">
                            Connected ✓
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "default"}
                        disabled={isConnecting}
                        onClick={() => !isConnected && connectPlatform(p.id)}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isConnected ? (
                          "Connected"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
              {connected.size === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  You can skip this and connect platforms from Settings later.
                </p>
              )}
            </div>
          )}

          {/* ── Goals ── */}
          {step === "goals" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">What&apos;s your focus?</h2>
                <p className="text-muted-foreground mt-1">Select all that apply — we&apos;ll tailor WaveStack to match.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {GOALS.map((g) => {
                  const selected = selectedGoals.has(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGoal(g.id)}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <g.icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{g.label}</span>
                      {selected && <CheckCircle2 className="ml-auto h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Agent Mode ── */}
          {step === "agent" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">AI autonomy level</h2>
                <p className="text-muted-foreground mt-1">
                  How much should WaveStack&apos;s AI agents act on their own? You can change this any time.
                </p>
              </div>
              <div className="space-y-3">
                {AGENT_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setAgentMode(m.id)}
                    className={cn(
                      "w-full flex items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                      agentMode === m.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                      agentMode === m.id ? "border-primary bg-primary" : "border-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{m.label}</span>
                        <Badge variant="outline" className={`text-xs ${m.badgeClass}`}>{m.badge}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="space-y-6 text-center">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 border-2 border-green-500">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold">
                  You&apos;re all set{displayName ? `, ${displayName}` : ""}!
                </h2>
                <p className="text-muted-foreground mt-2">
                  WaveStack is configured and your agents are ready.
                  {connected.size > 0 && ` ${connected.size} platform${connected.size > 1 ? "s" : ""} connected.`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: "🤖", title: "Agents ready",      desc: `${agentMode === "semi" ? "Semi-auto" : agentMode === "autopilot" ? "Autopilot" : "Manual"} mode` },
                  { icon: "📡", title: "Platforms",          desc: connected.size > 0 ? `${connected.size} connected` : "Add from Settings" },
                  { icon: "⚡", title: "Workflows",          desc: "3 templates ready" },
                  { icon: "📊", title: "Analytics",          desc: "Tracking enabled" },
                ].map((c) => (
                  <div key={c.title} className="rounded-lg border p-3 space-y-0.5">
                    <p className="text-lg">{c.icon}</p>
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            {step !== "welcome" && step !== "done" ? (
              <Button variant="ghost" onClick={back}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
            ) : (
              <div />
            )}

            {step === "done" ? (
              <Button size="lg" onClick={finish} disabled={finishing}>
                {finishing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {finishing ? "Setting up…" : "Go to Dashboard"}
              </Button>
            ) : (
              <Button
                onClick={next}
                disabled={step === "welcome" && !displayName.trim()}
              >
                {step === "agent" ? "Finish setup" : "Continue"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Skip */}
          {(step === "platforms" || step === "goals") && (
            <p className="text-center">
              <button onClick={next} className="text-xs text-muted-foreground underline hover:text-foreground transition-colors">
                Skip this step
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
