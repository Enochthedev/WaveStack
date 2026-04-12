import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { TheProblem } from "@/components/marketing/the-problem";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { TheStack } from "@/components/marketing/the-stack";
import { SocialProof } from "@/components/marketing/social-proof";
import { Cta } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export default function MarketingPage() {
  return (
    <main className="relative overflow-x-hidden">
      <Nav />
      <Hero />
      <TheProblem />
      <HowItWorks />
      <TheStack />
      <SocialProof />
      <Cta />
      <Footer />
    </main>
  );
}
