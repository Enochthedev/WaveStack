"use client";

import { useRole, ROLES, ROLE_META } from "@/lib/role";
import { cn } from "@/lib/utils";
import { FlaskConical } from "lucide-react";
import { useState } from "react";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[role];

  return (
    <div className="fixed bottom-6 left-20 z-[60] select-none">
      {/* Dropdown — opens upward */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-dashed border-border bg-background shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Demo — switch role
            </p>
          </div>
          {ROLES.map((r) => {
            const m = ROLE_META[r];
            return (
              <button
                key={r}
                onClick={() => { setRole(r); setOpen(false); }}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                  r === role && "bg-muted/70"
                )}
              >
                <span className={cn("mt-0.5 shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", m.color)}>
                  {m.label}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">{m.description}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Trigger pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:shadow-md",
          "bg-background",
          meta.color
        )}
        title="Switch demo role"
      >
        <FlaskConical className="h-3 w-3 shrink-0" />
        <span>Demo: {meta.label}</span>
      </button>
    </div>
  );
}
