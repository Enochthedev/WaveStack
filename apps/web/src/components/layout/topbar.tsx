"use client";

import Link from "next/link";
import { Bell, Search, User, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { notifications } from "@/lib/mock-data";
import { useRole, ROLES, ROLE_META } from "@/lib/role";
import { cn } from "@/lib/utils";

const unread = notifications.filter((n) => !n.isRead);
const preview = unread.slice(0, 4);

export function Topbar() {
  const { role, setRole } = useRole();
  const roleMeta = ROLE_META[role];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div
        className="relative flex-1 max-w-md cursor-pointer"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
          );
        }}
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          placeholder="Search everything… (⌘K)"
          className="pl-9 bg-muted/50 cursor-pointer pointer-events-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Bell with notification dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread.length > 0 && (
                <Badge className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">
                  {unread.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 text-sm font-semibold">Notifications</div>
            <DropdownMenuSeparator />
            {preview.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                All caught up!
              </div>
            ) : (
              preview.map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer">
                  <span className="text-sm font-medium leading-tight">{n.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{n.detail}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="flex justify-center py-2 text-xs text-primary font-medium cursor-pointer">
                View all notifications →
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Role switcher (demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted/50",
              roleMeta.color
            )}>
              <FlaskConical className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{roleMeta.label}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Preview as role
            </div>
            <DropdownMenuSeparator />
            {ROLES.map((r) => {
              const m = ROLE_META[r];
              return (
                <DropdownMenuItem
                  key={r}
                  onClick={() => setRole(r)}
                  className="flex items-start gap-2.5 px-3 py-2 cursor-pointer"
                >
                  <span className={cn(
                    "mt-0.5 shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                    m.color
                  )}>
                    {m.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">{m.description}</span>
                  {r === role && <span className="ml-auto text-primary text-xs">✓</span>}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">CR</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden sm:inline">Creator</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
