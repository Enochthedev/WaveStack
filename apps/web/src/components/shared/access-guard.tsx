"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole, ROLE_META } from "@/lib/role";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Wrap page content with this component to enforce role-based access.
 * If the current role cannot access the current route, a "no access" screen
 * is shown (and the user is redirected to /dashboard after a short delay).
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const { role, can } = useRole();
  const pathname      = usePathname();
  const router        = useRouter();
  const allowed       = can(pathname);
  const meta          = ROLE_META[role];

  useEffect(() => {
    if (!allowed) {
      const t = setTimeout(() => router.replace("/dashboard"), 4000);
      return () => clearTimeout(t);
    }
  }, [allowed, router]);

  if (allowed) return <>{children}</>;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center gap-6 text-center px-4">
      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed",
        meta.color
      )}>
        <ShieldOff className="h-7 w-7" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-xl font-semibold">Access restricted</h2>
        <p className="text-sm text-muted-foreground">
          Your current role{" "}
          <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold mx-0.5", meta.color)}>
            {meta.label}
          </span>{" "}
          doesn&apos;t have permission to view this page.
        </p>
        <p className="text-xs text-muted-foreground">Redirecting to dashboard in a moment…</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.replace("/dashboard")}>
          Go to Dashboard
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    </div>
  );
}
