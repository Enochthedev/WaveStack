"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { chatMessages } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Send, Mic, ChevronDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/colors";
import { useCompanionAvatar } from "@/lib/use-companion-avatar";

// ── Context-aware quick actions per route ────────────────────────────────────

const contextActions: Record<string, string[]> = {
  "/dashboard":        ["What should I post today?", "Summarize my week", "Any alerts?"],
  "/clips":            ["Find my best highlights", "Clip last 30 seconds", "Batch clip ideas"],
  "/content":          ["Caption this asset", "Find unused content", "Content ideas"],
  "/stream":           ["What should I stream?", "Recap last stream", "Stream title ideas"],
  "/publish":          ["Draft a caption", "Best time to post today?", "Schedule next 5 posts"],
  "/publish/schedule": ["Gaps in my schedule?", "Fill next week", "Reorder queue"],
  "/publish/compose":  ["Write a caption for me", "Suggest hashtags", "Best platforms for this?"],
  "/analytics":        ["Summarize my week", "What's my best content?", "Compare platforms"],
  "/community":        ["Top fan shoutout", "Engagement tips", "Draft a community post"],
  "/seo":              ["Optimize my latest title", "Find trending keywords", "Audit top video"],
  "/monetization":     ["How close am I to YPP?", "Sponsor outreach help", "Revenue breakdown"],
  "/moderation":       ["Review pending flags", "Tighten spam rules", "False positive report"],
  "/agents":           ["What are agents doing?", "Create a new task", "Pause all agents"],
  "/agents/chat":      ["Open history", "New conversation", "Export chat"],
  "/bots":             ["Bot status check", "Add a command", "Check bot logs"],
  "/skills":           ["Run Clip & Ship", "Build a skill", "Most used skills"],
  "/workflows":        ["New workflow", "Fix failed run", "Schedule a workflow"],
  "/mcp":              ["Check connections", "Test a tool", "Add MCP server"],
  "/knowledge":        ["Ingest my stream VODs", "Search knowledge base", "What do I know?"],
  "/settings":         ["Connect a platform", "Check integrations", "Account overview"],
  "/notifications":    ["Mark all read", "Filter by type", "Alert settings"],
};

const DEFAULT_ACTIONS = ["What can you do?", "Show my stats", "Help me post today"];

// ── Types ─────────────────────────────────────────────────────────────────────

type ToolCall = { tool: string; status: "running" | "done" };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  agentType?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

const BTN    = 56;
const PANEL_W = 380;
const PANEL_H = 600;
const MARGIN  = 16;

// ── Avatar helper component ──────────────────────────────────────────────────

