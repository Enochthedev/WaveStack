"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

const VALUES = [
  {
    title: "Creator-first",
    description:
      "Every feature starts with one question: does this save the creator time? If the answer is no, it does not ship.",
  },
  {
    title: "Real-time or nothing",
    description:
      "Creators work live. Delayed data is useless data. Every system is built for sub-second latency.",
  },
  {
    title: "Open by default",
    description:
      "APIs, webhooks, and integrations are first-class citizens. Your data belongs to you, and you should be able to move it anywhere.",
  },
  {
    title: "Honest automation",
    description:
      "AI should assist, not replace. Our agents are transparent about what they do and always defer to the creator.",
  },
] as const;

const TIMELINE = [
  { year: "2024", event: "Idea born from frustration with 12-tab streaming setups" },
  { year: "2025", event: "First prototype. Multi-platform simulcast + auto-clips" },
  { year: "2026", event: "Public beta. AI agents, workflow automation, unified analytics" },
] as const;

export function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      SplitText.create(".about-heading", {
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

      gsap.utils.toArray<HTMLElement>(".about-block").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="px-6 pt-28 pb-24">
      <div className="mx-auto max-w-4xl">
        {/* Heading */}
        <div className="max-w-2xl mb-16">
          <h1 className="about-heading font-display text-5xl tracking-tight sm:text-6xl">
            About WaveStack
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            We are building the platform we wished existed when we were creators ourselves -- one
            place to stream, grow, and automate, without the chaos of a dozen disconnected tools.
          </p>
        </div>

        {/* Story */}
        <div className="about-block mb-20">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">The story</h2>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              WaveStack started because streaming should not feel like a full-time ops job. Every
              creator we talked to had the same problem: they spent more time managing tools than
              creating content. Twitch in one tab, YouTube in another, analytics scattered across
              three dashboards, clips exported by hand, moderation bots that barely understood
              context.
            </p>
            <p>
              We decided to build one platform that actually understood the creator workflow
              end-to-end. Not another aggregator. Not another dashboard that just embeds iframes. A
              real product, built from scratch, with AI that does the tedious work so creators can
              focus on what they are actually good at.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="about-block mb-20">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl mb-6">Timeline</h2>
          <div className="border-l-2 border-primary/20 pl-6 space-y-6">
            {TIMELINE.map((item) => (
              <div key={item.year} className="relative">
                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                <div className="text-sm font-semibold text-primary">{item.year}</div>
                <div className="text-sm text-muted-foreground">{item.event}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="about-block">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl mb-6">What we believe</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
