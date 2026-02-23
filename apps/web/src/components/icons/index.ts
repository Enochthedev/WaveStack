/**
 * Icon Library — barrel export
 *
 * Import everything icon-related from this single entry point:
 *
 *   import { Icon, PlatformIcon, platformIconMap } from "@/components/icons"
 *
 * ─── What's exported ──────────────────────────────────────────────────
 *
 *   Icon             – generic wrapper (Lucide / react-icons / custom SVG)
 *   PlatformIcon     – brand-colored social-platform icon with optional label
 *   platformIconMap  – slug → react-icons component lookup
 *   platformIconColor / platformIconColorDark – brand hex maps
 *   Individual react-icons re-exports (SiYoutube, SiTiktok, …)
 *
 * ─────────────────────────────────────────────────────────────────────── */

/* ── Generic Icon component ──────────────────────────────────────────── */
export { Icon, iconVariants, sizeMap } from "@/components/ui/icon"
export type { IconProps, IconSize, IconComponent } from "@/components/ui/icon"

/* ── Platform-specific icons ─────────────────────────────────────────── */
export { PlatformIcon } from "./platform-icon"
export {
  platformIconMap,
  platformIconColor,
  platformIconColorDark,
  /* Individual icon re-exports for direct use */
  SiYoutube,
  SiYoutubeshorts,
  SiTiktok,
  SiInstagram,
  SiX,
  SiTwitch,
  SiDiscord,
  SiLinkedin,
  SiTelegram,
  SiWhatsapp,
  SiFacebook,
  SiThreads,
  SiKick,
  SiPatreon,
  SiSpotify,
} from "./platform-icons"
