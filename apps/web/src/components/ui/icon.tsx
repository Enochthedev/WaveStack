/**
 * <Icon> — Unified icon component for WaveStack.
 *
 * Wraps any icon source (Lucide, react-icons, custom SVG components) and
 * enforces consistent sizing, color variants, and interactive states
 * through design tokens defined in globals.css.
 *
 * ─── Quick usage ──────────────────────────────────────────────────────
 *
 *   import { Icon } from "@/components/ui/icon"
 *   import { Bell, Settings } from "lucide-react"
 *   import { SiYoutube } from "react-icons/si"
 *
 *   <Icon icon={Bell} />                          // default (md, foreground)
 *   <Icon icon={Settings} size="lg" color="muted" />
 *   <Icon icon={SiYoutube} color="primary" />
 *   <Icon icon={Bell} size="sm" color="success" disabled />
 *   <Icon icon={Bell} interactive />              // hover/active states
 *
 * ─── Design token reference (globals.css) ─────────────────────────────
 *
 *   --icon-size-xs   14px     badge-level
 *   --icon-size-sm   16px     tight UI (sidebar, tables)
 *   --icon-size-md   20px     default (buttons, labels)
 *   --icon-size-lg   24px     section headers
 *   --icon-size-xl   32px     hero / splash
 *   --icon-size-2xl  40px     avatars, onboarding
 *
 * ─────────────────────────────────────────────────────────────────────── */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────
   SIZE MAP
   Maps our named sizes to CSS custom-property values and default Lucide
   stroke widths. Using CSS vars keeps everything synced with globals.css.
   ──────────────────────────────────────────────────────────────────────── */

const sizeMap = {
  xs:  { className: "size-3.5",  /* 14px */ strokeWidth: 2   },
  sm:  { className: "size-4",    /* 16px */ strokeWidth: 2   },
  md:  { className: "size-5",    /* 20px */ strokeWidth: 1.75 },
  lg:  { className: "size-6",    /* 24px */ strokeWidth: 1.75 },
  xl:  { className: "size-8",    /* 32px */ strokeWidth: 1.5  },
  "2xl": { className: "size-10",  /* 40px */ strokeWidth: 1.5  },
} as const

export type IconSize = keyof typeof sizeMap

/* ────────────────────────────────────────────────────────────────────────
   ICON VARIANTS (cva)
   `color` maps to semantic Tailwind utilities backed by our CSS vars.
   `interactive` adds hover/active/disabled state transitions.
   ──────────────────────────────────────────────────────────────────────── */

const iconVariants = cva(
  /* Base — allow smooth color/opacity transitions */
  "inline-flex shrink-0 transition-colors duration-150",
  {
    variants: {
      /* Semantic color variants */
      color: {
        /** Inherits current text color — the safest default */
        default:     "text-current",
        /** Muted / secondary icon tint */
        muted:       "text-muted-foreground",
        /** Brand primary (orange) */
        primary:     "text-primary",
        /** Destructive / error (red) */
        destructive: "text-destructive",
        /** Success (green) */
        success:     "text-success",
        /** Warning (amber) */
        warning:     "text-warning",
        /** Informational (blue) */
        info:        "text-info",
        /** Foreground — full contrast */
        foreground:  "text-foreground",
      },
    },
    defaultVariants: {
      color: "default",
    },
  }
)

/* ────────────────────────────────────────────────────────────────────────
   PROPS
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Accepts any React component that renders an SVG.
 * Works with:
 *  - lucide-react icons      `import { Bell } from "lucide-react"`
 *  - react-icons              `import { SiYoutube } from "react-icons/si"`
 *  - custom SVG components    `const MyIcon = (props) => <svg ...>`
 */
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number | string
}>

export interface IconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof iconVariants> {
  /** The icon component to render (e.g. Lucide's Bell, react-icons' SiYoutube) */
  icon: IconComponent
  /** Named size token. Default: "md" */
  size?: IconSize
  /** Override strokeWidth (only affects Lucide-style icons) */
  strokeWidth?: number
  /** Visually disable the icon (reduced opacity, no pointer events) */
  disabled?: boolean
  /** Enable hover/active states — useful for icon-only buttons */
  interactive?: boolean
  /** Extra className applied to the inner SVG element (not the wrapper) */
  iconClassName?: string
  /** aria-label for accessibility — strongly recommended for icon-only controls */
  "aria-label"?: string
}

/* ────────────────────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────────────────────── */

export function Icon({
  icon: IconComp,
  size = "md",
  color,
  strokeWidth,
  disabled = false,
  interactive = false,
  className,
  iconClassName,
  ...wrapperProps
}: IconProps) {
  const { className: sizeClass, strokeWidth: defaultStroke } = sizeMap[size]

  return (
    <span
      data-slot="icon"
      data-size={size}
      className={cn(
        iconVariants({ color }),
        /* Disabled state — uses design token opacity */
        disabled && "pointer-events-none opacity-[var(--state-disabled-opacity,0.38)]",
        /* Interactive state — cursor + hover/active feedback */
        interactive && !disabled && [
          "cursor-pointer",
          "hover:opacity-[var(--state-hover-opacity,0.85)]",
          "active:opacity-[var(--state-active-opacity,0.7)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        ],
        className,
      )}
      aria-hidden={wrapperProps["aria-label"] ? undefined : true}
      role={wrapperProps["aria-label"] ? "img" : undefined}
      {...wrapperProps}
    >
      <IconComp
        className={cn(sizeClass, iconClassName)}
        strokeWidth={strokeWidth ?? defaultStroke}
        aria-hidden="true"
      />
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   RE-EXPORTS — convenience for consumers
   ──────────────────────────────────────────────────────────────────────── */

export { iconVariants, sizeMap }
