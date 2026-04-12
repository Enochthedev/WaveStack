import { Nav } from "@/components/marketing/nav";
import { AboutSection } from "@/components/marketing/about-section";
import { Footer } from "@/components/marketing/footer";

export default function AboutPage() {
  return (
    <main className="relative bg-background text-foreground overflow-x-hidden">
      <Nav />
      <AboutSection />
      <Footer />
    </main>
  );
}
