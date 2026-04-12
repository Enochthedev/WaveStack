import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import Link from "next/link";

const POSTS = [
  {
    slug: "#",
    title: "Why we built WaveStack (and what we learned from 12 tabs)",
    excerpt:
      "Every creator we talked to had the same problem: they spent more time managing tools than making content. This is the story of how frustration became a product.",
    date: "March 28, 2026",
    category: "Company",
    readTime: "5 min",
  },
  {
    slug: "#",
    title: "AI moderation that actually understands your community",
    excerpt:
      "Most chat bots are just regex filters. We built agents that learn your community's tone, understand context, and make decisions you'd actually agree with.",
    date: "March 15, 2026",
    category: "Product",
    readTime: "4 min",
  },
  {
    slug: "#",
    title: "Auto-clips: how we detect your best moments",
    excerpt:
      "Chat velocity, audio peaks, gameplay events — we combine multiple signals to find highlights that humans actually want to watch.",
    date: "March 3, 2026",
    category: "Engineering",
    readTime: "7 min",
  },
  {
    slug: "#",
    title: "Simulcasting in 2026: the state of multi-platform streaming",
    excerpt:
      "Twitch, YouTube, Kick — every platform wants exclusivity, but creators want reach. Here's how we navigate the multi-platform landscape.",
    date: "February 18, 2026",
    category: "Industry",
    readTime: "6 min",
  },
];

export default function BlogPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Blog</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Thoughts on streaming, creator tools, and building WaveStack.
          </p>

          <div className="mt-16 space-y-10">
            {POSTS.map((post) => (
              <Link
                key={post.title}
                href={post.slug}
                className="group block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/20 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                    {post.category}
                  </span>
                  <span>{post.date}</span>
                  <span>{post.readTime} read</span>
                </div>
                <h2 className="mt-3 font-display text-xl tracking-tight group-hover:text-primary transition-colors sm:text-2xl">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
