import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export default function TermsPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: April 1, 2026</p>

          <div className="mt-12 space-y-8 text-sm text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-0 [&_h2]:mb-3">
            <div>
              <h2>Agreement</h2>
              <p>
                By using WaveStack, you agree to these terms. If you don&apos;t agree, don&apos;t
                use the service. Simple as that.
              </p>
            </div>

            <div>
              <h2>Your account</h2>
              <p>
                You&apos;re responsible for your account and everything that happens under it. Keep
                your credentials secure. If you suspect unauthorized access, let us know
                immediately.
              </p>
            </div>

            <div>
              <h2>What you can do</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Use WaveStack to manage, automate, and grow your streams</li>
                <li>Connect your platform accounts (Twitch, YouTube, Kick, etc.)</li>
                <li>Deploy AI agents for chat moderation and automation</li>
                <li>Export your data at any time</li>
              </ul>
            </div>

            <div>
              <h2>What you can&apos;t do</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Use WaveStack to violate any platform&apos;s terms of service</li>
                <li>Deploy agents that harass, spam, or deceive viewers</li>
                <li>Attempt to reverse-engineer, exploit, or attack our systems</li>
                <li>Resell access without our written permission</li>
                <li>Use the service for anything illegal</li>
              </ul>
            </div>

            <div>
              <h2>Your content</h2>
              <p>
                You own your content. We don&apos;t claim rights to your streams, clips, or data. We
                only access what we need to provide the service (like stream metadata for
                auto-clips). You grant us a limited license to process your content solely for
                providing WaveStack features.
              </p>
            </div>

            <div>
              <h2>Pricing and billing</h2>
              <p>
                Free tier features are free. Paid plans are billed monthly. You can cancel anytime —
                your access continues until the end of the billing period. We don&apos;t do refunds
                for partial months, but we&apos;re reasonable humans. If something goes wrong, talk
                to us.
              </p>
            </div>

            <div>
              <h2>Service availability</h2>
              <p>
                We aim for high uptime but don&apos;t guarantee 100%. We&apos;ll give advance notice
                for planned maintenance. If we discontinue the service, we&apos;ll give at least 90
                days notice and help you export your data.
              </p>
            </div>

            <div>
              <h2>Limitation of liability</h2>
              <p>
                WaveStack is provided &ldquo;as is.&rdquo; We do our best, but we&apos;re not liable
                for lost revenue, missed streams, or agent actions that don&apos;t go as planned.
                Use good judgment and keep backups of anything critical.
              </p>
            </div>

            <div>
              <h2>Changes to terms</h2>
              <p>
                We may update these terms. We&apos;ll notify you of significant changes at least 30
                days in advance. Continued use after changes means you accept the new terms.
              </p>
            </div>

            <div>
              <h2>Contact</h2>
              <p>
                Questions about these terms? Email us at{" "}
                <span className="text-primary">legal@wavestack.dev</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
