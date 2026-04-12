"use client";

import { Skeleton, configureBoneyard } from "boneyard-js/react";
import type { SkeletonProps } from "boneyard-js/react";

// Theme-aware defaults: Mint Mist / Carbon Gray palette
configureBoneyard({
  color: "oklch(0.90 0.008 148)", // light mode bone — mint-tinted gray
  darkColor: "oklch(1 0 0 / 8%)", // dark mode bone — subtle white
  animate: "shimmer",
});

export { Skeleton };
export type { SkeletonProps };
