import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import Link from "next/link";
import { Book, Code, Plug, Bot, Scissors, BarChart3 } from "lucide-react";

const DOC_SECTIONS = [
  {
    title: "Getting Started",
    description: "Connect your first platform and go live in under 2 minutes.",
    icon: Book,
    links: [
      { label: "Quick start guide", href: "#" },
      { label: "Connecting platforms", href: "#" },
      { label: "Your first stream", href: "#" },
    ],
  },
  {
    title: "Streaming",
    description: "Simulcast, overlays, scenes, and stream management.",
    icon: Plug,
    links: [
      { label: "Multi-platform setup", href: "#" },
      { label: "Chat aggregation", href: "#" },
      { label: "Stream health", href: "#" },
    ],
  },
  {
    title: "AI Agents",
    description: "Deploy, configure, and manage autonomous agents.",
    icon: Bot,
    links: [
      { label: "Agent overview", href: "#" },
      { label: "Moderation rules", href: "#" },
      { label: "Custom personalities", href: "#" },
    ],
  },
  {
    title: "Content Pipeline",
    description: "Auto-clips, scheduling, and cross-platform publishing.",
    icon: Scissors,
    links: [
      { label: "Highlight detection", href: "#" },
      { label: "Clip editor", href: "#" },
      { label: "Publishing queue", href: "#" },
    ],
  },
  {
    title: "Analytics",
    description: "Unified metrics, audience insights, and revenue tracking.",
    icon: BarChart3,
    links: [
      { label: "Dashboard overview", href: "#" },
      { label: "Custom reports", href: "#" },
      { label: "Data export", href: "#" },
    ],
  },
  {
    title: "API Reference",
    description: "REST API, webhooks, and integration guides.",
    icon: Code,
    links: [
      { label: "Authentication", href: "#" },
      { label: "Endpoints", href: "#" },
      { label: "Webhooks", href: "#" },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Documentation</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to get the most out of WaveStack.
          </p>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DOC_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2">
                      <Icon size={18} strokeWidth={1.5} className="text-primary" />
                    </div>
                    <h2 className="font-semibold">{section.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                  <ul className="mt-4 space-y-1.5">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-sm text-primary hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
