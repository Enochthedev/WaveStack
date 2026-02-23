"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Radio,
  Scissors,
  FolderOpen,
  CloudUpload,
  Layers,
  Send,
  ListOrdered,
  Calendar,
  BarChart3,
  Users,
  Search,
  DollarSign,
  Swords,
  Brain,
  ListChecks,
  MessageSquare,
  Workflow,
  Sparkles,
  BookOpen,
  Wrench,
  Bot,
  Shield,
  Bell,
  Settings,
  UsersRound,
  ChevronLeft,
  ChevronRight,
  Plus,
  FlaskConical,
  User,
  Link2,
  CreditCard,
  KeyRound,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRole } from "@/lib/role";

// ── Types ──────────────────────────────────────────────────────────────────

type NavChild = {
  label: string;
  href:  string;
  icon:  React.ElementType;
};

type NavItem = {
  label:    string;
  href:     string;
  icon:     React.ElementType;
  children?: NavChild[];
};

type NavSection = {
  label?: string;
  items:  NavItem[];
};

// ── Nav tree ───────────────────────────────────────────────────────────────

const navSections: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Create",
    items: [
      {
        label: "Stream", href: "/stream", icon: Radio,
        children: [
          { label: "Overlays",    href: "/stream/overlays", icon: Layers },
        ],
      },
      {
        label: "Clips", href: "/clips", icon: Scissors,
        children: [
          { label: "Create Clip", href: "/clips/create", icon: Plus },
        ],
      },
      { label: "Content", href: "/content", icon: FolderOpen  },
      { label: "Uploads", href: "/uploads", icon: CloudUpload },
    ],
  },
  {
    label: "Publish",
    items: [
      {
        label: "Publishing", href: "/publish", icon: Send,
        children: [
          { label: "Queue",    href: "/publish/queue",    icon: ListOrdered },
          { label: "Schedule", href: "/publish/schedule", icon: Calendar    },
        ],
      },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Grow",
    items: [
      { label: "Community",    href: "/community",    icon: Users      },
      { label: "SEO",          href: "/seo",          icon: Search     },
      { label: "Monetization", href: "/monetization", icon: DollarSign },
      { label: "Competitors",  href: "/competitors",  icon: Swords     },
    ],
  },
  {
    label: "Automate",
    items: [
      {
        label: "Agents", href: "/agents", icon: Brain,
        children: [
          { label: "Tasks", href: "/agents/tasks", icon: ListChecks    },
          { label: "Chat",  href: "/agents/chat",  icon: MessageSquare },
        ],
      },
      { label: "Workflows", href: "/workflows",  icon: Workflow      },
      { label: "Skills",    href: "/skills",     icon: Sparkles      },
      { label: "Knowledge", href: "/knowledge",  icon: BookOpen      },
      { label: "MCP Tools", href: "/mcp",        icon: Wrench        },
      { label: "Sandbox",   href: "/sandbox",    icon: FlaskConical  },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Bots", href: "/bots", icon: Bot },
      {
        label: "Settings", href: "/settings", icon: Settings,
        children: [
          { label: "Account",       href: "/settings/account",       icon: User       },
          { label: "Integrations",  href: "/settings/integrations",  icon: Link2      },
          { label: "Notifications", href: "/settings/notifications", icon: Bell       },
          { label: "Security",      href: "/settings/security",      icon: Shield     },
          { label: "Billing",       href: "/settings/billing",       icon: CreditCard },
          { label: "API Keys",      href: "/settings/api",           icon: KeyRound   },
          { label: "Appearance",    href: "/settings/appearance",    icon: Palette    },
          { label: "Team",          href: "/team",                   icon: UsersRound },
          { label: "Moderation",    href: "/moderation",             icon: Shield     },
        ],
      },
    ],
  },
];

// ── Flyout state type ───────────────────────────────────────────────────────

type FlyoutState = {
  item:        NavItem;
  visChildren: NavChild[];
  top:         number;
};