function CompanionAvatarImg({
  url,
  size = 24,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Wave AI"
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Companion() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(chatMessages);
  const [isTyping, setIsTyping] = useState(false);

  const { avatarUrl } = useCompanionAvatar();

  const pathname   = usePathname();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDragging = useRef(false);
  const hasMoved   = useRef(false);
  const dragStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    setPos({ x: window.innerWidth - BTN - MARGIN - 8, y: window.innerHeight - BTN - MARGIN - 8 });
    setMounted(true);
  }, []);

  useEffect(() => {
    function onResize() {
      setPos((p) => ({
        x: clamp(p.x, 0, window.innerWidth  - BTN),
        y: clamp(p.y, 0, window.innerHeight - BTN),
      }));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [open, messages]);

  // ── Drag ─────────────────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    hasMoved.current   = false;
    dragStart.current  = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  }
  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
    setPos({
      x: clamp(dragStart.current.px + dx, 0, window.innerWidth  - BTN),
      y: clamp(dragStart.current.py + dy, 0, window.innerHeight - BTN),
    });
  }
  function handlePointerUp() {
    isDragging.current = false;
    if (!hasMoved.current) setOpen(true);
  }

  // ── Panel position ────────────────────────────────────────────────────────

  const panelLeft = !mounted ? 0 : clamp(pos.x + BTN - PANEL_W, MARGIN, window.innerWidth  - PANEL_W - MARGIN);
  const panelTop  = !mounted ? 0 : (
    pos.y >= PANEL_H + MARGIN
      ? pos.y - PANEL_H - MARGIN
      : clamp(pos.y + BTN + MARGIN, MARGIN, window.innerHeight - PANEL_H - MARGIN)
  );

  // ── Context ───────────────────────────────────────────────────────────────

  const actions = Object.entries(contextActions).find(([key]) =>
    pathname === key || (key !== "/" && pathname.startsWith(key))
  )?.[1] ?? DEFAULT_ACTIONS;

  const pageLabel = pathname.split("/").filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" › ") || "Dashboard";

  // ── Chat ──────────────────────────────────────────────────────────────────

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: text }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Got it! Working on "${text}" for you. Once connected to the Agent Orchestrator, I'll execute this across your entire platform.`,
          agentType: "wave",
        },
      ]);
      setIsTyping(false);
    }, 1200);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  if (!mounted) return null;

  return (
    <>
      {/* ── Floating button ────────────────────────────────── */}
      {!open && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ left: pos.x, top: pos.y }}
          className="fixed z-50 h-14 w-14 touch-none select-none group"
          aria-label="Open Wave"
        >
          <span className={cn("absolute inset-0 rounded-full opacity-20 animate-ping", brand.bg)} />
          <span className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105 cursor-grab active:cursor-grabbing overflow-hidden",
            brand.bg, brand.shadow, brand.ring, "ring-2"
          )}>
            <CompanionAvatarImg url={avatarUrl} size={36} className="pointer-events-none" />
          </span>
          <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Wave · Your AI Companion
          </span>
        </button>
      )}

      {/* ── Companion panel ────────────────────────────────── */}
      {open && (
        <div
          style={{ left: panelLeft, top: panelTop }}
          className="fixed z-50 flex flex-col w-[380px] h-[600px] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={cn("relative flex items-center gap-3 px-4 py-3 shrink-0", brand.bg)}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30 overflow-hidden">
              <CompanionAvatarImg url={avatarUrl} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">Wave</p>
              <p className="text-[11px] text-white/70 truncate">Your AI Companion · All platforms</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link href="/agents/chat">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/15" title="View full history">
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/15"
                onClick={() => setOpen(false)} title="Minimise"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Context bar */}
          <div className={cn("flex items-center gap-2 px-4 py-2 border-b border-border shrink-0", brand.bgSubtle)}>
            <Zap className={cn("h-3 w-3 shrink-0", brand.text)} />
            <span className="text-[11px] text-muted-foreground">
              Context: <span className={cn("font-medium", brand.text)}>{pageLabel}</span>
            </span>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 px-4 py-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full mr-2 mt-0.5 overflow-hidden", brand.bg)}>
                      <CompanionAvatarImg url={avatarUrl} size={18} />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground"
                  )}>
                    {msg.role === "assistant" && msg.agentType && (
                      <Badge variant="outline" className={cn("mb-1 text-[10px] py-0 h-4", brand.border, brand.text)}>
                        {msg.agentType === "wave" ? "Wave" : msg.agentType}
                      </Badge>
                    )}
                    <p className="whitespace-pre-wrap">{renderContent(msg.content)}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full mr-2 mt-0.5 overflow-hidden", brand.bg)}>
                    <CompanionAvatarImg url={avatarUrl} size={18} />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Quick chips */}
          <div className={cn("px-4 pt-2 pb-1 flex gap-1.5 flex-wrap border-t border-border shrink-0")}>
            {actions.slice(0, 3).map((action) => (
              <button
                key={action}
                onClick={() => { setInput(action); textareaRef.current?.focus(); }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                  brand.border, brand.text, brand.bgSubtle, "hover:bg-primary/10"
                )}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-4 pb-4 pt-2 shrink-0">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Wave anything…"
              className="min-h-[40px] max-h-[100px] resize-none text-xs rounded-xl"
              rows={1}
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="icon"
                className={cn("h-8 w-8 rounded-xl border-0", brand.bg)}
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary">
                <Mic className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
