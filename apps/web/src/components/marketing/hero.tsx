"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import Link from "next/link";
import { PerspectiveCard } from "./perspective-card";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(useGSAP, SplitText);

const TERMINAL_LINES = [
  { cmd: 'stream.connect("twitch", "youtube")', status: "done" },
  { cmd: 'agents.deploy("mod-bot")', status: "done" },
  { cmd: 'clips.watch({ sensitivity: "high" })', status: "done" },
  { cmd: 'publish.queue("tiktok", "shorts")', status: "pending" },
] as const;

const TERMINAL_FOOTER = "3 platforms live  ·  1 agent active  ·  0 tabs";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const master = gsap.timeline();

      // 1. Eyebrow types in character by character
      SplitText.create(".hero-eyebrow-text", {
        type: "chars",
        onSplit(self) {
          gsap.set(self.chars, { opacity: 0 });
          master.to(self.chars, {
            opacity: 1,
            duration: 0.02,
            stagger: 0.03,
            ease: "none",
          });
        },
      });

      // 2. Headline: Nickelodeon squash & stretch
      SplitText.create(".hero-heading", {
        type: "words",
        onSplit(self) {
          self.words.forEach((word) => {
            (word as HTMLElement).style.transformOrigin = "center bottom";
            (word as HTMLElement).style.display = "inline-block";
          });

          self.words.forEach((word, i) => {
            const wordTl = gsap.timeline();
            const drop = gsap.utils.random(160, 280);
            const squashY = gsap.utils.random(0.35, 0.5);
            const squashX = gsap.utils.random(1.4, 1.7);
            const wobble = gsap.utils.random(-15, 15);

            wordTl.fromTo(
              word,
              { y: -drop, scaleY: 1.7, scaleX: 0.55, rotation: wobble, opacity: 0 },
              {
                y: 0,
                scaleY: 1.7,
                scaleX: 0.55,
                rotation: wobble * 0.4,
                opacity: 1,
                duration: 0.3,
                ease: "power2.in",
              },
            );
            wordTl.to(word, {
              scaleY: squashY,
              scaleX: squashX,
              rotation: 0,
              y: 6,
              duration: 0.08,
              ease: "power4.out",
            });
            wordTl.to(word, {
              scaleY: 1.2,
              scaleX: 0.85,
              y: -15,
              rotation: gsap.utils.random(-4, 4),
              duration: 0.2,
              ease: "power2.out",
            });
            wordTl.to(word, { scaleY: 0.8, scaleX: 1.15, y: 2, duration: 0.1, ease: "power2.in" });
            wordTl.to(word, {
              scaleY: 1,
              scaleX: 1,
              y: 0,
              rotation: 0,
              duration: 0.35,
              ease: "elastic.out(1, 0.35)",
            });

            master.add(wordTl, 0.8 + i * 0.12);
          });
        },
      });

      // 3. Subtitle words reveal
      SplitText.create(".hero-subtitle", {
        type: "words",
        mask: "words",
        onSplit(self) {
          master.fromTo(
            self.words,
            { yPercent: 110 },
            { yPercent: 0, duration: 0.45, ease: "power3.out", stagger: 0.02 },
            2.0,
          );
        },
      });

      // 4. CTAs
      master.fromTo(
        ".hero-cta",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.08 },
        2.5,
      );

      // 5. Terminal: container fades in, then lines type
      master.fromTo(
        ".hero-terminal",
        { y: 30, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" },
        2.3,
      );

      // Terminal lines appear one by one
      master.fromTo(
        ".term-line",
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.35, ease: "power2.out" },
        2.8,
      );

      // Checkmarks bounce in after their line
      master.fromTo(
        ".term-check",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.2, stagger: 0.35, ease: "back.out(3)" },
        3.1,
      );

      // Footer line fades in
      master.fromTo(
        ".term-footer",
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" },
        4.3,
      );

      // Pulse the pending indicator
      master.to(
        ".term-pending",
        { opacity: 0.3, duration: 0.6, repeat: -1, yoyo: true, ease: "sine.inOut" },
        4.5,
      );
    },
    { scope: containerRef },
  );

  return (
    <section ref={containerRef} className="relative min-h-screen bg-[#0f1a14] px-6 pt-28 pb-20">
      {/* Ambient mint haze */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5CE8A5]/6 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <p className="hero-eyebrow mb-8">
            <span className="hero-eyebrow-text font-mono text-sm text-[#5CE8A5]/60 tracking-wide">
              currently in beta. things might break. that&apos;s the fun part.
            </span>
            <span className="ml-2 inline-block h-3.5 w-px bg-[#5CE8A5]/40 animate-pulse" />
          </p>

          {/* Headline */}
          <h1 className="hero-heading font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[1] tracking-tight text-white">
            Stop managing streams. Start making them.
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle mt-6 max-w-lg text-base leading-relaxed text-[#5CE8A5]/70">
            You didn&apos;t start creating content to babysit six dashboards. WaveStack runs your
            stream ops, clips highlights, publishes everywhere, and moderates chat -- so you stay in
            the zone.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="hero-cta inline-flex h-11 items-center gap-2 rounded-xl bg-[#5CE8A5] px-6 text-sm font-semibold text-[#0f1a14] transition-all hover:bg-[#4DD898]"
            >
              Start streaming free
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <a
              href="#how-it-works"
              className="hero-cta inline-flex h-11 items-center rounded-xl border border-white/10 px-6 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              Watch it work
            </a>
          </div>
        </div>

        {/* Terminal visualization */}
        <div className="hero-terminal mt-12 sm:mt-16 max-w-xl">
          <PerspectiveCard intensity={6}>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#182822] font-mono text-xs sm:text-sm shadow-2xl shadow-black/40">
              {/* Title bar */}
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-xs text-white/30">WaveStack</span>
              </div>

              {/* Terminal body */}
              <div className="p-5 space-y-2.5">
                {TERMINAL_LINES.map((line, i) => (
                  <div key={i} className="term-line flex items-center gap-3">
                    <span className="text-[#5CE8A5]/50">▸</span>
                    <span className="text-white/80">{line.cmd}</span>
                    {line.status === "done" ? (
                      <span className="term-check ml-auto text-[#28c840]">✓</span>
                    ) : (
                      <span className="term-pending ml-auto text-[#febc2e]">...</span>
                    )}
                  </div>
                ))}

                <div className="term-footer mt-4 border-t border-white/5 pt-3 text-xs text-white/30">
                  {TERMINAL_FOOTER}
                </div>
              </div>
            </div>
          </PerspectiveCard>
        </div>
      </div>
    </section>
  );
}
