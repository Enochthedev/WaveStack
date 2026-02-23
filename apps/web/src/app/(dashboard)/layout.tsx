"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Companion } from "@/components/companion/companion";
import { CommandPalette } from "@/components/command-palette";
import { AccessGuard } from "@/components/shared/access-guard";
import { RoleProvider } from "@/lib/role";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <RoleProvider>
      <div className="min-h-screen bg-background">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className={cn("flex flex-col transition-all duration-300", collapsed ? "ml-16" : "ml-60")}>
          <Topbar />
          <main className="flex-1 p-6">
            <AccessGuard>{children}</AccessGuard>
          </main>
        </div>
        <Companion />
        <CommandPalette />
      </div>
    </RoleProvider>
  );
}
