/**
 * Centralized color maps for WaveStack.
 *
 * Change a value here → every page that references it updates automatically.
 * These are Tailwind utility class strings; they live here so no page
 * hard-codes brand/platform/status colors inline.
 */

// ── Platform badge pills (bg + text + border) ──────────────────────────────
export const platformBadge: Record<string, string> = {
  youtube:        "bg-red-500/10 text-red-500 border-red-500/20",
  youtube_shorts: "bg-red-500/10 text-red-400 border-red-500/20",
  tiktok:         "bg-slate-500/10 text-slate-400 border-slate-500/20",
  instagram:      "bg-pink-500/10 text-pink-500 border-pink-500/20",
  twitter:        "bg-sky-500/10 text-sky-500 border-sky-500/20",
  twitch:         "bg-purple-600/10 text-purple-400 border-purple-600/20",
  discord:        "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  linkedin:       "bg-blue-600/10 text-blue-500 border-blue-600/20",
};

// ── Platform solid dot colors ───────────────────────────────────────────────
export const platformDot: Record<string, string> = {
  youtube:        "bg-red-500",
  youtube_shorts: "bg-red-400",
  tiktok:         "bg-slate-400",
  instagram:      "bg-pink-500",
  twitter:        "bg-sky-500",
  twitch:         "bg-purple-500",
  discord:        "bg-indigo-500",
  linkedin:       "bg-blue-600",
};

// ── Platform labels (display names) ────────────────────────────────────────
export const platformLabel: Record<string, string> = {
  youtube:        "YouTube",
  youtube_shorts: "YT Shorts",
  tiktok:         "TikTok",
  instagram:      "Instagram",
  twitter:        "X / Twitter",
  twitch:         "Twitch",
  discord:        "Discord",
  linkedin:       "LinkedIn",
};

// ── Status badge colors ─────────────────────────────────────────────────────
// Semantic: green = success, amber = in-progress, sky = waiting, red = error
export const statusBadge: Record<string, string> = {
  // Success states
  published:  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  ready:      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  completed:  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  online:     "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  active:     "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  approved:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  connected:  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  indexed:    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  // In-progress states
  processing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  running:    "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pending:    "bg-amber-500/10 text-amber-500 border-amber-500/20",
  paused:     "bg-amber-500/10 text-amber-500 border-amber-500/20",
  // Waiting states
  queued:     "bg-sky-500/10 text-sky-500 border-sky-500/20",
  scheduled:  "bg-sky-500/10 text-sky-500 border-sky-500/20",
  // Error states
  failed:     "bg-red-500/10 text-red-500 border-red-500/20",
  error:      "bg-red-500/10 text-red-500 border-red-500/20",
  offline:    "bg-red-500/10 text-red-500 border-red-500/20",
  rejected:   "bg-red-500/10 text-red-500 border-red-500/20",
  // Agent autonomy levels
  copilot:    "bg-sky-500/10 text-sky-500 border-sky-500/20",
  autopilot:  "bg-primary/10 text-primary border-primary/20",
  manual:     "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

// ── Status dot colors ───────────────────────────────────────────────────────
export const statusDot: Record<string, string> = {
  online:     "bg-emerald-500",
  active:     "bg-emerald-500",
  connected:  "bg-emerald-500",
  running:    "bg-amber-500",
  processing: "bg-amber-500",
  pending:    "bg-amber-500",
  offline:    "bg-slate-400",
  failed:     "bg-red-500",
  error:      "bg-red-500",
};

// ── Brand / Wave accent (CSS variable references) ───────────────────────────
// Use these in components that should follow the brand color automatically.
// The actual color is set in globals.css via --primary.
export const brand = {
  bg:          "bg-primary",
  bgMuted:     "bg-primary/10",
  bgSubtle:    "bg-primary/5",
  text:        "text-primary",
  textOn:      "text-primary-foreground",
  border:      "border-primary/20",
  borderStrong: "border-primary/40",
  ring:        "ring-primary/40",
  shadow:      "shadow-primary/25",
} as const;
