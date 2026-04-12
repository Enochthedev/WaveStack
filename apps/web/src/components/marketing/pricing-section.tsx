"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For creators just getting started with automation.",
    features: [
      "1 connected platform",
      "Basic analytics dashboard",
      "5 auto-clips per month",
      "Community chat moderation",
      "Standard support",
    ],
    cta: "Get started",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For growing creators who need full control.",
    features: [
      "Unlimited platforms",
      "Advanced analytics & insights",
      "Unlimited auto-clips",
      "3 AI agents",
      "Workflow automation",
      "Content scheduling",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/register",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    description: "For teams and agencies managing multiple creators.",
    features: [
      "Everything in Pro",
      "10 AI agents",
      "Team collaboration",
      "Custom workflows",
      "API access",
      "Dedicated account manager",
      "SSO & audit logs",
    ],
    cta: "Contact sales",
    href: "/register",
    highlight: false,
  },
] as const;

export function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      SplitText.create(".pricing-heading", {
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

      gsap.fromTo(
        ".pricing-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: ".pricing-grid", start: "top 80%" },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="pricing" className="px-6 pt-28 pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <h1 className="pricing-heading font-display text-5xl tracking-tight sm:text-6xl">
            Simple pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you are ready.
          </p>
        </div>

        <div className="pricing-grid grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card flex flex-col rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-primary bg-primary/3 shadow-lg shadow-primary/5 ring-1 ring-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <div className="mb-4 inline-flex self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Most popular
                </div>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl tracking-tight">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-6 inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                    : "border border-border text-foreground hover:bg-secondary"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
