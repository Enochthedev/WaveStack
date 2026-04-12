"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

const TOOL_NAMES = [
  "Twitch",
  "YouTube",
  "OBS",
  "StreamElements",
  "Nightbot",
  "Canva",
  "Google Sheets",
  "Discord",
  "TikTok",
  "Twitter",
  "Notion",
  "Streamlabs",
];

export function TheProblem() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Velocity-skew heading: chars drop in with random rotation + skew
      SplitText.create(".problem-heading", {
        type: "chars",
        onSplit(self) {
          self.chars.forEach((c) => {
            (c as HTMLElement).style.transformOrigin = "center bottom";
            (c as HTMLElement).style.display = "inline-block";
          });

          gsap.fromTo(
            self.chars,
            {
              y: -80,
              opacity: 0,
              scaleY: 1.6,
              scaleX: 0.5,
              rotation: () => gsap.utils.random(-20, 20),
              skewX: () => gsap.utils.random(-15, 15),
            },
            {
              y: 0,
              opacity: 1,
              scaleY: 1,
              scaleX: 1,
              rotation: 0,
              skewX: 0,
              duration: 0.5,
              ease: "back.out(1.7)",
              stagger: { each: 0.025, from: "random" },
              scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 70%",
              },
            },
          );
        },
      });

      // Right column body paragraphs slide in from right
      gsap.fromTo(
        ".problem-body p",
        { x: 40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".problem-body",
            start: "top 75%",
          },
        },
      );

      // Tool pills scatter in
      gsap.fromTo(
        ".tool-pill",
        {
          scale: 0,
          opacity: 0,
          rotation: () => gsap.utils.random(-30, 30),
        },
        {
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 0.4,
          ease: "back.out(2)",
          stagger: { each: 0.06, from: "random" },
          scrollTrigger: {
            trigger: ".tool-graveyard",
            start: "top 80%",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="px-6 py-16 sm:py-28">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16 lg:gap-24">
        {/* Left — heading + tool graveyard */}
        <div>
          <h2 className="problem-heading font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight">
            Twelve tabs open. Zero content made.
          </h2>

          {/* Tool pills */}
          <div className="tool-graveyard mt-10 flex flex-wrap gap-2">
            {TOOL_NAMES.map((name) => (
              <span
                key={name}
                className="tool-pill inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Right — editorial body */}
        <div className="problem-body space-y-5 text-base leading-relaxed text-muted-foreground md:pt-2">
          <p>
            Here&apos;s the reality of streaming in 2026: You open Twitch to go live. Switch to
            YouTube to simulcast. Check OBS for scenes. Open StreamElements for alerts. Pull up a
            spreadsheet for sponsors. Hop into Discord to ping your mods. Open Canva for the
            thumbnail you forgot.
          </p>
          <p>
            By the time you actually hit &ldquo;Go Live,&rdquo; you&apos;ve spent 45 minutes on
            logistics and zero minutes creating. Your energy is gone. Your chat is waiting. And
            you&apos;re already behind.
          </p>
          <p className="text-foreground font-medium">
            Sound familiar? Yeah, us too. That&apos;s why we built this.
          </p>
        </div>
      </div>
    </section>
  );
}