// ── Component ──────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle:  () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { can }  = useRole();

  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [flyout,    setFlyout]    = useState<FlyoutState | null>(null);
  const [mounted,   setMounted]   = useState(false);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount guard for createPortal (SSR-safe).
  useEffect(() => { setMounted(true); }, []);

  // Auto-expand parents when navigating directly to a child route.
  useEffect(() => {
    const toOpen = new Set<string>();
    for (const section of navSections) {
      for (const item of section.items) {
        const childMatch = item.children?.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + "/")
        );
        if (childMatch) toOpen.add(item.href);
      }
    }
    if (toOpen.size > 0) {
      setOpenItems((prev) => new Set([...prev, ...toOpen]));
    }
  }, [pathname]);

  // Close flyout when sidebar expands.
  useEffect(() => {
    if (!collapsed) setFlyout(null);
  }, [collapsed]);

  function toggleItem(href: string, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(href) ? next.delete(href) : next.add(href);
      return next;
    });
  }

  // ── Flyout helpers ────────────────────────────────────────────────────────

  function openFlyout(item: NavItem, visChildren: NavChild[], e: React.MouseEvent) {
    if (!collapsed) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyout({ item, visChildren, top: rect.top });
  }

  function scheduleFlyoutClose() {
    closeTimer.current = setTimeout(() => setFlyout(null), 120);
  }

  function keepFlyout() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  // ── Flyout portal ─────────────────────────────────────────────────────────

  const flyoutPortal = mounted && flyout
    ? createPortal(
        <div
          className="fixed z-[200]"
          style={{ left: 68, top: flyout.top }}
          onMouseEnter={keepFlyout}
          onMouseLeave={scheduleFlyoutClose}
        >
          <div className="rounded-lg border border-border bg-popover shadow-lg overflow-hidden min-w-[180px]">
            {/* Parent row */}
            <Link
              href={flyout.item.href}
              onClick={() => setFlyout(null)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent/50",
                (pathname === flyout.item.href)
                  ? "text-primary"
                  : "text-popover-foreground"
              )}
            >
              <flyout.item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  pathname === flyout.item.href ? "text-primary" : "text-muted-foreground"
                )}
              />
              {flyout.item.label}
            </Link>

            {/* Children */}
            {flyout.visChildren.length > 0 && (
              <>
                <div className="mx-2 h-px bg-border/60" />
                {flyout.visChildren.map((child) => {
                  const isChildActive =
                    pathname === child.href || pathname.startsWith(child.href + "/");
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setFlyout(null)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                        isChildActive
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-popover-foreground"
                      )}
                    >
                      <child.icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isChildActive ? "text-primary" : ""
                        )}
                      />
                      {child.label}
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-spring-smooth",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Collapse toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
          onClick={onToggle}
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform duration-300 ease-spring-smooth", collapsed && "rotate-180")} />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center px-3 overflow-hidden whitespace-nowrap">
          <Link href="/dashboard" className="group flex items-center gap-2.5 outline-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0 transition-transform duration-300 ease-spring-bouncy group-hover:scale-[1.15] group-hover:rotate-3 shadow-sm">
              W
            </div>
            <span className={cn(
              "font-semibold text-base tracking-tight transition-all duration-300",
              collapsed
                ? "opacity-0 translate-x-[-10px]"
                : "opacity-100 translate-x-0 group-hover:text-primary"
            )}>
              WaveStack
            </span>
          </Link>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 min-h-0 px-2 overflow-hidden">
          <nav className="flex flex-col gap-0.5 py-2">
            {navSections.map((section, sIdx) => {
              const visibleItems = section.items.filter((item) => {
                if (can(item.href)) return true;
                return item.children?.some((c) => can(c.href));
              });
              if (visibleItems.length === 0) return null;

              return (
                <div key={sIdx} className="mb-1">
                  {/* Section header */}
                  {section.label && (
                    <div className="relative h-8 overflow-hidden">
                      <p className={cn(
                        "absolute left-3 top-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap transition-all duration-300",
                        collapsed ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
                      )}>
                        {section.label}
                      </p>
                      <Separator className={cn(
                        "absolute left-2 top-4 w-8 transition-all duration-300",
                        collapsed ? "opacity-100" : "opacity-0"
                      )} />
                    </div>
                  )}

                  {/* Items */}
                  {visibleItems.map((item) => {
                    const isActive    = pathname === item.href;
                    const isOpen      = openItems.has(item.href);
                    const hasChildren = Boolean(item.children?.length);
                    const visChildren = item.children?.filter((c) => can(c.href)) ?? [];
                    const childActive = visChildren.some(
                      (c) => pathname === c.href || pathname.startsWith(c.href + "/")
                    );

                    const parentRowClass = cn(
                      "group flex items-center rounded-md text-sm transition-all duration-200 border-l-2",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-primary"
                        : childActive
                        ? "border-primary/50 text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                        : "border-transparent text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    );

                    return (
                      <div key={item.href}>
                        {/* ── Parent row ── */}
                        <div
                          className={parentRowClass}
                          onMouseEnter={(e) => collapsed && openFlyout(item, visChildren, e)}
                          onMouseLeave={() => collapsed && scheduleFlyoutClose()}
                        >
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (hasChildren && visChildren.length > 0 && !isOpen) {
                                toggleItem(item.href);
                              }
                              setFlyout(null);
                            }}
                            className="flex flex-1 items-center gap-3 px-3 py-2 overflow-hidden whitespace-nowrap outline-none"
                            title={collapsed ? item.label : undefined}
                          >
                            <item.icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-all duration-200 nav-icon-animate",
                                isActive || childActive ? "text-primary" : "group-hover:text-primary"
                              )}
                            />
                            <span className={cn(
                              "transition-all duration-300",
                              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                            )}>
                              {item.label}
                            </span>
                          </Link>

                          {/* Chevron — expanded mode only */}
                          {hasChildren && !collapsed && visChildren.length > 0 && (
                            <button
                              onClick={(e) => toggleItem(item.href, e)}
                              className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition-colors"
                              aria-label={isOpen ? "Collapse" : "Expand"}
                            >
                              <ChevronRight
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform duration-200",
                                  isOpen && "rotate-90"
                                )}
                              />
                            </button>
                          )}
                        </div>

                        {/* ── Children — EXPANDED mode ── */}
                        {!collapsed && isOpen && visChildren.length > 0 && (
                          <div className="ml-4 mt-0.5 mb-1 border-l border-border/60 pl-2 space-y-0.5">
                            {visChildren.map((child) => {
                              const isChildActive =
                                pathname === child.href ||
                                pathname.startsWith(child.href + "/");
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-150 border-l-2",
                                    isChildActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-primary"
                                      : "border-transparent text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  <child.icon
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0",
                                      isChildActive ? "text-primary" : ""
                                    )}
                                  />
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        {/* ── Children — COLLAPSED mode (stacked icon buttons) ── */}
                        {collapsed && (isOpen || childActive) && visChildren.length > 0 && (
                          <div className="flex flex-col items-center gap-0.5 py-0.5 relative">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border/50" />
                            {visChildren.map((child) => {
                              const isChildActive =
                                pathname === child.href ||
                                pathname.startsWith(child.href + "/");
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  title={child.label}
                                  className={cn(
                                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                                    isChildActive
                                      ? "bg-sidebar-accent text-primary"
                                      : "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  <child.icon className="h-3.5 w-3.5" />
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Status dot */}
        <div className="shrink-0 border-t border-border p-3 overflow-hidden whitespace-nowrap group cursor-pointer">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ml-1.5 transition-transform duration-300 ease-spring-bouncy group-hover:scale-[1.5]" />
            <span className={cn(
              "transition-all duration-300 ml-1.5 group-hover:text-foreground",
              collapsed ? "opacity-0 translate-x-[-10px]" : "opacity-100 translate-x-0"
            )}>
              All systems operational
            </span>
          </div>
        </div>
      </aside>

      {/* Hover flyout portal — rendered outside sidebar to avoid overflow clipping */}
      {flyoutPortal}
    </>
  );
}
