import { ForceLight } from "@/components/marketing/force-light";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceLight />
      {children}
    </>
  );
}
