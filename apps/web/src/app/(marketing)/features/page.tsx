import { Nav } from "@/components/marketing/nav";
import { FeaturesDetail } from "@/components/marketing/features-detail";
import { Cta } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export default function FeaturesPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <FeaturesDetail />
      <Cta />
      <Footer />
    </main>
  );
}
