"use client";

import { useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Radio, Bot, Scissors, TrendingUp } from "lucide-react";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

type TabKey = "stream" | "agents" | "content" | "growth";

interface TabData {
  key: TabKey;
  label: string;
  Icon: typeof Radio;
  headline: string;
  body: string;
  visual: React.ReactNode;
}

const TABS: TabData[] = [
  {
    key: "stream",
    label: "Stream",
    Icon: Radio,
    headline: "One button. Every platform.",
    body: "Go live on Twitch, YouTube, and Kick simultaneously. WaveStack handles the encoding, the chat merge, and the scene switching. You just show up and be yourself.",
    visual: (
      <div className="space-y-3 font-mono text-sm">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white/60">LIVE</span>
          <span className="ml-auto text-white/30">00:47:23</span>
        </div>
        <div className="space-y-2">
          {["twitch", "youtube", "kick"].map((p) => (
            <div
              key={p}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
            >
              <span className="text-white/70">{p}</span>
              <span className="text-xs text-[#5CE8A5]">connected</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-2 text-xs text-white/30">
          bitrate: 6000kbps · viewers: 1,247 · uptime: 47m
        </div>
      </div>
    ),
  },
  {
    key: "agents",
    label: "Agents",
    Icon: Bot,
    headline: "Your mods never sleep.",
    body: "Deploy AI agents that moderate chat, welcome new followers, answer FAQs, and enforce your rules. They learn your community's vibe and act accordingly.",
    visual: (
      <div className="space-y-2.5 font-mono text-sm">
        {[
          { name: "mod-bot", action: "timed out toxic_user_42", time: "2s ago" },
          { name: "greeter", action: "welcomed 3 new followers", time: "15s ago" },
          { name: "clip-watcher", action: "flagged hype moment (score: 94)", time: "1m ago" },
        ].map((agent) => (
          <div
            key={agent.name}
            className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2.5"
          >
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#5CE8A5]" />
            <div className="flex-1">
              <span className="text-white/70">{agent.name}</span>
              <p className="text-xs text-white/40">{agent.action}</p>
            </div>
            <span className="text-xs text-white/20">{agent.time}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "content",
    label: "Content",
    Icon: Scissors,
    headline: "Clips that find themselves.",
    body: "WaveStack watches your stream for hype moments — chat explosions, big plays, viral reactions — and auto-clips them. Queue them for TikTok, Shorts, or Reels with one click.",
    visual: (
      <div className="space-y-2.5 font-mono text-sm">
        {[
          { title: "Triple kill reaction", score: 97, duration: "0:28" },
          { title: "Chat goes wild", score: 91, duration: "0:15" },
          { title: "Surprise raid moment", score: 88, duration: "0:42" },
        ].map((clip) => (
          <div
            key={clip.title}
            className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5"
          >
            <div className="flex h-8 w-12 items-center justify-center rounded bg-white/10 text-xs text-white/40">
              {clip.duration}
            </div>
            <div className="flex-1">
              <span className="text-white/70">{clip.title}</span>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#5CE8A5]/60"
                  style={{ width: `${clip.score}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-white/30">{clip.score}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "growth",
    label: "Growth",
    Icon: TrendingUp,
    headline: "Numbers without the spreadsheet.",
    body: "Cross-platform analytics in one view. See which clips drive follows, which streams keep viewers, and where your audience actually comes from. No CSV exports required.",
    visual: (
      <div className="space-y-3 font-mono text-sm">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "viewers", value: "1.2k", change: "+18%" },
            { label: "followers", value: "342", change: "+7%" },
            { label: "clips shared", value: "28", change: "+140%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-white/5 p-2.5 text-center">
              <div className="text-lg text-white/80">{stat.value}</div>
              <div className="text-xs text-[#5CE8A5]">{stat.change}</div>
              <div className="mt-0.5 text-[10px] text-white/30">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 h-16">
          {[35, 42, 38, 55, 48, 62, 58, 71, 65, 80, 75, 88].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-[#5CE8A5]/25"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="text-xs text-white/30 text-center">last 12 streams</div>
      </div>
    ),
  },
];

export function TheStack() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("stream");
  const isAnimating = useRef(false);

  const activeData = TABS.find((t) => t.key === activeTab)!;

  useGSAP(
    () => {
      // Heading: chars reveal
      SplitText.create(".stack-heading", {
        type: "chars",
        onSplit(self) {
          self.chars.forEach((c) => {
            (c as HTMLElement).style.transformOrigin = "center bottom";
          });
          gsap.fromTo(
            self.chars,
            {
              y: -50,
              opacity: 0,
              scaleY: 1.4,
              scaleX: 0.6,
              rotation: () => gsap.utils.random(-8, 8),
            },
            {
              y: 0,
              opacity: 1,
              scaleY: 1,
              scaleX: 1,
              rotation: 0,
              duration: 0.5,
              ease: "back.out(2)",
              stagger: { each: 0.025, from: "random" },
              scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 70%",
              },
            },
          );
        },
      });

      // Tabs fade in
      gsap.fromTo(
        ".stack-tabs",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".stack-tabs",
            start: "top 85%",
          },
        },
      );

      // Content area
      gsap.fromTo(
        ".stack-content",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".stack-content",
            start: "top 80%",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  const switchTab = useCallback(
    (key: TabKey) => {
      if (key === activeTab || isAnimating.current || !contentRef.current) return;
      isAnimating.current = true;

      // Fade out current content, then swap and fade in
      gsap.to(contentRef.current.children, {
        opacity: 0,
        y: -8,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setActiveTab(key);
          // After React re-renders, fade in new content
          requestAnimationFrame(() => {
            if (!contentRef.current) return;
            gsap.fromTo(
              contentRef.current.children,
              { opacity: 0, y: 12 },
              {
                opacity: 1,
                y: 0,
                duration: 0.3,
                ease: "power2.out",
                stagger: 0.05,
                onComplete: () => {
                  isAnimating.current = false;
                },
              },
            );
          });
        },
      });
    },
    [activeTab],
  );

  return (
    <section ref={sectionRef} className="bg-[#0f1a14] px-6 py-16 sm:py-28 text-white">
      <div className="mx-auto max-w-5xl">
        <h2 className="stack-heading font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-white">
          What&apos;s in the stack
        </h2>

        {/* Tab buttons */}
        <div className="stack-tabs mt-10 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#5CE8A5] text-[#0f1a14]"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              <tab.Icon size={16} strokeWidth={1.5} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="stack-content mt-8 grid gap-8 md:grid-cols-[1fr_1fr] md:gap-12"
        >
          <div className="flex flex-col justify-center">
            <h3 className="font-display text-2xl tracking-tight text-white sm:text-3xl">
              {activeData.headline}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-white/60">{activeData.body}</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#182822] p-5">
            {activeData.visual}
          </div>
        </div>
      </div>
    </section>
  );
}
