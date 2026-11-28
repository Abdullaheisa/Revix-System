"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname as useNextPathname } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

const CURRENT_ROUTE_KEY = "revix_nav_current";
const PREVIOUS_ROUTE_KEY = "revix_nav_previous";

function stripLocalePrefix(rawPath: string): string {
  const stripped = rawPath.replace(/^\/(?:ar|en)(?=\/|$)/, "");
  return stripped || "/";
}

/**
 * Tracks internal route transitions in sessionStorage so in-app Back/Cancel
 * buttons can return users to the exact page they navigated from.
 */
export function useTrackNavigationHistory(): void {
  const rawPathname = useNextPathname();
  const pathname = rawPathname ? stripLocalePrefix(rawPathname) : "";

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;
    const fullPath = `${pathname}${window.location.search}`;
    try {
      const current = sessionStorage.getItem(CURRENT_ROUTE_KEY);
      if (current && current !== fullPath) {
        const currentBase = current.split("?")[0];
        if (currentBase !== pathname) {
          sessionStorage.setItem(PREVIOUS_ROUTE_KEY, current);
        }
      }
      sessionStorage.setItem(CURRENT_ROUTE_KEY, fullPath);
    } catch {
      // Ignore storage errors in restricted browsing contexts
    }
  }, [pathname]);
}

/**
 * Returns the previous internal route (if different from the current pathname)
 * or falls back to `fallbackHref`, along with a `goBack` handler.
 */
export function useSmartBack(fallbackHref: string): {
  backHref: string;
  goBack: () => void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const [backHref, setBackHref] = useState(fallbackHref);

  useEffect(() => {
    if (typeof window === "undefined") {
      setBackHref(fallbackHref);
      return;
    }
    try {
      const prev = sessionStorage.getItem(PREVIOUS_ROUTE_KEY);
      if (prev && prev.split("?")[0] !== pathname) {
        setBackHref(prev);
        return;
      }
    } catch {
      // Ignore storage errors
    }
    setBackHref(fallbackHref);
  }, [pathname, fallbackHref]);

  const goBack = useCallback(() => {
    router.push(backHref);
  }, [router, backHref]);

  return { backHref, goBack };
}
