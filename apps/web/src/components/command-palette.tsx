"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderOpen,
  Scissors,
  Send,
  Calendar,
  BarChart3,
  Radio,
  Users,
  DollarSign,
  Search,
  Brain,
  MessageSquare,
  Sparkles,
  Workflow,
  Wrench,
  BookOpen,
  Bot,
  Shield,
  Bell,
  Settings,
  CloudUpload,
  Layers,
  Plus,
  ListOrdered,
  ListChecks,
  Swords,
  FlaskConical,
  UsersRound,
  User,
  Link2,
  CreditCard,
  KeyRound,
  Palette,
  Video,
} from "lucide-react";
import { useStreamerMode } from "@/lib/streamer-mode";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  // Pages
  { label: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard, group: "Pages"           },
  { label: "Content",       href: "/content",                 icon: FolderOpen,      group: "Pages"           },
  { label: "Clips",         href: "/clips",                   icon: Scissors,        group: "Pages"           },
  { label: "Uploads",       href: "/uploads",                 icon: CloudUpload,     group: "Pages"           },
  { label: "Publish",       href: "/publish",                 icon: Send,            group: "Pages"           },
  { label: "Queue",         href: "/publish/queue",           icon: ListOrdered,     group: "Pages"           },
  { label: "Schedule",      href: "/publish/schedule",        icon: Calendar,        group: "Pages"           },
  { label: "Analytics",     href: "/analytics",               icon: BarChart3,       group: "Pages"           },
  // Creator
  { label: "Stream",        href: "/stream",                  icon: Radio,           group: "Creator"         },
  { label: "Overlays",      href: "/stream/overlays",         icon: Layers,          group: "Creator"         },
  { label: "Create Clip",   href: "/clips/create",            icon: Plus,            group: "Creator"         },
  { label: "Community",     href: "/community",               icon: Users,           group: "Creator"         },
  { label: "Monetization",  href: "/monetization",            icon: DollarSign,      group: "Creator"         },
  { label: "SEO",           href: "/seo",                     icon: Search,          group: "Creator"         },
  { label: "Competitors",   href: "/competitors",             icon: Swords,          group: "Creator"         },
  // AI & Automation
  { label: "Agents",        href: "/agents",                  icon: Brain,           group: "AI & Automation" },
  { label: "Agent Tasks",   href: "/agents/tasks",            icon: ListChecks,      group: "AI & Automation" },
  { label: "Agent Chat",    href: "/agents/chat",             icon: MessageSquare,   group: "AI & Automation" },
  { label: "Skills",        href: "/skills",                  icon: Sparkles,        group: "AI & Automation" },
  { label: "Workflows",     href: "/workflows",               icon: Workflow,        group: "AI & Automation" },
  { label: "MCP Tools",     href: "/mcp",                     icon: Wrench,          group: "AI & Automation" },
  { label: "Knowledge",     href: "/knowledge",               icon: BookOpen,        group: "AI & Automation" },
  { label: "Sandbox",       href: "/sandbox",                 icon: FlaskConical,    group: "AI & Automation" },
  // Platform
  { label: "Bots",          href: "/bots",                    icon: Bot,             group: "Platform"        },
  { label: "Moderation",    href: "/moderation",              icon: Shield,          group: "Platform"        },
  { label: "Team",          href: "/team",                    icon: UsersRound,      group: "Platform"        },
  { label: "Notifications", href: "/notifications",           icon: Bell,            group: "Platform"        },
  // Settings
  { label: "Settings",      href: "/settings",                icon: Settings,        group: "Settings"        },
  { label: "Account",       href: "/settings/account",        icon: User,            group: "Settings"        },
  { label: "Integrations",  href: "/settings/integrations",   icon: Link2,           group: "Settings"        },
  { label: "Notifications", href: "/settings/notifications",  icon: Bell,            group: "Settings"        },
  { label: "Security",      href: "/settings/security",       icon: Shield,          group: "Settings"        },
  { label: "Billing",       href: "/settings/billing",        icon: CreditCard,      group: "Settings"        },
  { label: "API Keys",      href: "/settings/api",            icon: KeyRound,        group: "Settings"        },
  { label: "Appearance",    href: "/settings/appearance",     icon: Palette,         group: "Settings"        },
] as const;

const GROUPS = ["Pages", "Creator", "AI & Automation", "Platform", "Settings"] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen]   = useState(false);
  const router            = useRouter();
  const { enabled, toggle } = useStreamerMode();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function runStreamerToggle() {
    setOpen(false);
    toggle();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {GROUPS.map((group, gi) => {
          const items = NAV_ITEMS.filter((n) => n.group === group);
          return (
            <div key={group}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}

        {/* Actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="streamer mode toggle" onSelect={runStreamerToggle}>
            <Video className="mr-2 h-4 w-4" />
            {enabled ? "Disable Streamer Mode" : "Enable Streamer Mode"}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
