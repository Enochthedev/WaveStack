/**
 * Centralized platform icon registry.
 *
 * Uses react-icons/si (Simple Icons) for accurate, up-to-date brand logos.
 * Import `platformIconMap` or individual icons from this file.
 */

import type { IconType } from "react-icons";
import {
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
} from "react-icons/si";

/** Map from platform slug → react-icons component */
export const platformIconMap: Record<string, IconType> = {
  youtube:        SiYoutube,
  youtube_shorts: SiYoutubeshorts,
  tiktok:         SiTiktok,
  instagram:      SiInstagram,
  twitter:        SiX,       // X (formerly Twitter)
  x:              SiX,
  twitch:         SiTwitch,
  discord:        SiDiscord,
  linkedin:       SiLinkedin,
  telegram:       SiTelegram,
  whatsapp:       SiWhatsapp,
  facebook:       SiFacebook,
  threads:        SiThreads,
  kick:           SiKick,
  patreon:        SiPatreon,
  spotify:        SiSpotify,
};

/** Official hex brand colors for each platform icon */
export const platformIconColor: Record<string, string> = {
  youtube:        "#FF0000",
  youtube_shorts: "#FF0000",
  tiktok:         "#000000",
  instagram:      "#E4405F",
  twitter:        "#000000",
  x:              "#000000",
  twitch:         "#9146FF",
  discord:        "#5865F2",
  linkedin:       "#0A66C2",
  telegram:       "#26A5E4",
  whatsapp:       "#25D366",
  facebook:       "#0866FF",
  threads:        "#000000",
  kick:           "#53FC18",
  patreon:        "#FF424D",
  spotify:        "#1DB954",
};

/**
 * Dark-mode overrides: platforms whose brand color is black need to invert
 * so they remain visible on dark backgrounds.
 */
export const platformIconColorDark: Record<string, string> = {
  tiktok:  "#EE1D52", // TikTok's pink accent
  twitter: "#FFFFFF",
  x:       "#FFFFFF",
  threads: "#FFFFFF",
};

export {
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
};
