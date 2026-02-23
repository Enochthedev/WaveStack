"use client";

import { useState } from "react";
import { toast } from "sonner";
import { chatMessages as initialMessages } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/colors";

type Message = (typeof initialMessages)[number];

function relTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ChatHistoryPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [clearOpen, setClearOpen] = useState(false);

  function handleExport() {
    const text = messages
      .map((m) => `[${relTime(m.createdAt)}] ${m.role === "user" ? "You" : "Wave"}: ${m.content}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wave-chat-history.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat history exported");
  }

  function handleClear() {
    setMessages([]);
    setClearOpen(false);
    toast.success("Chat history cleared");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", brand.bg)}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Wave — Conversation History</h1>
            <p className="text-xs text-muted-foreground">{messages.length} messages · Today</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={messages.length === 0}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setClearOpen(true)}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-2xl px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No messages in this conversation.
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={cn("flex items-end gap-2.5", isUser && "flex-row-reverse")}>
                  {/* Avatar */}
                  {isUser ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                      <span className="text-[10px] font-bold text-primary-foreground">CR</span>
                    </div>
                  ) : (
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", brand.bg)}>
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
                    {/* Meta row */}
                    <div className={cn("flex items-center gap-1.5 px-1", isUser && "flex-row-reverse")}>
                      <span className="text-[11px] font-medium">{isUser ? "You" : "Wave"}</span>
                      {!isUser && msg.agentType && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 border-violet-500/30 text-violet-400 capitalize"
                        >
                          {msg.agentType}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">{relTime(msg.createdAt)}</span>
                    </div>

                    {/* Content bubble */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/30 shrink-0">
        <p className="text-sm text-muted-foreground">Continue this conversation in Wave</p>
        <Button size="sm" className={cn("border-0", brand.bg)}>
          <Sparkles className="h-3.5 w-3.5 mr-2" />
          Open Wave
        </Button>
      </div>

      {/* Clear Confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              All {messages.length} messages will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
