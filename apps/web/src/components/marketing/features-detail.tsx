"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  Radio,
  Bot,
  Scissors,
  BarChart3,
  Shield,
  Coins,
  Users,
  Workflow,
  Search,
  Calendar,
  Zap,
  Globe,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const CATEGORIES = [
  {
    title: "Live Streaming",
    description:
      "Go live to Twitch, YouTube, and Kick simultaneously. Control overlays, scenes, and alerts from a single interface.",
    features: [
      { icon: Radio, text: "Multi-platform simulcast" },
      { icon: Globe, text: "Cross-platform chat aggregation" },
      { icon: Zap, text: "Real-time overlay editor" },
    ],
    accent: "border-red-200 bg-red-500/5",
    iconColor: "text-red-500 bg-red-500/10",
    visual: (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-600">LIVE</span>
          <span className="ml-auto text-xs text-muted-foreground">3 platforms</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Twitch", "YouTube", "Kick"].map((p) => (
            <div
              key={p}
              className="rounded-md bg-secondary/50 p-2 text-center text-xs text-muted-foreground"
            >
              {p}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-1 h-16">
          {[30, 50, 35, 70, 45, 80, 60, 75, 40, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-red-500/20" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "AI Agents",
    description:
      "Deploy autonomous agents that moderate chat, respond to viewers, run tasks, and manage your community around the clock.",
    features: [
      { icon: Bot, text: "Custom agent personalities" },
      { icon: Shield, text: "Intelligent moderation" },
      { icon: Workflow, text: "Task chains and skills" },
    ],
    accent: "border-violet-200 bg-violet-500/5",
    iconColor: "text-violet-500 bg-violet-500/10",
    visual: (
      <div className="rounded-lg border border-border bg-white p-4 space-y-2">
        {[
          { agent: "ModBot", status: "Active", task: "Moderating chat" },
          { agent: "ClipAgent", status: "Active", task: "Monitoring highlights" },
          { agent: "ComBot", status: "Idle", task: "Awaiting trigger" },
        ].map((a) => (
          <div
            key={a.agent}
            className="flex items-center gap-3 rounded-md bg-secondary/30 px-3 py-2"
          >
            <div
              className={`h-2 w-2 rounded-full ${a.status === "Active" ? "bg-success" : "bg-muted-foreground/30"}`}
            />
            <span className="text-xs font-medium">{a.agent}</span>
            <span className="ml-auto text-xs text-muted-foreground">{a.task}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Content Pipeline",
    description:
      "Auto-detect highlights, generate clips, schedule posts across platforms, and manage your entire content calendar.",
    features: [
      { icon: Scissors, text: "AI highlight detection" },
      { icon: Calendar, text: "Cross-platform scheduling" },
      { icon: Search, text: "SEO-optimized metadata" },
    ],
    accent: "border-amber-200 bg-amber-500/5",
    iconColor: "text-amber-500 bg-amber-500/10",
    visual: (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="text-xs font-medium mb-2">Content Queue</div>
        <div className="space-y-1.5">
          {["Best play of the day", "Stream highlights #42", "Tutorial: Settings guide"].map(
            (c, i) => (
              <div key={c} className="flex items-center gap-2 rounded bg-secondary/30 px-3 py-1.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-success" : "bg-muted-foreground/30"}`}
                />
                <span className="text-xs">{c}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {i === 0 ? "Publishing..." : "Queued"}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    title: "Analytics & Growth",
    description:
      "Unified metrics across every platform. Track what drives engagement, optimize content strategy, and monitor revenue.",
    features: [
      { icon: BarChart3, text: "Cross-platform dashboards" },
      { icon: Users, text: "Audience insights" },
      { icon: Coins, text: "Revenue consolidation" },
    ],
    accent: "border-sky-200 bg-sky-500/5",
    iconColor: "text-sky-500 bg-sky-500/10",
    visual: (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "Views", value: "243K" },
            { label: "Followers", value: "+1.2K" },
          ].map((s) => (
            <div key={s.label} className="rounded bg-secondary/30 p-2 text-center">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-sm font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 h-12">
          {[20, 35, 50, 40, 65, 55, 80, 70, 90, 75, 85, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-sky-500/20" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
  },
] as const;

export function FeaturesDetail() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Page heading
      SplitText.create(".features-heading", {
        type: "chars",
        onSplit(self) {
          self.chars.forEach((c) => {
            (c as HTMLElement).style.transformOrigin = "center bottom";
          });
          gsap.fromTo(
            self.chars,
            {
              y: -60,
              scaleY: 1.5,
              scaleX: 0.6,
              opacity: 0,
              rotation: () => gsap.utils.random(-10, 10),
            },
            {
              y: 0,
              scaleY: 1,
              scaleX: 1,
              opacity: 1,
              rotation: 0,
              stagger: { each: 0.03, from: "random" },
              duration: 0.6,
              ease: "back.out(2)",
            },
          );
        },
      });

      // Each feature category animates in
      gsap.utils.toArray<HTMLElement>(".feature-row").forEach((row) => {
        gsap.fromTo(
          row,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 85%" },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="px-6 pt-28 pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl mb-16">
          <h1 className="features-heading font-display text-5xl tracking-tight sm:text-6xl">
            Features
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to manage, automate, and grow your creator business from a single
            platform.
          </p>
        </div>

        <div className="space-y-16">
          {CATEGORIES.map((cat, idx) => (
            <div
              key={cat.title}
              className={`feature-row grid gap-8 md:grid-cols-2 items-center ${idx % 2 === 1 ? "md:direction-rtl" : ""}`}
            >
              <div className={idx % 2 === 1 ? "md:order-2" : ""}>
                <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{cat.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {cat.features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <li key={f.text} className="flex items-center gap-3">
                        <div className={`rounded-lg p-1.5 ${cat.iconColor}`}>
                          <Icon size={14} strokeWidth={1.5} />
                        </div>
                        <span className="text-sm">{f.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div
                className={`rounded-2xl border p-4 ${cat.accent} ${idx % 2 === 1 ? "md:order-1" : ""}`}
              >
                {cat.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
