"use client";

import { usePathname } from "next/navigation";
import {
  User, Link2, Bell, Shield, CreditCard, KeyRound, Palette,
} from "lucide-react";

const SETTINGS_NAV = [
  { href: "/settings/account",       icon: User,       label: "Account"       },
  { href: "/settings/integrations",  icon: Link2,      label: "Integrations"  },
  { href: "/settings/notifications", icon: Bell,       label: "Notifications" },
  { href: "/settings/security",      icon: Shield,     label: "Security"      },
  { href: "/settings/billing",       icon: CreditCard, label: "Billing"       },
  { href: "/settings/api",           icon: KeyRound,   label: "API Keys"      },
  { href: "/settings/appearance",    icon: Palette,    label: "Appearance"    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current  = SETTINGS_NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, integrations, and preferences
        </p>
      </div>

      {current && (
        <div className="flex items-center gap-2">
          <current.icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {current.label}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
