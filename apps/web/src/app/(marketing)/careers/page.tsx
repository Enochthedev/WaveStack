import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import Link from "next/link";

const OPENINGS = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Platform",
    location: "Remote (US/EU)",
    type: "Full-time",
    description:
      "Build the core infrastructure that powers real-time streaming, AI agents, and cross-platform content pipelines.",
  },
  {
    title: "ML Engineer — Content Understanding",
    team: "AI",
    location: "Remote",
    type: "Full-time",
    description:
      "Design and train models that detect stream highlights, analyze chat sentiment, and power intelligent agent behaviors.",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    description:
      "Shape the experience of WaveStack from dashboards to agent configuration. You'll own the end-to-end design for creator-facing features.",
  },
  {
    title: "Developer Advocate",
    team: "Community",
    location: "Remote",
    type: "Full-time",
    description:
      "Help creators and developers get the most out of WaveStack through docs, tutorials, and community engagement.",
  },
];

export default function CareersPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Careers</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground leading-relaxed">
            We&apos;re building the platform we wished existed when we were creators. If that
            resonates, we&apos;d love to work with you.
          </p>

          <div className="mt-6 text-sm text-muted-foreground">
            All roles are remote-first. We care about output, not office hours.
          </div>

          <div className="mt-12 space-y-4">
            {OPENINGS.map((role) => (
              <Link
                key={role.title}
                href="#"
                className="group block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/20"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-semibold group-hover:text-primary transition-colors">
                    {role.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5">{role.team}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5">{role.location}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5">{role.type}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 text-center">
            <h3 className="font-semibold">Don&apos;t see your role?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;re always open to meeting exceptional people. Send us a note at{" "}
              <span className="text-primary font-medium">careers@wavestack.dev</span>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
