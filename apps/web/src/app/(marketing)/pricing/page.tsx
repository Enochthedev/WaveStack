import { Nav } from "@/components/marketing/nav";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Cta } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export default function PricingPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <PricingSection />
      <Cta />
      <Footer />
    </main>
  );
}
