import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Mail, MessageCircle, FileText } from "lucide-react";

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    description: "For general inquiries, partnerships, or press.",
    action: "hello@wavestack.dev",
    href: "mailto:hello@wavestack.dev",
  },
  {
    icon: MessageCircle,
    title: "Discord",
    description: "Join our community for support, feature requests, and chat.",
    action: "Join Discord",
    href: "#",
  },
  {
    icon: FileText,
    title: "Documentation",
    description: "Find answers in our guides, API reference, and tutorials.",
    action: "Read docs",
    href: "/docs",
  },
];

export default function ContactPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Contact</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We read every message. Response time is usually under 24 hours.
          </p>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              return (
                <a
                  key={ch.title}
                  href={ch.href}
                  className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/20"
                >
                  <div className="rounded-xl bg-primary/10 p-2.5 w-fit">
                    <Icon size={20} strokeWidth={1.5} className="text-primary" />
                  </div>
                  <h2 className="mt-4 font-semibold">{ch.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{ch.description}</p>
                  <span className="mt-3 inline-block text-sm text-primary font-medium group-hover:underline">
                    {ch.action}
                  </span>
                </a>
              );
            })}
          </div>

          <div className="mt-20">
            <h2 className="font-display text-2xl tracking-tight sm:text-3xl">Send us a message</h2>
            <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1.5">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary resize-none"
                  placeholder="What's on your mind?"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Send message
              </button>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
