"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Removes the `dark` class from <html> while any marketing route is mounted.
 * Restores it on unmount or when navigating away.
 */
export function ForceLight() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");

    return () => {
      if (wasDark) html.classList.add("dark");
    };
  }, [pathname]);

  return null;
}
