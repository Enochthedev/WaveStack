import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

const ENTRIES = [
  {
    date: "April 2, 2026",
    version: "0.4.0",
    title: "AI Agents v2",
    changes: [
      "Custom agent personalities — set tone, response style, and escalation rules",
      "Agent task chains — link multiple actions into automated workflows",
      "New greeter agent template for welcoming new followers",
      "Agent activity logs with full audit trail",
    ],
  },
  {
    date: "March 18, 2026",
    version: "0.3.2",
    title: "Content pipeline improvements",
    changes: [
      "Auto-clip sensitivity tuning — choose between conservative and aggressive highlight detection",
      "Batch scheduling — queue multiple clips for publishing across platforms",
      "TikTok and YouTube Shorts export presets",
      "Fixed: clips occasionally missing the first 2 seconds of a highlight",
    ],
  },
  {
    date: "March 5, 2026",
    version: "0.3.0",
    title: "Multi-platform simulcast",
    changes: [
      "Go live on Twitch, YouTube, and Kick simultaneously from one dashboard",
      "Cross-platform chat aggregation — see all chats in one view",
      "Unified viewer count across platforms",
      "Stream health monitoring with bitrate and frame drop alerts",
    ],
  },
  {
    date: "February 20, 2026",
    version: "0.2.0",
    title: "Analytics dashboard",
    changes: [
      "Cross-platform analytics — followers, views, and engagement in one place",
      "Stream performance comparison over time",
      "Audience demographic insights",
      "Export to CSV for sponsor reports",
    ],
  },
  {
    date: "February 1, 2026",
    version: "0.1.0",
    title: "Initial beta launch",
    changes: [
      "Platform connections for Twitch, YouTube, and Kick",
      "Basic chat moderation agent",
      "Auto-clip detection (beta)",
      "Account management and onboarding flow",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Changelog</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            What&apos;s new in WaveStack. We ship updates every two weeks.
          </p>

          <div className="mt-16 space-y-12">
            {ENTRIES.map((entry) => (
              <article key={entry.version} className="relative border-l-2 border-primary/20 pl-6">
                <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-xs text-primary font-medium">
                    v{entry.version}
                  </span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <h2 className="mt-1 font-display text-xl tracking-tight sm:text-2xl">
                  {entry.title}
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {entry.changes.map((change) => (
                    <li
                      key={change}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                      {change}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
