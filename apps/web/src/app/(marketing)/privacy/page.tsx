import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export default function PrivacyPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <section className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: April 1, 2026</p>

          <div className="mt-12 space-y-8 text-sm text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-0 [&_h2]:mb-3">
            <div>
              <h2>Overview</h2>
              <p>
                WaveStack (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your
                privacy. This policy explains what data we collect, why we collect it, and how we
                protect it. We don&apos;t sell your data. Period.
              </p>
            </div>

            <div>
              <h2>What we collect</h2>
              <p>
                <strong className="text-foreground">Account information:</strong> Email, username,
                and connected platform accounts (Twitch, YouTube, etc.) when you sign up.
              </p>
              <p className="mt-2">
                <strong className="text-foreground">Usage data:</strong> How you use WaveStack —
                features accessed, streams created, agents deployed. We use this to improve the
                product, not to target ads.
              </p>
              <p className="mt-2">
                <strong className="text-foreground">Stream data:</strong> When you connect
                platforms, we access stream metadata (titles, viewer counts, chat messages) to power
                features like auto-clips, analytics, and moderation. We do not record or store raw
                video or audio.
              </p>
            </div>

            <div>
              <h2>How we use your data</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide and improve WaveStack features</li>
                <li>Send product updates and important notices (you can opt out)</li>
                <li>Detect and prevent abuse, fraud, and security issues</li>
                <li>Generate anonymized, aggregate analytics</li>
              </ul>
            </div>

            <div>
              <h2>Data sharing</h2>
              <p>
                We never sell personal data. We share data only with service providers who help us
                operate (hosting, analytics, email), and only under strict data processing
                agreements. We will disclose information if required by law.
              </p>
            </div>

            <div>
              <h2>Data retention</h2>
              <p>
                We retain your data for as long as your account is active. If you delete your
                account, we remove your personal data within 30 days. Anonymized aggregate data may
                be retained indefinitely.
              </p>
            </div>

            <div>
              <h2>Your rights</h2>
              <p>
                You can access, export, correct, or delete your data at any time from your account
                settings or by contacting us at{" "}
                <span className="text-primary">privacy@wavestack.dev</span>.
              </p>
            </div>

            <div>
              <h2>Security</h2>
              <p>
                We use encryption in transit (TLS) and at rest. OAuth tokens for connected platforms
                are stored encrypted. We conduct regular security reviews and follow industry best
                practices.
              </p>
            </div>

            <div>
              <h2>Changes</h2>
              <p>
                We&apos;ll notify you of significant changes to this policy via email or in-app
                notification at least 30 days before they take effect.
              </p>
            </div>

            <div>
              <h2>Contact</h2>
              <p>
                Questions? Reach us at <span className="text-primary">privacy@wavestack.dev</span>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
