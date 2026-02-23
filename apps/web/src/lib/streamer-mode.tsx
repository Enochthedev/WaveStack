"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

// ── Context ───────────────────────────────────────────────────────────────────

interface StreamerModeCtx {
  enabled:  boolean;
  toggle:   () => void;
  enable:   () => void;
  disable:  () => void;
}

const StreamerModeContext = createContext<StreamerModeCtx>({
  enabled: false,
  toggle:  () => {},
  enable:  () => {},
  disable: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function StreamerModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ws_streamer_mode");
    if (saved === "true") setEnabled(true);
  }, []);

  const toggle  = useCallback(() => setEnabled((v) => { localStorage.setItem("ws_streamer_mode", String(!v)); return !v; }), []);
  const enable  = useCallback(() => { setEnabled(true);  localStorage.setItem("ws_streamer_mode", "true");  }, []);
  const disable = useCallback(() => { setEnabled(false); localStorage.setItem("ws_streamer_mode", "false"); }, []);

  // Cmd+Shift+S global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "s") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <StreamerModeContext.Provider value={{ enabled, toggle, enable, disable }}>
      {children}
      {/* Indicator pill — always visible when streamer mode is on */}
      {enabled && (
        <button
          onClick={disable}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-500 shadow-lg backdrop-blur-sm transition-opacity hover:bg-red-500/20"
          title="Streamer mode on — click to disable"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          Streamer mode on · ⌘⇧S to toggle
        </button>
      )}
    </StreamerModeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStreamerMode() {
  return useContext(StreamerModeContext);
}

// ── Sensitive component ────────────────────────────────────────────────────────
// Wrap any value that should be hidden during a stream.
//
//   <Sensitive>creator@wavestack.io</Sensitive>
//   <Sensitive>$29.00</Sensitive>
//   <Sensitive>ws_live_••••••</Sensitive>

interface SensitiveProps {
  children:    React.ReactNode;
  /** Custom placeholder when blurred; defaults to children blurred visually */
  placeholder?: string;
  className?:  string;
}

export function Sensitive({ children, placeholder, className }: SensitiveProps) {
  const { enabled } = useStreamerMode();

  if (!enabled) return <>{children}</>;

  if (placeholder) {
    return (
      <span className={`select-none text-muted-foreground/40 ${className ?? ""}`}>
        {placeholder}
      </span>
    );
  }

  return (
    <span
      className={`select-none blur-sm transition-all ${className ?? ""}`}
      aria-hidden
    >
      {children}
    </span>
  );
}
