"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export function Cta() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      SplitText.create(".cta-heading", {
        type: "lines,words",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          gsap.fromTo(
            self.words,
            { yPercent: 120 },
            {
              yPercent: 0,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.03,
              scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 75%",
              },
            },
          );
        },
      });

      gsap.fromTo(
        ".cta-actions",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cta-actions",
            start: "top 88%",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative overflow-hidden px-6 py-16 sm:py-28">
      {/* Gradient background */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#5CE8A5]/20 via-transparent to-[#5CE8A5]/10"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="cta-heading font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
          Your stream is waiting.
        </h2>

        <div className="cta-actions mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0f1a14] px-6 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:bg-[#1a2b22]"
          >
            Start streaming free
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Free to start. No credit card. Set up in under two minutes.
        </p>
      </div>
    </section>
  );
}
