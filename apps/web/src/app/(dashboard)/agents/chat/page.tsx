"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send, Loader2, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/colors";
import { BASE_URL } from "@/lib/api";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  agentType?: string;
  streaming?: boolean;
  createdAt: string;
}

const AGENT_TYPES = [
  { value: "personal", label: "Wave (Personal)" },
  { value: "content", label: "Content Agent" },
  { value: "analytics", label: "Analytics Agent" },
  { value: "growth", label: "Growth Agent" },
  { value: "community", label: "Community Agent" },
  { value: "revenue", label: "Revenue Agent" },
  { value: "moderation", label: "Moderation Agent" },
  { value: "clip", label: "Clip Agent" },
];

function relTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [agentType, setAgentType] = useState("personal");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    // Mark any in-progress streaming message as done
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !session?.accessToken || !session.user?.orgId) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      agentType,
      streaming: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BASE_URL}/v1/agents/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
          "x-org-id": session.user.orgId,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message: text, sessionId, agentType }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          try {
            const payload = JSON.parse(raw) as {
              chunk?: string;
              done?: boolean;
              error?: string;
              sessionId?: string;
            };

            if (payload.error) {
              toast.error(payload.error);
              break;
            }

            if (payload.chunk) {
              fullContent += payload.chunk;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullContent } : m)),
              );
            }

            if (payload.done) {
              if (payload.sessionId) setSessionId(payload.sessionId);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, streaming: false } : m)),
              );
            }
          } catch {
            // malformed JSON chunk — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Chat error. Please try again.");
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: m.content || "Something went wrong.", streaming: false }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, session, sessionId, agentType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", brand.bg)}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Wave — Chat</h1>
            <p className="text-xs text-muted-foreground">
              {messages.length === 0 ? "Start a conversation" : `${messages.length} messages`}
            </p>
          </div>
        </div>
        <Select value={agentType} onValueChange={setAgentType}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGENT_TYPES.map((a) => (
              <SelectItem key={a.value} value={a.value} className="text-xs">
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-2xl px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <div
                className={cn("flex h-12 w-12 items-center justify-center rounded-full", brand.bg)}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-medium">How can I help you today?</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Ask about your analytics, get content ideas, or let me help you grow your channel.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={cn("flex items-end gap-2.5", isUser && "flex-row-reverse")}
              >
                {/* Avatar */}
                {isUser ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-[10px] font-bold text-primary-foreground">CR</span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      brand.bg,
                    )}
                  >
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}

                {/* Bubble */}
                <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
                  <div
                    className={cn("flex items-center gap-1.5 px-1", isUser && "flex-row-reverse")}
                  >
                    <span className="text-[11px] font-medium">{isUser ? "You" : "Wave"}</span>
                    {!isUser && msg.agentType && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 h-4 border-violet-500/30 text-violet-400 capitalize"
                      >
                        {msg.agentType}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {relTime(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      isUser
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {msg.content ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <span className="flex gap-1 items-center text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs">Thinking…</span>
                      </span>
                    )}
                    {msg.streaming && msg.content && (
                      <span className="inline-block w-0.5 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t px-6 py-4 bg-background shrink-0">
        <div className="mx-auto max-w-2xl flex items-end gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Wave anything… (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={isStreaming}
            rows={1}
          />
          {isStreaming ? (
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={handleStop}
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className={cn("shrink-0 border-0", brand.bg)}
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Wave can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
