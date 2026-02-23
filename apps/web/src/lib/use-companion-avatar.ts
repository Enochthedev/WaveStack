"use client";

import { useState, useCallback, useMemo } from "react";

// ── DiceBear style catalogue ─────────────────────────────────────────────────
export const DICEBEAR_STYLES = [
  { value: "bottts",      label: "Bottts"      },
  { value: "fun-emoji",   label: "Fun Emoji"   },
  { value: "thumbs",      label: "Thumbs"      },
  { value: "pixel-art",   label: "Pixel Art"   },
  { value: "avataaars",   label: "Avataaars"   },
  { value: "lorelei",     label: "Lorelei"     },
  { value: "micah",       label: "Micah"       },
  { value: "shapes",      label: "Shapes"      },
] as const;

export type DiceBearStyle = (typeof DICEBEAR_STYLES)[number]["value"];

// ── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "wavestack:companion-avatar";

interface AvatarConfig {
  style: DiceBearStyle;
  seed: string;
}

const DEFAULT_CONFIG: AvatarConfig = { style: "bottts", seed: "wave" };

function readConfig(): AvatarConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AvatarConfig>;
    return {
      style: parsed.style ?? DEFAULT_CONFIG.style,
      seed: parsed.seed ?? DEFAULT_CONFIG.seed,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function writeConfig(config: AvatarConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useCompanionAvatar() {
  const [config, setConfig] = useState<AvatarConfig>(readConfig);

  const avatarUrl = useMemo(
    () => `https://api.dicebear.com/9.x/${config.style}/svg?seed=${encodeURIComponent(config.seed)}`,
    [config.style, config.seed],
  );

  const setStyle = useCallback((style: DiceBearStyle) => {
    setConfig((prev) => {
      const next = { ...prev, style };
      writeConfig(next);
      return next;
    });
  }, []);

  const setSeed = useCallback((seed: string) => {
    setConfig((prev) => {
      const next = { ...prev, seed };
      writeConfig(next);
      return next;
    });
  }, []);

  const randomize = useCallback(() => {
    const seed = Math.random().toString(36).slice(2, 10);
    setConfig((prev) => {
      const next = { ...prev, seed };
      writeConfig(next);
      return next;
    });
  }, []);

  return { avatarUrl, style: config.style, seed: config.seed, setStyle, setSeed, randomize } as const;
}

// ── Static URL builder (for components that don't need state) ────────────────
export function companionAvatarUrl(style: DiceBearStyle = "bottts", seed = "wave") {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}
