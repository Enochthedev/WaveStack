/**
 * Unified <PlatformIcon> component.
 *
 * Usage:
 *   <PlatformIcon platform="youtube" />
 *   <PlatformIcon platform="twitch" size={20} branded />
 *   <PlatformIcon platform="discord" withLabel />
 */

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { platformIconMap, platformIconColor, platformIconColorDark } from "./platform-icons";
import { platformLabel } from "@/lib/colors";

interface PlatformIconProps {
  /** Platform slug (e.g. "youtube", "twitch", "twitter") */
  platform: string;
  /** Icon size in px (default 16) */
  size?: number;
  /** Apply official brand color to the icon */
  branded?: boolean;
  /** Show platform label text next to the icon */
  withLabel?: boolean;
  /** Additional className */
  className?: string;
}

export function PlatformIcon({
  platform,
  size = 16,
  branded = true,
  withLabel = false,
  className,
}: PlatformIconProps) {
  const slug = platform.toLowerCase();
  const Icon = platformIconMap[slug];

  // Brand color with dark-mode awareness
  const lightColor = platformIconColor[slug];
  const darkColor = platformIconColorDark[slug];
  const colorStyle = branded && lightColor
    ? { color: lightColor, ["--pi-dark" as string]: darkColor ?? lightColor }
    : undefined;

  const label = platformLabel[slug] ?? platform;

  if (!Icon) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <Globe className="shrink-0" style={{ width: size, height: size }} />
        {withLabel && <span className="text-sm">{label}</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon
        className={cn("shrink-0", branded && "platform-icon-branded")}
        style={{ width: size, height: size, ...colorStyle }}
      />
      {withLabel && <span className="text-sm">{label}</span>}
    </span>
  );
}
