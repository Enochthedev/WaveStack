"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Plug, SlidersHorizontal, Rocket } from "lucide-react";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

const STEPS = [
  {
    num: "01",
    title: "Connect your platforms",
    desc: "Takes about 90 seconds. We timed it.",
    Icon: Plug,
    detail: (
      <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
        {["twitch", "youtube", "kick", "tiktok"].map((p) => (
          <span
            key={p}
            className="step-tag inline-flex rounded-md bg-[#0f1a14]/8 px-2.5 py-1 text-[#0f1a14]/70"
          >
            {p}
          </span>
        ))}
      </div>
    ),
  },
  {
    num: "02",
    title: "Set your rules",
    desc: "Tell WaveStack what to do — in plain English or code.",
    Icon: SlidersHorizontal,
    detail: (
      <div className="mt-4 space-y-1.5 rounded-lg bg-[#0f1a14]/8 p-3 font-mono text-xs text-[#0f1a14]/70">
        <p>
          <span className="text-[#0f1a14]/40">IF</span> chat.toxicity{" "}
          <span className="text-[#0f1a14]/40">&gt;</span> 0.8
        </p>
        <p>
          <span className="text-[#0f1a14]/40">THEN</span> timeout(user, 60s)
        </p>
        <p>
          <span className="text-[#0f1a14]/40">IF</span> clip.hype{" "}
          <span className="text-[#0f1a14]/40">&gt;</span> 90
        </p>
        <p>
          <span className="text-[#0f1a14]/40">THEN</span> publish(tiktok, shorts)
        </p>
      </div>
    ),
  },
  {
    num: "03",
    title: "Go live. We handle the rest.",
    desc: "You just\u2026 create.",
    Icon: Rocket,
    detail: (
      <div className="mt-4 flex items-center gap-3 font-mono text-xs text-[#0f1a14]/60">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span>streaming · 3 platforms · 2 agents active</span>
      </div>
    ),
  },
] as const;

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading: words mask-reveal from below
      SplitText.create(".hiw-heading", {
        type: "words",
        mask: "words",
        onSplit(self) {
          gsap.fromTo(
            self.words,
            { yPercent: 120 },
            {
              yPercent: 0,
              duration: 0.6,
              ease: "power3.out",
              stagger: 0.04,
              scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 70%",
              },
            },
          );
        },
      });

      // Subtitle fade
      gsap.fromTo(
        ".hiw-subtitle",
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".hiw-subtitle",
            start: "top 85%",
          },
        },
      );

      // Cards scale up from slightly smaller
      gsap.fromTo(
        ".hiw-card",
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: ".hiw-grid",
            start: "top 75%",
          },
        },
      );

      // Step numbers: count up effect via scale bounce
      gsap.fromTo(
        ".step-num",
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "back.out(3)",
          stagger: 0.15,
          scrollTrigger: {
            trigger: ".hiw-grid",
            start: "top 75%",
          },
        },
      );

      // SVG connector lines draw in
      gsap.fromTo(
        ".connector-line",
        { strokeDashoffset: 100 },
        {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: "power2.inOut",
          stagger: 0.2,
          scrollTrigger: {
            trigger: ".hiw-grid",
            start: "top 65%",
          },
        },
      );

      // Inner detail areas
      gsap.fromTo(
        ".step-tag, .hiw-card .rounded-lg, .hiw-card .flex.items-center",
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".hiw-grid",
            start: "top 60%",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="how-it-works" className="bg-[#5CE8A5]/8 px-6 py-16 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 max-w-lg">
          <h2 className="hiw-heading font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight">
            Three steps. No, really.
          </h2>
          <p className="hiw-subtitle mt-4 text-base text-muted-foreground">
            Most setup wizards are seven pages of pain. Ours is three cards.
          </p>
        </div>

        <div className="hiw-grid relative grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* SVG connector lines (desktop only) */}
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
            aria-hidden="true"
          >
            {/* Line from card 1 to card 2 */}
            <line
              className="connector-line"
              x1="33%"
              y1="50%"
              x2="50%"
              y2="50%"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="100"
              strokeDashoffset="100"
              opacity="0.15"
            />
            {/* Line from card 2 to card 3 */}
            <line
              className="connector-line"
              x1="66%"
              y1="50%"
              x2="83%"
              y2="50%"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="100"
              strokeDashoffset="100"
              opacity="0.15"
            />
          </svg>

          {STEPS.map((step) => (
            <div
              key={step.num}
              className="hiw-card relative rounded-2xl border border-border bg-background p-6"
            >
              <div className="flex items-start gap-4">
                <div className="step-num flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <step.Icon size={20} strokeWidth={1.5} className="text-primary" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground/60">{step.num}</span>
                  <h3 className="text-lg font-semibold leading-snug">{step.title}</h3>
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{step.desc}</p>

              {step.detail}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
